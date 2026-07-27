// ScheduleScreen.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import './ScheduleScreen.css'
import { getUserRole } from '../utils/getUserRole'

interface ScheduleScreenProps {
  user: User
}

interface SubjectSchedule {
  id: string
  name: string
  short_name: string | null
  schedule_days: string[] | null
  schedule_start_time: string | null // "HH:MM:SS"
  schedule_end_time: string | null
}

interface ClassBlock {
  id: string
  subjectId: string
  name: string
  shortName: string | null
  day: string
  startMinutes: number // minutes since midnight
  endMinutes: number
  startLabel: string
  endLabel: string
}

function avatarColor(name: string): string {
  const colors = ['#7c3aed, #4f46e5', '#0891b2, #0e7490', '#059669, #047857', '#d97706, #b45309', '#dc2626, #b91c1c', '#7c3aed, #a855f7', '#0284c7, #0369a1']
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + h
  return colors[Math.abs(h) % colors.length]
}

const DAYS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
}
const HOUR_HEIGHT = 64 // px per hour, drives the whole grid's vertical scale
const DEFAULT_START_HOUR = 7
const DEFAULT_END_HOUR = 20
const PALETTE = ['#c084fc', '#60a5fa', '#f472b6', '#4ade80', '#fbbf24', '#22d3ee', '#f87171']

function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function formatMinutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function colorForSubject(subjectId: string): string {
  let hash = 0
  for (let i = 0; i < subjectId.length; i++) hash = subjectId.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ user }) => {
  const [subjects, setSubjects] = useState<SubjectSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true)
      setError(null)
      try {
        const role = getUserRole(user)
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/schedule/${user.id}?role=${role}`)
        if (!response.ok) throw new Error('Error al cargar el horario')
        const data = await response.json()
        setSubjects(data)
      } catch (err) {
        console.error('Error fetching schedule:', err)
        setError('No se pudo cargar el horario.')
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [user])

  // Keep a "current time" line in sync
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const classBlocks = useMemo<ClassBlock[]>(() => {
    const blocks: ClassBlock[] = []
    subjects.forEach(sub => {
      const startMinutes = parseTimeToMinutes(sub.schedule_start_time)
      const endMinutes = parseTimeToMinutes(sub.schedule_end_time)
      if (startMinutes === null || !sub.schedule_days) return

      const resolvedEnd = endMinutes !== null && endMinutes > startMinutes
        ? endMinutes
        : startMinutes + 60 // default to a 1h block if no/invalid end time

      sub.schedule_days.forEach(day => {
        if (!DAYS_ORDER.includes(day)) return
        blocks.push({
          id: `${sub.id}-${day}`,
          subjectId: sub.id,
          name: sub.name,
          shortName: sub.short_name,
          day,
          startMinutes,
          endMinutes: resolvedEnd,
          startLabel: formatMinutesLabel(startMinutes),
          endLabel: formatMinutesLabel(resolvedEnd)
        })
      })
    })
    return blocks
  }, [subjects])

  // Scale the grid to fit the actual classes instead of a fixed 7am-8pm range
  const { startHour, endHour } = useMemo(() => {
    if (classBlocks.length === 0) return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR }
    const earliest = Math.min(...classBlocks.map(b => b.startMinutes))
    const latest = Math.max(...classBlocks.map(b => b.endMinutes))
    return {
      startHour: Math.min(DEFAULT_START_HOUR, Math.floor(earliest / 60)),
      endHour: Math.max(DEFAULT_END_HOUR, Math.ceil(latest / 60))
    }
  }, [classBlocks])

  const hours = useMemo(() => {
    const arr: number[] = []
    for (let h = startHour; h <= endHour; h++) arr.push(h)
    return arr
  }, [startHour, endHour])

  const gridHeight = (endHour - startHour) * HOUR_HEIGHT

  const todayName = DAY_INDEX_TO_NAME[now.getDay()]
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowOffset = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT

  const todaysClasses = classBlocks
    .filter(b => b.day === todayName)
    .sort((a, b) => a.startMinutes - b.startMinutes)

  return (
    <div className="schedule-screen-container">
      <div className="schedule-content-sc">
        {/* Sidebar */}
        <aside className="schedule-sidebar">
          <div className="user-profile-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${avatarColor(user.user_metadata?.full_name || user.email || '-')})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                {(user.user_metadata?.full_name || user.email || '-').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="user-info">
              <h2>{user.user_metadata?.full_name || user.email || 'Usuario'}</h2>
              <p>{getUserRole(user) === 'professor' ? 'Profesor' : 'Estudiante'}</p>
            </div>
          </div>

          <div className="today-panel">
            <div className="today-panel-header">
              <span>Clases de hoy</span>
              <span className="today-count">{todaysClasses.length}</span>
            </div>

            {todaysClasses.length === 0 ? (
              <div className="empty-state">
                <p>No hay clases hoy.</p>
              </div>
            ) : (
              <div className="today-list">
                {todaysClasses.map(block => (
                  <div
                    key={block.id}
                    className="today-item"
                    style={{ borderLeftColor: colorForSubject(block.subjectId) }}
                  >
                    <h4>{block.name}</h4>
                    <p>{block.startLabel} – {block.endLabel}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="week-summary">
            <span className="week-summary-header">Total semanal</span>
            <span className="week-summary-count">{classBlocks.length} clases</span>
          </div>
        </aside>

        {/* Weekly grid */}
        <main className="schedule-main">
          {loading ? (
            <div className="empty-state-main"><p>Cargando horario...</p></div>
          ) : error ? (
            <div className="empty-state-main"><p>{error}</p></div>
          ) : (
            <div className="week-grid-wrapper">
              <div className="week-grid-header">
                <div className="time-gutter-header" />
                {DAYS_ORDER.map(day => (
                  <div key={day} className={`day-header ${day === todayName ? 'is-today' : ''}`}>
                    {day}
                  </div>
                ))}
              </div>

              <div className="week-grid-body" style={{ height: gridHeight }}>
                {/* Time gutter */}
                <div className="time-gutter">
                  {hours.map(h => (
                    <div key={h} className="time-gutter-slot" style={{ height: HOUR_HEIGHT }}>
                      {formatMinutesLabel(h * 60)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS_ORDER.map(day => (
                  <div key={day} className={`day-column ${day === todayName ? 'is-today' : ''}`}>
                    {hours.map(h => (
                      <div key={h} className="hour-line" style={{ height: HOUR_HEIGHT }} />
                    ))}

                    {day === todayName && nowOffset >= 0 && nowOffset <= gridHeight && (
                      <div className="now-line" style={{ top: nowOffset }} />
                    )}

                    {classBlocks
                      .filter(b => b.day === day)
                      .map(block => {
                        const top = ((block.startMinutes - startHour * 60) / 60) * HOUR_HEIGHT
                        const height = ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT
                        return (
                          <div
                            key={block.id}
                            className="class-block"
                            style={{
                              top,
                              height: Math.max(height, 28),
                              backgroundColor: colorForSubject(block.subjectId)
                            }}
                            title={`${block.name} · ${block.startLabel} - ${block.endLabel}`}
                          >
                            <span className="class-block-name">{block.shortName || block.name}</span>
                            <span className="class-block-time">{block.startLabel} - {block.endLabel}</span>
                          </div>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default ScheduleScreen