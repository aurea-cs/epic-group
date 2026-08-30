import React, { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { PDFDocument } from 'pdf-lib'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerModalProps {
  url: string
  onClose: () => void
  onSave?: (file: Blob) => Promise<void>
}

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`
};

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ url, onClose, onSave }) => {
  const [numPages, setNumPages] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth)

  // Block common save/print shortcuts (best-effort, not a hard guarantee)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey
      if (isCmdOrCtrl && ['p', 'P', 's', 'S'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const blockMenu = (e: MouseEvent) => e.preventDefault()
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('contextmenu', blockMenu, true)

    const handleResize = () => setPageWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('contextmenu', blockMenu, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setError(null)
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error)
    setError('No se pudo cargar el documento.')
  }

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const response = await fetch(url);
      const originalPdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const form = pdfDoc.getForm();
      
      const inputs = document.querySelectorAll('.react-pdf__Page__annotations input, .react-pdf__Page__annotations textarea, .react-pdf__Page__annotations select');
      
      inputs.forEach((element) => {
        const name = element.getAttribute('name');
        if (!name) return;
        
        try {
          const field = form.getField(name);
          if (!field) return;

          if (element instanceof HTMLInputElement) {
            if (element.type === 'checkbox' || element.type === 'radio') {
              if (element.checked) {
                 try { form.getCheckBox(name).check(); } catch (e) {}
                 try { form.getRadioGroup(name).select(element.value); } catch (e) {}
              }
            } else {
              try { form.getTextField(name).setText(element.value); } catch (e) {}
            }
          } else if (element instanceof HTMLTextAreaElement) {
            try { form.getTextField(name).setText(element.value); } catch (e) {}
          }
        } catch (err) {
          console.warn(`Could not set field ${name}`, err);
        }
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      await onSave(blob);
      onClose();
    } catch (err) {
      console.error('Error saving PDF', err);
      alert('Hubo un error al guardar el documento.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#000', display: 'flex', flexDirection: 'column', zIndex: 9999,
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '20px', right: '20px',
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: '34px', height: '34px', color: 'white', fontSize: '1.1rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
        onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
      >
        ✕
      </button>

      {onSave && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            position: 'fixed', top: '20px', right: '70px',
            background: isSaving ? '#6b7280' : '#8b5cf6', 
            border: 'none', borderRadius: '8px',
            padding: '8px 16px', color: 'white', fontSize: '1rem', fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer', 
            zIndex: 10,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {isSaving ? 'Guardando...' : 'Guardar y Enviar'}
        </button>
      )}

      <div
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          backgroundColor: '#000',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {error ? (
          <p style={{ color: '#fca5a5', textAlign: 'center', paddingTop: '40vh', fontSize: '1rem' }}>
            {error}
          </p>
        ) : (
          <Document
            file={url}
            options={options}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <p style={{ color: 'white', textAlign: 'center', paddingTop: '40vh', fontSize: '1rem' }}>
                Cargando documento...
              </p>
            }
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} style={{ marginBottom: '10px' }}>
                <Page
                  pageNumber={index + 1}
                  width={pageWidth}
                  renderAnnotationLayer={true}
                  renderForms={true}
                  renderTextLayer={true}
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}

export default PdfViewerModal