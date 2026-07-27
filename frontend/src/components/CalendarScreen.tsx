// CalendarScreen.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import './CalendarScreen.css'
import { getUserRole } from '../utils/getUserRole'

interface CalendarScreenProps {
  user: User
}

interface CalendarItem {
  id: string
  kind: 'assignment' | 'event'
  title: string
  date: string // YYYY-MM-DD
  time: string | null
  description: string | null
  eventType?: string | null
  subjectName: string | null
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const WEEKDAY_HEADERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayKey(): string {
  const t = new Date()
  return toDateKey(t.getFullYear(), t.getMonth(), t.getDate())
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ user }) => {
  const today = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() // 0-indexed, browsing floor

  const [viewMonth, setViewMonth] = useState(currentMonth)
  const [items, setItems] = useState<CalendarItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(todayKey())

  useEffect(() => {
    const fetchCalendar = async () => {
      setEventsLoading(true)
      setError(null)
      try {
        const role = getUserRole(user)
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/calendar/${user.id}?role=${role}`)
        if (!response.ok) throw new Error('Error al cargar el calendario')
        const data = await response.json()
        setItems(data)
      } catch (err) {
        console.error('Error fetching calendar:', err)
        setError('No se pudieron cargar las actividades.')
      } finally {
        setEventsLoading(false)
      }
    }
    fetchCalendar()
  }, [user])

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {}
    items.forEach(item => {
      if (!map[item.date]) map[item.date] = []
      map[item.date].push(item)
    })
    Object.values(map).forEach(list =>
      list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
    )
    return map
  }, [items])

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(currentYear, viewMonth, 1)
    const startOffset = firstOfMonth.getDay() // 0 = Sunday
    const daysInMonth = new Date(currentYear, viewMonth + 1, 0).getDate()

    const cells: Array<{ day: number | null; dateKey: string | null }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ day: null, dateKey: null })
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateKey: toDateKey(currentYear, viewMonth, d) })
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, dateKey: null })

    const rows: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [currentYear, viewMonth])

  const canGoBack = viewMonth > currentMonth
  const canGoForward = viewMonth < 11 // December

  return (
    <div className="calendar-screen-container">
      <div className="calendar-content">
        <main className="calendar-main">
          <div className="calendar-month-header">
            <button
              className="month-nav-btn"
              onClick={() => canGoBack && setViewMonth(m => m - 1)}
              disabled={!canGoBack}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <span className="calendar-month-title">{MONTH_NAMES[viewMonth]} {currentYear}</span>
            <button
              className="month-nav-btn"
              onClick={() => canGoForward && setViewMonth(m => m + 1)}
              disabled={!canGoForward}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          {error && <div className="calendar-inline-error">{error}</div>}

          {/* Grid renders immediately — it only depends on viewMonth/currentYear, not on fetched data */}
          <div className="month-grid-wrapper">
            <div className="weekday-row">
              {WEEKDAY_HEADERS.map((wd, i) => (
                <div key={i} className="weekday-cell">{wd}</div>
              ))}
            </div>

            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="week-row">
                {week.map((cell, cIdx) => {
                  if (!cell.day || !cell.dateKey) {
                    return <div key={cIdx} className="day-cell day-cell--empty" />
                  }
                  const dayItems = itemsByDate[cell.dateKey] || []
                  const isToday = cell.dateKey === todayKey()
                  const isSelected = cell.dateKey === selectedDate

                  return (
                    <button
                      key={cIdx}
                      className={[
                        'day-cell',
                        isToday ? 'day-cell--today' : '',
                        isSelected ? 'day-cell--selected' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => setSelectedDate(cell.dateKey!)}
                    >
                      <span className="day-number">{cell.day}</span>
                        {eventsLoading ? (
                        <div className="day-pills">
                            <span className="day-pill-skeleton" />
                        </div>
                        ) : (
                        <div className="day-pills">
                            {dayItems.map(item => (
                            <span key={`${item.kind}-${item.id}`} className={`day-pill day-pill--${item.kind}`}>
                                {item.title}
                            </span>
                            ))}
                        </div>
                        )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export default CalendarScreen