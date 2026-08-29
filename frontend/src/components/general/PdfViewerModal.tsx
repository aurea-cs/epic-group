import React, { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { PDFDocument } from 'pdf-lib'
import { DrawingModal } from './DrawingModal'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerModalProps {
  url: string
  onClose: () => void
  onSave?: (file: Blob) => Promise<void>
  /** Optional: used to restrict interaction to specific pages */
  assignedPages?: string | null
  /** Pages from other assignments the student already submitted for this item.
   *  Each entry has the page-range spec and a signed URL to the flattened submitted PDF
   *  so the student can see their previous answers on those pages. */
  submittedRanges?: Array<{ pages: string; signed_url: string | null }>
  /** Optional: passed through for future server-side checks */
  itemId?: string | null
  studentId?: string | null
  /** Optional: false for normal/static PDFs to bypass interactive parsing/saving overlays */
  isEditable?: boolean
}

/**
 * Returns true if the given 1-based page number falls within the assignedPages spec.
 * Supports formats: "10-15", "3,7,9", or a single page "5".
 * If assignedPages is empty/null, all pages are considered editable.
 */
const isPageAssigned = (pageNum: number, assignedPages: string | null | undefined): boolean => {
  if (!assignedPages) return true
  const cleaned = assignedPages.trim()
  if (!cleaned) return true
  // Range: "10-15"
  if (/^\d+-\d+$/.test(cleaned)) {
    const [start, end] = cleaned.split('-').map(Number)
    return pageNum >= start && pageNum <= end
  }
  // Comma-separated: "3,7,9"
  if (cleaned.includes(',')) {
    const pages = cleaned.split(',').map((p) => Number(p.trim()))
    return pages.includes(pageNum)
  }
  // Single page: "5"
  if (/^\d+$/.test(cleaned)) {
    return pageNum === Number(cleaned)
  }
  return true
}

/**
 * Maps the global page number to its relative 1-based index within the submitted PDF
 * based on the assigned pages range (e.g. page 12 in range 10-15 is index 3 / pageNumber 3).
 */
const getPageOffsetInSubmittedRange = (pageNum: number, rangeStr: string): number => {
  const cleaned = rangeStr.trim()
  if (/^\d+-\d+$/.test(cleaned)) {
    const [start] = cleaned.split('-').map(Number)
    return pageNum - start + 1
  }
  if (cleaned.includes(',')) {
    const pages = cleaned.split(',').map((p) => Number(p.trim()))
    const idx = pages.indexOf(pageNum)
    return idx !== -1 ? idx + 1 : 1
  }
  if (/^\d+$/.test(cleaned)) {
    return 1
  }
  return pageNum
}

/**
 * Returns 0-based page indices corresponding to the assignedPages range.
 */
const getAssignedPageIndices = (assignedPages: string | null | undefined, maxPages: number): number[] => {
  if (!assignedPages) {
    return Array.from({ length: maxPages }, (_, i) => i)
  }
  const cleaned = assignedPages.trim()
  if (/^\d+-\d+$/.test(cleaned)) {
    const [start, end] = cleaned.split('-').map(Number)
    const indices: number[] = []
    for (let p = start; p <= end; p++) {
      if (p >= 1 && p <= maxPages) {
        indices.push(p - 1)
      }
    }
    return indices
  }
  if (cleaned.includes(',')) {
    return cleaned.split(',')
      .map(p => Number(p.trim()) - 1)
      .filter(idx => idx >= 0 && idx < maxPages)
  }
  if (/^\d+$/.test(cleaned)) {
    const p = Number(cleaned)
    if (p >= 1 && p <= maxPages) {
      return [p - 1]
    }
  }
  return Array.from({ length: maxPages }, (_, i) => i)
}

interface DetectedDrawingBox {
  name: string
  pageIndex: number
  leftPercent: number
  topPercent: number
  widthPercent: number
  heightPercent: number
}

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ url, onClose, onSave, assignedPages, submittedRanges, itemId: _itemId, studentId: _studentId, isEditable = true }) => {
  const [numPages, setNumPages] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth)

  // Map of fieldName -> PNG dataUrl
  const [drawings, setDrawings] = useState<Record<string, string>>({})
  const [activeDrawField, setActiveDrawField] = useState<string | null>(null)
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedDrawingBox[]>([])

  // Block common save/print shortcuts (best-effort)
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

  // Extract all drawing field coordinates directly from the PDF binary structure using pdf-lib
  useEffect(() => {
    if (!isEditable) return

    const extractDrawingBoxes = async () => {
      if (!url) return
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const form = pdfDoc.getForm()
        const pages = pdfDoc.getPages()
        const fields = form.getFields()

        const boxes: DetectedDrawingBox[] = []

        for (const field of fields) {
          const name = field.getName()

          // Match any field named draw_box_*, draw_*, sig_*
          if (/draw_|draw_box_|sig_/i.test(name)) {
            const widgets = field.acroField.getWidgets()
            if (widgets.length === 0) continue

            const widget = widgets[0]
            const rect = widget.getRectangle() // { x, y, width, height } in PDF points

            // Determine page index
            let pageIndex = 0
            const widgetP = widget.P()
            if (widgetP) {
              const idx = pages.findIndex((p) => p.ref === widgetP)
              if (idx !== -1) pageIndex = idx
            } else {
              for (let i = 0; i < pages.length; i++) {
                const annots = pages[i].node.Annots()
                const annotCount = annots ? annots.size() : 0
                let found = false
                for (let j = 0; j < annotCount; j++) {
                  const entry = annots?.get(j)
                  if (entry && entry.toString() === widget.dict.toString()) {
                    found = true
                    break
                  }
                }
                if (found) {
                  pageIndex = i
                  break
                }
              }
            }

            const page = pages[pageIndex]
            const pageSize = page.getSize() // { width, height }

            // Convert PDF coordinates (origin at bottom-left) to HTML relative percentages (origin at top-left)
            const leftPercent = (rect.x / pageSize.width) * 100
            const topPercent = ((pageSize.height - rect.y - rect.height) / pageSize.height) * 100
            const widthPercent = (rect.width / pageSize.width) * 100
            const heightPercent = (rect.height / pageSize.height) * 100

            boxes.push({
              name,
              pageIndex,
              leftPercent,
              topPercent,
              widthPercent,
              heightPercent,
              isEditable
            } as any)
          }
        }

        console.log('[PdfViewerModal] Extracted drawing boxes from PDF binary:', boxes)
        setDetectedBoxes(boxes)
      } catch (err) {
        console.warn('[PdfViewerModal] Could not extract drawing boxes:', err)
      }
    }

    extractDrawingBoxes()
  }, [url, isEditable])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setError(null)
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error)
    setError('No se pudo cargar el documento.')
  }

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      const response = await fetch(url)
      const originalPdfBytes = await response.arrayBuffer()
      const pdfDoc = await PDFDocument.load(originalPdfBytes)
      const form = pdfDoc.getForm()

      const inputs = document.querySelectorAll(
        '.react-pdf__Page__annotations input, .react-pdf__Page__annotations textarea, .react-pdf__Page__annotations select'
      )

      // 1. Process standard AcroForm text / checkbox / radio fields
      inputs.forEach((element) => {
        const name = element.getAttribute('name')
        if (!name || /draw_|draw_box_|sig_/i.test(name)) return

        try {
          if (element instanceof HTMLInputElement) {
            if (element.type === 'checkbox') {
              try {
                const checkBox = form.getCheckBox(name)
                if (element.checked) {
                  checkBox.check()
                } else {
                  checkBox.uncheck()
                }
              } catch (e) {
                console.warn(`Could not set checkbox ${name}`, e)
              }
            } else if (element.type === 'radio') {
              if (element.checked) {
                try {
                  const radioGroup = form.getRadioGroup(name)
                  radioGroup.select(element.value)
                } catch (e) {
                  try {
                    const radioGroup = form.getRadioGroup(name)
                    const options = radioGroup.getOptions()
                    if (options.length > 0) {
                      radioGroup.select(options[0])
                    }
                  } catch (err) {}
                }
              }
            } else {
              try {
                form.getTextField(name).setText(element.value || '')
              } catch (e) {}
            }
          } else if (element instanceof HTMLTextAreaElement) {
            try {
              form.getTextField(name).setText(element.value || '')
            } catch (e) {}
          }
        } catch (err) {
          console.warn(`Could not set field ${name}`, err)
        }
      })

      // Helper function to decode base64 dataUrl synchronously into Uint8Array
      const dataUrlToBytes = (dataUrl: string): Uint8Array => {
        const base64 = dataUrl.split(',')[1] || dataUrl
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes
      }

      // 2. Embed student drawings into draw_box_* fields
      const pages = pdfDoc.getPages()
      for (const [name, dataUrl] of Object.entries(drawings)) {
        if (!dataUrl) continue

        try {
          const field = form.getField(name)
          if (!field) continue

          const widgets = field.acroField.getWidgets()
          if (widgets.length === 0) continue

          const widget = widgets[0]
          const rect = widget.getRectangle() // { x, y, width, height }

          // Locate exact page for this widget
          let targetPage = pages[0]
          const widgetP = widget.P()
          if (widgetP) {
            const found = pages.find((p) => p.ref === widgetP)
            if (found) targetPage = found
          } else {
            for (const page of pages) {
              const annots = page.node.Annots()
              // pdf-lib doesn't expose widget.ref publicly; access via acroField.ref
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const widgetRef = (widget as any).ref
              if (annots && annots.asArray().includes(widgetRef)) {
                targetPage = page
                break
              }
            }
          }

          // Convert base64 dataUrl directly to Uint8Array bytes
          const pngImageBytes = dataUrlToBytes(dataUrl)
          const pngImage = await pdfDoc.embedPng(pngImageBytes)

          targetPage.drawImage(pngImage, {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          })

          // Remove original form field so default button background doesn't cover drawing
          try {
            form.removeField(field)
          } catch (e) {
            console.warn(`Could not remove form field ${name}:`, e)
          }
        } catch (err) {
          console.warn(`Could not embed drawing for field ${name}`, err)
        }
      }

      // 3. Flatten the entire PDF form so text, checkboxes, and drawings become static and uneditable
      try {
        form.flatten()
      } catch (flattenErr) {
        console.warn('Could not flatten PDF form fields:', flattenErr)
      }

      let finalPdfBytes
      if (assignedPages) {
        try {
          console.log('[PdfViewerModal] Extracting only assigned pages for submission:', assignedPages)
          const subPdfDoc = await PDFDocument.create()
          const indices = getAssignedPageIndices(assignedPages, pdfDoc.getPageCount())
          const copiedPages = await subPdfDoc.copyPages(pdfDoc, indices)
          copiedPages.forEach((page) => subPdfDoc.addPage(page))
          finalPdfBytes = await subPdfDoc.save()
        } catch (copyErr) {
          console.warn('[PdfViewerModal] Could not extract only assigned pages, falling back to full PDF:', copyErr)
          finalPdfBytes = await pdfDoc.save()
        }
      } else {
        finalPdfBytes = await pdfDoc.save()
      }

      const blob = new Blob([finalPdfBytes as unknown as BlobPart], { type: 'application/pdf' })
      await onSave(blob)
      onClose()
    } catch (err) {
      console.error('Error saving PDF', err)
      alert('Hubo un error al guardar el documento.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
      }}
    >
      <style>{`
        /* Allow form interactions on editable pages */
        .react-pdf__Page__annotations, .annotationLayer {
          z-index: 5;
          pointer-events: auto;
        }
        /* Lock all interactions on pages marked as read-only.
           This overrides the above with higher specificity + !important
           so the annotation/form layer cannot be clicked or typed into. */
        .pdf-page-locked .react-pdf__Page__annotations,
        .pdf-page-locked .annotationLayer,
        .pdf-page-locked .react-pdf__Page__textContent,
        .pdf-page-locked input,
        .pdf-page-locked textarea,
        .pdf-page-locked select {
          pointer-events: none !important;
          user-select: none !important;
          cursor: default !important;
        }
      `}</style>

      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: '50%',
          width: '34px',
          height: '34px',
          color: 'white',
          fontSize: '1.1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
      >
        ✕
      </button>

      {/* Save Button */}
      {onSave && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            position: 'fixed',
            top: '20px',
            right: '70px',
            background: isSaving ? '#6b7280' : '#8b5cf6',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            zIndex: 100,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          {isSaving ? 'Guardando...' : 'Guardar y Enviar'}
        </button>
      )}

      {/* Main PDF Canvas Scroll View */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
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
            {Array.from(new Array(numPages), (_el, index) => {
              const pageNum = index + 1

              // Find if this page belongs to a previously-submitted range
              const submittedInfo = (submittedRanges ?? []).find(
                r => isPageAssigned(pageNum, r.pages)
              )
              const lockedBySubmittedRange = !!submittedInfo

              const pageEditable =
                isEditable &&
                !!onSave &&
                isPageAssigned(pageNum, assignedPages) &&
                !lockedBySubmittedRange

              const lockLabel = !onSave
                ? '🔒 Entregado'
                : lockedBySubmittedRange
                ? '🔒 Ya entregado'
                : '📄 Solo lectura'

              // For submitted pages: render from the flattened submitted PDF so the
              // student can see their previous answers. The page is always locked
              // (pointer-events: none via class) and the submitted PDF's URL is used.
              if (lockedBySubmittedRange && submittedInfo?.signed_url) {
                return (
                  <div
                    key={`page_${pageNum}`}
                    style={{
                      position: 'relative',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <div className="pdf-page-locked" style={{ position: 'relative' }}>
                      {/* Nested Document: loads the submitted (flattened) PDF for this page */}
                      <Document
                        file={submittedInfo.signed_url}
                        options={options}
                        loading={
                          <div style={{
                            width: pageWidth,
                            height: Math.round(pageWidth * 1.414),
                            background: '#111',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#888',
                            fontSize: '0.85rem'
                          }}>
                            Cargando página entregada...
                          </div>
                        }
                      >
                        <Page
                          pageNumber={getPageOffsetInSubmittedRange(pageNum, submittedInfo.pages)}
                          width={pageWidth}
                          renderAnnotationLayer={false}
                          renderForms={false}
                          renderTextLayer={false}
                        />
                      </Document>
                      {/* Locked badge */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0,0,0,0.08)',
                          zIndex: 25,
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-end',
                          padding: '6px',
                          pointerEvents: 'none',
                        }}
                      >
                        <span
                          style={{
                            background: 'rgba(0,0,0,0.55)',
                            color: '#86efac',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                          }}
                        >
                          🔒 Ya entregado
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }

              // For all other pages: render from the primary (original) document
              return (
                <div
                  key={`page_${pageNum}`}
                  style={{
                    position: 'relative',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    className={pageEditable ? '' : 'pdf-page-locked'}
                    style={{ position: 'relative' }}
                  >
                    <Page
                      pageNumber={pageNum}
                      width={pageWidth}
                      renderAnnotationLayer={true}
                      renderForms={true}
                      renderTextLayer={true}
                    />

                    {/* Locked-page visual overlay */}
                    {isEditable && !pageEditable && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0,0,0,0.18)',
                          zIndex: 25,
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-end',
                          padding: '6px',
                          pointerEvents: 'none',
                        }}
                      >
                        <span
                          style={{
                            background: 'rgba(0,0,0,0.55)',
                            color: '#fca5a5',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {lockLabel}
                        </span>
                      </div>
                    )}

                    {/* Drawing boxes — only on editable pages */}
                    {pageEditable &&
                      detectedBoxes
                        .filter((box) => box.pageIndex === index)
                        .map((box) => (
                          <div
                            key={box.name}
                            onClick={() => setActiveDrawField(box.name)}
                            style={{
                              position: 'absolute',
                              left: `${box.leftPercent}%`,
                              top: `${box.topPercent}%`,
                              width: `${box.widthPercent}%`,
                              height: `${box.heightPercent}%`,
                              border: '2px dashed #8b5cf6',
                              borderRadius: '6px',
                              backgroundColor: drawings[box.name]
                                ? 'rgba(139, 92, 246, 0.22)'
                                : 'rgba(139, 92, 246, 0.14)',
                              backgroundImage: drawings[box.name] ? `url(${drawings[box.name]})` : 'none',
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              cursor: 'pointer',
                              zIndex: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6d28d9',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              backdropFilter: 'blur(2px)',
                              boxSizing: 'border-box',
                              boxShadow: '0 2px 6px rgba(139, 92, 246, 0.25)',
                              transition: 'all 0.2s ease',
                            }}
                            title={`Clic para dibujar (${box.name})`}
                          >
                            {!drawings[box.name] && '✍️ Clic para dibujar / firmar'}
                          </div>
                        ))}
                  </div>
                </div>
              )
            })}
          </Document>
        )}
      </div>

      {/* Drawing Modal Dialog */}
      <DrawingModal
        isOpen={!!activeDrawField}
        fieldName={activeDrawField || ''}
        initialDataUrl={activeDrawField ? drawings[activeDrawField] : undefined}
        onClose={() => setActiveDrawField(null)}
        onSave={(fieldName, dataUrl) => {
          setDrawings((prev) => ({
            ...prev,
            [fieldName]: dataUrl,
          }))
        }}
      />
    </div>
  )
}

export default PdfViewerModal