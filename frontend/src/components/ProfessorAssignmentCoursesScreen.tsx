import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
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
  gradeName?: string
  level?: number | string | null
  campoFormativo?: string
}

// Formats grade level into clear human-readable strings based on level attribute:
// - Primaria (1-6): "1er de Primaria", "2do de Primaria", ... "6to de Primaria"
// - Secundaria (1-3): "1er de Secundaria", "2do de Secundaria", "3er de Secundaria"
// - Preparatoria / Bachillerato (1-6): "1er Semestre de Preparatoria", ... "6to Semestre de Preparatoria"
const formatGradeDisplayName = (t: any, rawName?: string, levelVal?: number | string | null): string => {
  if (!rawName) return t('professorCourses.noGrade')
  const name = rawName.trim()
  if (!name) return t('professorCourses.noGrade')

  const levelNum = (levelVal !== undefined && levelVal !== null && levelVal !== '') ? parseInt(String(levelVal), 10) : NaN
  if (isNaN(levelNum)) {
    return name
  }

  const nameLower = name.toLowerCase()

  if (levelNum === 0) return `${t('professorCourses.general')} ${name}`

  // Preparatoria / Prepa / Bachillerato -> Semestres 1-6
  if (nameLower.includes('prepa') || nameLower.includes('bachillerato')) {
    const ordinal = levelNum === 1 ? t('professorCourses.ordinal1') : levelNum === 2 ? t('professorCourses.ordinal2') : levelNum === 3 ? t('professorCourses.ordinal3') : `${levelNum}${t('professorCourses.ordinalOther')}`
    return `${ordinal} ${t('professorCourses.semesterOf')} ${name}`
  }

  // Primaria (1-6), Secundaria (1-3), or default level
  let suffix = t('professorCourses.ordinalOther')
  if (levelNum === 1) suffix = t('professorCourses.ordinal1').replace('1', '')
  else if (levelNum === 2) suffix = t('professorCourses.ordinal2').replace('2', '')
  else if (levelNum === 3) suffix = t('professorCourses.ordinal3').replace('3', '')

  return `${levelNum}${suffix} ${t('professorCourses.of')} ${name}`
}

