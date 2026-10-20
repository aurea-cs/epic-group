import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { COLORS } from '../theme'

interface ModuleSectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  /** Pass false for the last section on the page. */
  spaced?: boolean
}

/** Section heading + horizontally scrolling row of cards with subtle navigation arrows on hover. */
const ModuleSection = ({ icon, title, children, spaced = true }: ModuleSectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth
    setCanScrollLeft(scrollLeft > 6)
    setCanScrollRight(maxScroll > 6 && scrollLeft < maxScroll - 6)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    checkScroll()

    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScroll()
      })
      resizeObserver.observe(el)
      Array.from(el.children).forEach(child => resizeObserver?.observe(child))
    }

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      resizeObserver?.disconnect()
    }
  }, [checkScroll, children])

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = Math.max(280, Math.min(el.clientWidth * 0.75, 420))
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <div style={{ ...(spaced ? { marginBottom: '4rem' } : undefined), width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <h2
        style={{
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '1.25rem',
          marginBottom: '1.5rem',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}
      >
        {icon} {title}
      </h2>

      <div
        className="module-section-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Subtle left edge fade */}
        <div
          className="module-section-edge-gradient left"
          style={{ opacity: canScrollLeft && isHovered ? 1 : 0 }}
        />

        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="module-section-nav-arrow left"
          style={{
            opacity: canScrollLeft && isHovered ? 1 : 0,
            pointerEvents: canScrollLeft && isHovered ? 'auto' : 'none',
            transform: `translateY(-50%) ${canScrollLeft && isHovered ? 'scale(1)' : 'scale(0.8)'}`
          }}
          aria-label="Scroll left"
          title="Scroll left"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>

        {/* Horizontal scroll track */}
        <div ref={scrollRef} className="module-section-scroll-container">
          {children}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="module-section-nav-arrow right"
          style={{
            opacity: canScrollRight && isHovered ? 1 : 0,
            pointerEvents: canScrollRight && isHovered ? 'auto' : 'none',
            transform: `translateY(-50%) ${canScrollRight && isHovered ? 'scale(1)' : 'scale(0.8)'}`
          }}
          aria-label="Scroll right"
          title="Scroll right"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>

        {/* Subtle right edge fade */}
        <div
          className="module-section-edge-gradient right"
          style={{ opacity: canScrollRight && isHovered ? 1 : 0 }}
        />
      </div>
    </div>
  )
}

export const SectionIcon = ({ Icon }: { Icon: LucideIcon }) => (
  <Icon size={24} color={COLORS.sectionIcon} />
)

export const EmptyMessage = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{children}</p>
)

export default ModuleSection