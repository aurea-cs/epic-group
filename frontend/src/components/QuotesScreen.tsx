import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import './QuotesScreen.css'
import { auth } from '../lib/supabase'
import { getUserRole } from '../utils/getUserRole'
import TopNavigation from './TopNavigation'

interface QuotesScreenProps {
  user: User
}

const QuotesScreen: React.FC<QuotesScreenProps> = ({ user }) => {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // TODO: Fetch data from backend


  // TODO: Generate calendar dynamically from current date
  const calendarDays: string[][] = [
    ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  ]

  // TODO: Fetch selected days from backend
  const isSelected = (_day: string) => false
  const isToday = (_day: string) => false

  /* State for Task Modal */
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  // Real data state
  const [subjects, setSubjects] = useState<any[]>([])
  const [allTasks, setAllTasks] = useState<Array<{
    id: string
    title: string
    date: string
    time: string
    description: string
  }>>([])

  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const role = getUserRole(user)
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/agenda/${user.id}?role=${role}`)
        if (!response.ok) throw new Error('Error fetching agenda')
        const data = await response.json()
        setSubjects(data)
        
        // Map recurring classes to current month dates
        const dayMap: Record<string, number> = {
          'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
        }

        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth() // 0-indexed
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        
        const tasks = []
        for (let d = 1; d <= daysInMonth; d++) {
          const currentDate = new Date(year, month, d)
          const currentDayOfWeek = currentDate.getDay()
          
          for (const sub of data) {
            if (sub.schedule_days && Array.isArray(sub.schedule_days)) {
              for (const sd of sub.schedule_days) {
                if (dayMap[sd] === currentDayOfWeek) {
                  // Format time to 12h if needed, or keep 24h
                  const startStr = sub.schedule_start_time ? sub.schedule_start_time.substring(0,5) : ''
                  const endStr = sub.schedule_end_time ? sub.schedule_end_time.substring(0,5) : ''
                  const timeStr = startStr && endStr ? `${startStr} - ${endStr}` : (startStr || 'Sin horario')
                  
                  // Format date to YYYY-MM-DD
                  const formattedDate = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  
                  tasks.push({
                    id: `${sub.id}-${d}`,
                    title: sub.name,
                    date: formattedDate,
                    time: timeStr,
                    description: sub.short_name || ''
                  })
                }
              }
            }
          }
        }
        
        setAllTasks(tasks)
      } catch (err) {
        console.error('Error fetching agenda:', err)
      }
    }
    fetchAgenda()
  }, [user])

  const handleCreateTask = () => {
    setTaskForm({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      description: ''
    })
    setShowTaskModal(true)
  }

  const handleSaveTask = async () => {
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      const newTask = {
        id: crypto.randomUUID(),
        ...taskForm
      }
      setAllTasks(prev => [...prev, newTask])
      setLoading(false)
      setShowTaskModal(false)
    }, 600)
  }

  // Helper to Group Tasks by Date to create Columns
  const getColumns = () => {
    // Group tasks by Date
    const tasksByDate: { [key: string]: typeof allTasks } = {}
    allTasks.forEach(task => {
      if (!tasksByDate[task.date]) {
        tasksByDate[task.date] = []
      }
      tasksByDate[task.date].push(task)
    })

    // Sort dates
    const sortedDates = Object.keys(tasksByDate).sort()

    return sortedDates.map(dateStr => {
      const dateObj = new Date(dateStr)
      // Correct for timezone offset when parsing YYYY-MM-DD
      const localDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000)
      const dayNum = localDate.getDate()
      const dayName = localDate.toLocaleDateString('es-ES', { weekday: 'long' })

      return {
        id: dateStr,
        dateLabel: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}`, // New Label for column
        tasks: tasksByDate[dateStr].map(t => ({
          day: dayNum,
          title: t.title,
          time: t.time,
          icon: '🟣' // Placeholder
        })),
        bottomTasks: [] as Array<{ day: number; title: string; time: string; icon: string }> // Can be used for afternoon tasks if needed
      }
    })
  }

  const columns = getColumns()

  const displayName = user.user_metadata?.full_name || user.email || 'Usuario'
  const userRole = getUserRole(user)

  return (
    <div className="quotes-screen-container">
      <div className="quotes-content">
        {/* Sidebar Left */}
        <aside className="quotes-sidebar">
          <div className="user-profile-header">
            <div className="user-avatar-circle"></div>
            <div className="user-info">
              <h2>{user.user_metadata?.full_name || user.email || 'Usuario'}</h2>
              <p>{user.user_metadata?.role || 'Usuario'}</p>
            </div>
          </div>

          <button className="create-task-btn" onClick={handleCreateTask}>
            CREATE NEW TASK
          </button>

          <div className="calendar-widget">
            <div className="calendar-header">
              <button>‹</button>
              <span>{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
              <button>›</button>
            </div>
            <div className="calendar-grid">
              {/* Header Row */}
              {calendarDays[0].map((d, i) => <div key={`h - ${i} `} className="cal-cell header">{d}</div>)}
              {/* Days */}
              {calendarDays.slice(1).map((week, wIndex) => (
                week.map((_day, dIndex) => (
                  <div
                    key={`${wIndex} -${dIndex} `}
                    className={`cal - cell day ${isSelected(_day) ? 'selected' : ''} ${isToday(_day) && wIndex === 0 ? 'range-start' : ''} `}
                  >
                    {_day}
                  </div>
                ))
              ))}
            </div>
          </div>

          <div className="month-tasks">
            <div className="month-tasks-header">
              <span>{new Date().toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()} TASKS</span>
              <span>{allTasks.length} Total</span>
            </div>

            {allTasks.length === 0 ? (
              <div className="empty-state">
                <p>No hay tareas para este mes</p>
              </div>
            ) : (
              <div className="sidebar-task-list" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allTasks.slice(0, 5).map(task => (
                  <div key={`side-${task.id}`} style={{ padding: '0.8rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem', color: '#1f295a' }}>{task.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{task.date} | {task.time}</p>
                  </div>
                ))}
                {allTasks.length > 5 && (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: '0.5rem 0' }}>+{allTasks.length - 5} más</p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Columns */}
        <main className="quotes-main">
          {columns.length === 0 ? (
            <div className="empty-state-main">
              <p>No hay tareas programadas.</p>
            </div>
          ) : (
            columns.map((col) => (
              <div key={col.id} className="task-column">
                {/* Header Area */}
                <div className="column-header">
                  <h3>{col.dateLabel}</h3>
                  <p>TASKS</p>
                </div>

                {
                // col.tasks.length > 0 && (
                //   <div className="ongoing-card">
                //     <div className="ongoing-header">
                //       <span>NEXT TASK</span>
                //       <div className="avatars">
                //         {/* TODO: Dynamic avatars */}
                //       </div>
                //     </div>
                //     <div className="ongoing-body">
                //       <h4>{col.tasks[0].title}</h4>
                //     </div>
                //   </div>
                // )
                }

                {/* Task List Group 1 */}
                <div className="task-list-group">
                  <span className="month-label">{/* TODO: Dynamic month */}</span>
                  {col.tasks.map((task, tIdx) => (
                    <div key={`t - ${tIdx} `} className="schedule-card">
                      <div className="schedule-date">
                        <span className="big-date">{task.day}</span>
                      </div>
                      <div className="schedule-details">
                        <h4>{task.title}</h4>
                        <p>{task.time}</p>
                      </div>
                      <div className="schedule-icon">
                        <div className="icon-circle">
                          <span className="bar-icon"></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Task List Group 2 */}
                <div className="task-list-group">
                  <span className="month-label">{/* TODO: Dynamic month */}</span>
                  {col.bottomTasks.map((task, tIdx) => (
                    <div key={`b - ${tIdx} `} className="schedule-card">
                      <div className="schedule-date">
                        <span className="big-date">{task.day}</span>
                      </div>
                      <div className="schedule-details">
                        <h4>{task.title}</h4>
                        <p>{task.time}</p>
                      </div>
                      <div className="schedule-icon">
                        <div className="icon-circle">
                          <span className="bar-icon"></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))
          )}
        </main>
      </div>

      {/* Styled Modal for New Task */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="school-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">✨</div>
              <h2>Nueva Tarea</h2>
              <p>Programa una nueva actividad.</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Ej: Reunión de Padres"
                  className="modern-input"
                  autoFocus
                />
              </div>
              <div className="form-group-row" style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={taskForm.date}
                    onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                    className="modern-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Hora</label>
                  <input
                    type="time"
                    value={taskForm.time}
                    onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                    className="modern-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Detalles adicionales..."
                  className="modern-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel-modern" onClick={() => setShowTaskModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-save-modern"
                onClick={handleSaveTask}
                disabled={!taskForm.title || loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuotesScreen
