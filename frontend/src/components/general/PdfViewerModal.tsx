import React, { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerModalProps {
  url: string
  onClose: () => void
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ url, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0)
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