import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { supabase } from '../lib/supabase'; 
 
const execFileAsync = promisify(execFile);
 
const BUCKET = 'grade-content';
 
// 150 DPI gives a crisp ~1200-1600px wide image for a standard page at a
// reasonable file size. Bump this if annotators need to zoom in tightly.
const RENDER_DPI = 150;
 
interface ProcessResult {
  totalPages: number;
}
 
/**
 * Converts a PDF (already stored at `storagePath`) into individual page
 * images and writes rows to `book_pages`.
 *
 * Each PDF page is rasterized once, then split exactly down the middle into
 * a left half and a right half, which become two consecutive logical pages.
 *
 * Requires poppler-utils (`pdftoppm`) to be installed on the host/container:
 *   apt-get install -y poppler-utils
 */
export async function processPdfIntoPages(
  moduleItemId: string,
  storagePath: string
): Promise<ProcessResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `pdf-${moduleItemId}-`));
 
  try {
    await setStatus(moduleItemId, 'processing');
 
    // 1. Download the source PDF locally — pdftoppm needs a filesystem path.
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);
 
    if (downloadError || !fileData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`);
    }
 
    const pdfBuffer = Buffer.from(await fileData.arrayBuffer());
    const localPdfPath = path.join(tmpDir, 'source.pdf');
    await fs.writeFile(localPdfPath, pdfBuffer);
 
    // 2. Rasterize every page to a PNG: page-1.png, page-2.png, ...
    const outPrefix = path.join(tmpDir, 'page');
    await execFileAsync('pdftoppm', ['-r', String(RENDER_DPI), '-png', localPdfPath, outPrefix]);
 
    const files = (await fs.readdir(tmpDir))
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/page-(\d+)\.png/)?.[1] || '0', 10);
        const numB = parseInt(b.match(/page-(\d+)\.png/)?.[1] || '0', 10);
        return numA - numB;
      });
 
    if (files.length === 0) {
      throw new Error('pdftoppm produced no output pages');
    }
 
    // Wipe any pages left over from a previous failed/partial run for this item.
    await supabase.from('book_pages').delete().eq('module_item_id', moduleItemId);
 
    let logicalPageNumber = 1;
 
    for (let i = 0; i < files.length; i++) {
      const sourcePdfPage = i + 1;
      const fullImagePath = path.join(tmpDir, files[i]);
      const metadata = await sharp(fullImagePath).metadata();
 
      if (!metadata.width || !metadata.height) {
        throw new Error(`Could not read dimensions for ${files[i]}`);
      }
 
      const midpoint = Math.floor(metadata.width / 2);
 
      const halves: Array<{ side: 'left' | 'right'; left: number; width: number }> = [
        { side: 'left', left: 0, width: midpoint },
        { side: 'right', left: midpoint, width: metadata.width - midpoint }
      ];
 
      for (const half of halves) {
        const halfBuffer = await sharp(fullImagePath)
          .extract({ left: half.left, top: 0, width: half.width, height: metadata.height })
          .webp({ quality: 82 })
          .toBuffer();
 
        const destPath = `modules/pages/${moduleItemId}/${String(logicalPageNumber).padStart(3, '0')}.webp`;
 
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(destPath, halfBuffer, { contentType: 'image/webp', upsert: true });
 
        if (uploadError) {
          throw new Error(`Failed to upload page ${logicalPageNumber}: ${uploadError.message}`);
        }
 
        const { error: insertError } = await supabase.from('book_pages').insert({
          module_item_id: moduleItemId,
          page_number: logicalPageNumber,
          source_pdf_page: sourcePdfPage,
          side: half.side,
          image_path: destPath,
          width: half.width,
          height: metadata.height
        });
 
        if (insertError) {
          throw new Error(`Failed to insert book_page row: ${insertError.message}`);
        }
 
        logicalPageNumber++;
      }
    }
 
    const totalPages = logicalPageNumber - 1;
 
    await supabase
      .from('module_items')
      .update({ processing_status: 'ready', processing_error: null, total_pages: totalPages })
      .eq('id', moduleItemId);
 
    return { totalPages };
  } catch (error: any) {
    console.error(`PDF processing failed for module_item ${moduleItemId}:`, error);
    await setStatus(moduleItemId, 'failed', error.message);
    throw error;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
 
async function setStatus(moduleItemId: string, status: string, error?: string) {
  await supabase
    .from('module_items')
    .update({ processing_status: status, processing_error: error || null })
    .eq('id', moduleItemId);
}