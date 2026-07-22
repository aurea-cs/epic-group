import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { getProfessorCourses } from '../lib/api'
import './DashboardScreen.css'

interface ProfessorAssignmentCoursesScreenProps {
  user: User
}

interface Course {
  id: string
  title: string
  description: string
  centerName: string
}

const ProfessorAssignmentCoursesScreen: React.FC<ProfessorAssignmentCoursesScreenProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const data = await getProfessorCourses(user.id)
        setCourses(data)
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchCourses()
    }
  }, [user])

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div></div>
  }

  return (
    <main className="dashboard-content" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <h1 className="welcome-text" style={{ marginBottom: '2rem' }}>Gestionar Tareas por Materia</h1>
        
        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#1f295a', marginTop: '2rem', background: '#fff', padding: '3rem', borderRadius: '12px' }}>
            <p>No tienes materias asignadas.</p>
          </div>
        ) : (
          <section className="courses-section">
            <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {courses.map((course) => (
                <div 
                  key={course.id} 
                  className="course-card"
                  onClick={() => navigate(`/professor/assignments/courses/${course.id}/content`)}
                  style={{ 
                    cursor: 'pointer',
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: '1px solid rgba(31, 41, 90, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="course-card__content">
                    <h3 className="course-card__title" style={{ color: '#1f295a', margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{course.title}</h3>
                    <p className="course-card__subtitle" style={{ color: '#6c5ce7', margin: '0 0 1rem 0', fontWeight: '500' }}>{course.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(31, 41, 90, 0.6)', fontSize: '0.875rem' }}>
                      <span>🏫</span>
                      <span>{course.centerName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default ProfessorAssignmentCoursesScreen
