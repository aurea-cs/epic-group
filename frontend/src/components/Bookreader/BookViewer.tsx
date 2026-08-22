import React, { useEffect, useRef, useState, useCallback } from 'react'
import { getModuleItemPages, BookPageData } from './Bookpages.ts'
import { getPageElements, submitElementResponse } from './PageElements.ts'
import { PageElement } from './types'
import PageElements from './PageElements.tsx'

interface BookViewerProps {
    itemId: string
    // TODO: wire this to your actual auth context/hook — needed to load and
    // save this student's own answers. Until then, elements will render but
    // answers won't be saved.
    studentId?: string
    onClose: () => void
}

// How many pages ahead/behind the current view to keep mounted as real <img>
// elements. Everything outside this window renders as an empty placeholder
// so the DOM and network stay light even on a 30-page book.
const MOUNT_WINDOW = 2
// How many pages ahead to eagerly preload (via a plain Image()) so the next
// click feels instant even though only MOUNT_WINDOW pages are mounted.
const PRELOAD_AHEAD = 4

const POLL_INTERVAL_MS = 3000
const MOBILE_BREAKPOINT = 768

const BookViewer: React.FC<BookViewerProps> = ({ itemId, studentId, onClose }) => {
    const [pages, setPages] = useState<BookPageData[]>([])
    const [elementsByPage, setElementsByPage] = useState<Record<number, PageElement[]>>({})
    const [status, setStatus] = useState<'loading' | 'processing' | 'ready' | 'failed'>('loading')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    // Index of the first page currently on screen. In spread mode this is
    // always even (0, 2, 4...); in mobile mode it advances by 1.
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT)

    const preloadedUrls = useRef<Set<string>>(new Set())
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Track viewport size to switch between single-page (phone) and
    // two-page spread (tablet/desktop) layouts.
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const pagesPerView = isMobile ? 1 : 2

    // Best-effort block on save/print shortcuts + right-click.
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

    // Fetch pages, polling while the PDF is still being processed.
    useEffect(() => {
        let cancelled = false

        const fetchPages = async () => {
            try {
                const data = await getModuleItemPages(itemId)
                if (cancelled) return

                if (data.processing_status === 'ready') {
                    setPages(data.pages)
                    setStatus('ready')
                } else if (data.processing_status === 'failed') {
                    setStatus('failed')
                    setErrorMsg(data.processing_error || 'No se pudo procesar el documento.')
                } else {
                    setStatus('processing')
                    pollTimer.current = setTimeout(fetchPages, POLL_INTERVAL_MS)
                }
            } catch (err) {
                console.error('Error fetching book pages:', err)
                if (!cancelled) {
                    setStatus('failed')
                    setErrorMsg('No se pudo cargar el documento.')
                }
            }
        }

        fetchPages()
        return () => {
            cancelled = true
            if (pollTimer.current) clearTimeout(pollTimer.current)
        }
    }, [itemId])

    // Load interactive elements once pages are ready. Grouped by page_number
    // so each rendered page can look up just its own elements in O(1).
    useEffect(() => {
        if (status !== 'ready') return
        let cancelled = false

        getPageElements(itemId, studentId)
            .then(elements => {
                if (cancelled) return
                const grouped: Record<number, PageElement[]> = {}
                for (const el of elements) {
                    if (!grouped[el.page_number]) grouped[el.page_number] = []
                    grouped[el.page_number].push(el)
                }
                setElementsByPage(grouped)
            })
            .catch(err => console.error('Error fetching page elements:', err))

        return () => { cancelled = true }
    }, [itemId, studentId, status])

    const handleAnswer = useCallback((elementId: string, response: any) => {
        if (!studentId) {
            console.warn('No studentId provided to BookViewer — response not saved.')
            return
        }
        submitElementResponse(elementId, studentId, response).catch(err => {
            console.error('Error saving response:', err)
        })
    }, [studentId])

    // Whenever layout mode changes (mobile <-> spread), re-align currentIndex
    // so a spread always starts on an even page.
    useEffect(() => {
        if (!isMobile) {
            setCurrentIndex(prev => prev - (prev % 2))
        }
    }, [isMobile])

    // The set of page indices actually visible right now.
    const visibleIndices = (() => {
        if (pages.length === 0) return []
        if (pagesPerView === 1) return [currentIndex]
        const second = currentIndex + 1
        return second < pages.length ? [currentIndex, second] : [currentIndex]
    })()

    // Preload upcoming pages' images (doesn't mount them, just warms cache).
    useEffect(() => {
        if (status !== 'ready') return
        const end = Math.min(pages.length, currentIndex + pagesPerView + PRELOAD_AHEAD)
        for (let i = currentIndex; i < end; i++) {
            const url = pages[i]?.image_url
            if (url && !preloadedUrls.current.has(url)) {
                preloadedUrls.current.add(url)
                const img = new Image()
                img.src = url
            }
        }
    }, [currentIndex, pages, status, pagesPerView])

    const goTo = useCallback((index: number) => {
        setCurrentIndex(() => {
            const maxStart = Math.max(0, pages.length - pagesPerView)
            return Math.max(0, Math.min(maxStart, index))
        })
    }, [pages.length, pagesPerView])

    const goNext = useCallback(() => goTo(currentIndex + pagesPerView), [currentIndex, pagesPerView, goTo])
    const goPrev = useCallback(() => goTo(currentIndex - pagesPerView), [currentIndex, pagesPerView, goTo])

    // Keyboard navigation
    useEffect(() => {
        const handleArrowKeys = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext()
            if (e.key === 'ArrowLeft') goPrev()
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleArrowKeys)
        return () => window.removeEventListener('keydown', handleArrowKeys)
    }, [goNext, goPrev, onClose])

    const isMounted = (index: number) => visibleIndices.some(v => Math.abs(index - v) <= MOUNT_WINDOW)
    const isAtStart = currentIndex === 0
    const isAtEnd = currentIndex + pagesPerView >= pages.length

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: '#000', display: 'flex', flexDirection: 'column',
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
            >
                ✕
            </button>

            <div
                style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    userSelect: 'none', position: 'relative', overflow: 'hidden',
                }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {status === 'loading' && (
                    <p style={{ color: 'white', fontSize: '1rem' }}>Cargando...</p>
                )}
                {status === 'processing' && (
                    <p style={{ color: 'white', fontSize: '1rem' }}>
                        Preparando el documento interactivo...
                    </p>
                )}
                {status === 'failed' && (
                    <p style={{ color: '#fca5a5', fontSize: '1rem' }}>{errorMsg}</p>
                )}

                {status === 'ready' && pages.length > 0 && (
                    <>
                        <button
                            onClick={goPrev}
                            disabled={isAtStart}
                            style={navButtonStyle('left', isAtStart)}
                        >
                            ‹
                        </button>

                        {/* Spread container: 1 page on mobile, 2 side by side otherwise.
                            Each page-surface is where interactive elements will later
                            be absolutely positioned in % coordinates on top of the image. */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: pagesPerView === 2 ? '4px' : '0',
                            height: '100%',
                            maxWidth: '100%',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {visibleIndices.map(index => {
                                const page = pages[index]
                                return (
                                    <div
                                        key={page.id}
                                        style={{
                                            position: 'relative',
                                            height: '100%',
                                            maxWidth: pagesPerView === 2 ? '50%' : '100%',
                                            aspectRatio: `${page.width} / ${page.height}`,
                                        }}
                                    >
                                        {isMounted(index) && page.image_url && (
                                            <img
                                                src={page.image_url}
                                                draggable={false}
                                                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                                                alt={`Página ${page.page_number}`}
                                            />
                                        )}
                                        {isMounted(index) && elementsByPage[page.page_number] && (
                                            <PageElements
                                                elements={elementsByPage[page.page_number]}
                                                onAnswer={handleAnswer}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <button
                            onClick={goNext}
                            disabled={isAtEnd}
                            style={navButtonStyle('right', isAtEnd)}
                        >
                            ›
                        </button>

                        <div style={{
                            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                            color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem',
                        }}>
                            {pagesPerView === 2 && visibleIndices.length === 2
                                ? `${visibleIndices[0] + 1}-${visibleIndices[1] + 1} / ${pages.length}`
                                : `${currentIndex + 1} / ${pages.length}`}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function navButtonStyle(side: 'left' | 'right', disabled: boolean): React.CSSProperties {
    return {
        position: 'absolute',
        [side]: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        borderRadius: '50%',
        width: '44px',
        height: '44px',
        color: 'white',
        fontSize: '1.6rem',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    }
}

export default BookViewer