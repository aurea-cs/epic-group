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

      // Fill the full viewport width at native resolution
      const targetWidth = window.innerWidth * devicePixelRatio
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = targetWidth / baseViewport.width
      const viewport = page.getViewport({ scale })

      canvas.width = viewport.width
      canvas.height = viewport.height
      // CSS size: full viewport width, height proportional
      canvas.style.width = '100vw'
      canvas.style.height = `${viewport.height / devicePixelRatio}px`
      canvas.style.display = 'block'

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
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: '#000',
            display: 'flex', flexDirection: 'column',
            zIndex: 9999,
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
                ref={containerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    userSelect: 'none',
                    backgroundColor: '#000',
                }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {loading && (
                    <p style={{
                        color: 'white', textAlign: 'center',
                        paddingTop: '40vh', fontSize: '1rem'
                    }}>
                        Cargando documento...
                    </p>
                )}
                {error && (
                    <p style={{
                        color: '#fca5a5', textAlign: 'center',
                        paddingTop: '40vh', fontSize: '1rem'
                    }}>
                        {error}
                    </p>
                )}

                {!loading && !error && numPages > 0 &&
                    Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                        <div key={pageNum} data-page={pageNum} style={{ lineHeight: 0 }}>
                            <canvas
                                ref={el => { canvasRefs.current[pageNum] = el }}
                                draggable={false}
                                style={{ display: 'block' }}
                            />
                        </div>
                    ))
                }
            </div>
        </div>
    )
  }

export default PdfViewerModal