const ProfessorAssignmentCoursesScreen: React.FC<ProfessorAssignmentCoursesScreenProps> = ({ user }) => {
  const { t } = useTranslation()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()

  const toggleGrade = (gradeKey: string) => {
    setExpandedGrades(prev => ({
      ...prev,
      [gradeKey]: !prev[gradeKey]
    }))
  }

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

  // Group courses by Center -> Grade (formatted & level-aware) -> Subjects
  const groupedData = useMemo(() => {
    const centersMap: Record<string, Record<string, Course[]>> = {}

    courses.forEach(course => {
      const center = course.centerName || t('professorCourses.defaultCenter')
      const gradeRaw = course.gradeName || course.description || t('professorCourses.defaultGrade')
      const gradeDisplay = formatGradeDisplayName(t, gradeRaw, course.level)

      if (!centersMap[center]) {
        centersMap[center] = {}
      }
      if (!centersMap[center][gradeDisplay]) {
        centersMap[center][gradeDisplay] = []
      }
      centersMap[center][gradeDisplay].push(course)
    })

    return centersMap
  }, [courses, t])

  const getSortLevel = (coursesList: Course[]) => {
    const first = coursesList.find(c => c.level !== undefined && c.level !== null)
    if (first && first.level !== null) {
      const val = parseInt(String(first.level), 10)
      if (!isNaN(val)) return val
    }
    return 0
  }

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div></div>
  }

  return (
    <main className="dashboard-content" style={{ padding: '2rem', margin: '0 auto', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <div style={{ width: '100%' }}>

        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ffffffff', marginTop: '2rem', background: 'transparent', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffffffff' }}>{t('professorCourses.noCoursesTitle')}</h3>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>{t('professorCourses.noCoursesDesc')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {Object.entries(groupedData).map(([centerName, gradesMap]) => (
              <div key={centerName} style={{
                borderRadius: '20px',
                padding: '2rem',
              }}>
                {/* Center Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '2px solid rgba(108, 92, 231, 0.15)' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', color: '#fff', boxShadow: '0 4px 10px rgba(108, 92, 231, 0.25)'
                  }}>
                    🏫
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{centerName}</h2>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>
                      {Object.values(gradesMap).reduce((acc, list) => acc + list.length, 0)} {t('professorCourses.totalCourses')}
                    </span>
                  </div>
                </div>

                {/* Grades inside Center */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {Object.entries(gradesMap)
                    .sort((a, b) => {
                      const levelA = getSortLevel(a[1])
                      const levelB = getSortLevel(b[1])
                      if (levelA !== levelB) return levelA - levelB
                      return a[0].localeCompare(b[0])
                    })
                    .map(([gradeName, subjectList]) => {
                      const gradeKey = `${centerName}__${gradeName}`
                      const isExpanded = !!expandedGrades[gradeKey]

                      return (
                        <div key={gradeName} style={{
                          background: 'rgba(37, 3, 69, 0.24)',
                          borderRadius: '14px',
                          padding: '1.1rem 1.5rem',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          transition: 'all 0.2s ease'
                        }}>
                          {/* Collapsible Grade Subheader */}
                          <div
                            onClick={() => toggleGrade(gradeKey)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              userSelect: 'none',
                              padding: '0.2rem 0'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '1.1rem' }}>🎓</span>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#c6beffff' }}>
                                {gradeName}
                              </h3>
                              <span style={{
                                fontSize: '0.78rem',
                                background: 'rgba(108, 92, 231, 0.2)',
                                color: '#c6beffff',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '999px',
                                fontWeight: 600
                              }}>
                                {subjectList.length} {subjectList.length === 1 ? t('professorCourses.courseSingle') : t('professorCourses.coursePlural')}
                              </span>
                            </div>

                            <div style={{
                              fontSize: '0.85rem',
                              color: '#c6beffff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontWeight: 500,
                              opacity: 0.9
                            }}>
                              <span style={{ fontSize: '0.8rem' }}>{isExpanded ? t('professorCourses.hide') : t('professorCourses.viewCourses')}</span>
                              <span style={{
                                display: 'inline-block',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.25s ease',
                                fontSize: '0.75rem'
                              }}>
                                ▼
                              </span>
                            </div>
                          </div>

                          {/* Subjects Grid for this Grade */}
                          {isExpanded && (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                              gap: '1rem',
                              marginTop: '1.25rem',
                              paddingTop: '0.5rem',
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                              {subjectList.map((course) => (
                                <div
                                  key={course.id}
                                  onClick={() => navigate(`/professor/assignments/courses/${course.id}/content`)}
                                  style={{
                                    cursor: 'pointer',
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                    transition: 'all 0.2s ease',
                                    border: '1px solid rgba(31, 41, 90, 0.08)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px)'
                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(108, 92, 231, 0.12)'
                                    e.currentTarget.style.borderColor = 'rgba(108, 92, 231, 0.4)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
                                    e.currentTarget.style.borderColor = 'rgba(31, 41, 90, 0.08)'
                                  }}
                                >
                                  <div>
                                    <h4 style={{ color: '#1f295a', margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.3 }}>
                                      {t(`dynamicSubjects.${course.title}`, { defaultValue: course.title })}
                                    </h4>
                                    {course.campoFormativo && (
                                      <div style={{
                                        fontSize: '0.78rem',
                                        color: '#6c5ce7',
                                        background: 'rgba(108, 92, 231, 0.08)',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '6px',
                                        display: 'inline-block',
                                        marginTop: '0.25rem',
                                        fontWeight: 500
                                      }}>
                                        {course.campoFormativo}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{
                                    marginTop: '1rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid rgba(31, 41, 90, 0.06)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.82rem',
                                    color: '#6c5ce7',
                                    fontWeight: 600
                                  }}>
                                    <span>{t('professorCourses.viewContent')}</span>
                                    <span>→</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default ProfessorAssignmentCoursesScreen
