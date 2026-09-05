import { useRef, useState, useCallback, useEffect } from 'react'

function useReorderableList<T extends { id: string }>(
  initialItems: T[],
  saveFn: (order: { id: string; order_index: number }[]) => Promise<void>,
  debounceMs = 2000
) {
  const [items, setItems] = useState(initialItems)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback((next: T[]) => {
    setIsDirty(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => flush(next), debounceMs)
  }, [debounceMs])

  const flush = useCallback(async (list: T[] = items) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsSaving(true)
    const order = list.map((item, index) => ({ id: item.id, order_index: index }))
    try {
      await saveFn(order)
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }, [items, saveFn])

  const reorder = useCallback((from: number, to: number) => {
    setItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  // flush on unmount / navigation so a pending debounce isn't lost
  useEffect(() => () => { if (isDirty) flush() }, [])

  return { items, reorder, isDirty, isSaving, flush }
}

export default useReorderableList