import { useState, useRef, useEffect } from 'react'

export function useItemMenu() {
    const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
    const kebabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
    const menuRef = useRef<HTMLDivElement>(null)

    const handleKebabClick = (_e: React.MouseEvent, itemId: string) => {
        if (openMenuItemId === itemId) {
            setOpenMenuItemId(null)
            setMenuPosition(null)
            return
        }
        const btn = kebabRefs.current[itemId]
        if (!btn) return
        const rect = btn.getBoundingClientRect()
        const menuWidth = 220
        const menuHeight = 160
        const left = rect.right - menuWidth
        const spaceBelow = window.innerHeight - rect.bottom
        const top = spaceBelow < menuHeight
            ? rect.top - menuHeight - 4
            : rect.bottom + 4
        setMenuPosition({ top, left })
        setOpenMenuItemId(itemId)
    }

    const closeMenu = () => {
        setOpenMenuItemId(null)
        setMenuPosition(null)
    }

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu()
            }
        }
        const closeOnScroll = () => closeMenu()

        document.addEventListener('mousedown', close)
        window.addEventListener('scroll', closeOnScroll, true)
        window.addEventListener('resize', closeOnScroll)
        return () => {
            document.removeEventListener('mousedown', close)
            window.removeEventListener('scroll', closeOnScroll, true)
            window.removeEventListener('resize', closeOnScroll)
        }
    }, [])

    return {
        openMenuItemId,
        menuPosition,
        kebabRefs,
        menuRef,
        handleKebabClick,
        closeMenu,
    }
}