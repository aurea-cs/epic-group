import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PdfViewerModalProps {
  url: string
  onClose: () => void
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ url, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderedPages = useRef<Set<number>>(new Set())

  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('contextmenu', blockMenu, true)
    }
  }, [])

  // Render a single page into its canvas
  const renderPage = useCallback(async (pageNum: number) => {
    const pdfDoc = pdfDocRef.current
    const canvas = canvasRefs.current[pageNum]
    if (!pdfDoc || !canvas || renderedPages.current.has(pageNum)) return
    renderedPages.current.add(pageNum)

    const page = await pdfDoc.getPage(pageNum)
    const devicePixelRatio = window.devicePixelRatio || 1
    const baseViewport = page.getViewport({ scale: 1 })
    const targetWidth = Math.min(window.innerWidth * 0.9, 1400)
    const scale = (targetWidth / baseViewport.width) * devicePixelRatio
    const viewport = page.getViewport({ scale })

    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = `${viewport.width / devicePixelRatio}px`
    canvas.style.height = `${viewport.height / devicePixelRatio}px`

    await page.render({ canvas, viewport }).promise
  }, [])

  // Load the PDF document once
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    renderedPages.current = new Set()

    pdfjsLib.getDocument({ url }).promise
      .then(pdfDoc => {
        if (cancelled) return
        pdfDocRef.current = pdfDoc
        setNumPages(pdfDoc.numPages)
      })
      .catch(err => {
        console.error('Error loading PDF:', err)
        if (!cancelled) setError('No se pudo cargar el documento.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [url])

  // Once numPages is known AND canvases exist in the DOM, render everything.
  // Runs after the JSX below has committed the <canvas> elements.
  useEffect(() => {
    if (!numPages || loading) return
    for (let i = 1; i <= numPages; i++) {
      renderPage(i)
    }
  }, [numPages, loading, renderPage])

  // Lazy-render as pages scroll into view (covers cases where renderPage
  // above hasn't caught up yet, e.g. very long documents)
  useEffect(() => {
    if (!numPages || !containerRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = Number((entry.target as HTMLElement).dataset.page)
            renderPage(pageNum)
          }
        })
      },
      { root: containerRef.current, rootMargin: '200px 0px' }
    )
    const wrappers = containerRef.current.querySelectorAll('[data-page]')
    wrappers.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [numPages, renderPage])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', zIndex: 9999,
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '20px', right: '20px',
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
        ref={containerRef}
        style={{
          flex: 1, position: 'relative', backgroundColor: '#111',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          overflowY: 'auto', overflowX: 'hidden', padding: '1rem', gap: '1rem',
          userSelect: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {loading && <p style={{ color: 'white' }}>Cargando documento...</p>}
        {error && <p style={{ color: '#fca5a5' }}>{error}</p>}

        {!loading && !error && numPages > 0 && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
          <div key={pageNum} data-page={pageNum}>
            <canvas
              ref={el => { canvasRefs.current[pageNum] = el }}
              style={{
                maxWidth: '100%',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                borderRadius: '4px',
                display: 'block',
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PdfViewerModal