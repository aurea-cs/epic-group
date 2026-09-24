import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { getProfessorCourses } from '../lib/api'

// Import assets
import planetasolito1 from '../assets/planetasolito1.png';
import planetasolito2 from '../assets/planetasolito2.png';
import planetasolito3 from '../assets/planetasolito3.png';
import planetasolito4 from '../assets/planetasolito4.png';
import planetasolito5 from '../assets/planetasolito5.png';
import image30 from '../assets/image30.png';

// Import CSS
import './PlanetDetailScreen.css'

const PLANET_ASSETS = [
  planetasolito1, planetasolito2, planetasolito3, planetasolito4, planetasolito5
];

interface ProfessorAssignmentCoursesScreenProps {
  user: User
}

interface Course {
  id: string
  title: string
  title_en?: string
  description: string
  centerName: string
  gradeName?: string
  level?: number | string | null
  campoFormativo?: string
}

const ProfessorAssignmentCoursesScreen: React.FC<ProfessorAssignmentCoursesScreenProps> = ({ user }) => {
  const { t, i18n } = useTranslation()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [planetPositions, setPlanetPositions] = useState<{x: number, y: number}[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate()

  useEffect(() => {
    const updatePositions = () => {
      if (!gridRef.current) return;
      
      // Filter out the SVG from the children
      const items = Array.from(gridRef.current.children).filter(el => el.tagName.toLowerCase() !== 'svg') as HTMLElement[];
      const positions = items.map(item => ({
        x: item.offsetLeft + item.offsetWidth / 2,
        y: item.offsetTop + item.offsetHeight / 2
      }));
      setPlanetPositions(positions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    const timeoutId = setTimeout(updatePositions, 150); // allow layout to settle
    
    return () => {
      window.removeEventListener('resize', updatePositions);
      clearTimeout(timeoutId);
    };
  }, [courses, selectedLevel, selectedGrade]);

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
    if (user?.id) fetchCourses()
  }, [user])

  const handleCourseClick = (courseId: string) => {
    navigate(`/professor/assignments/courses/${courseId}/content`)
  }

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div></div>
  }

  const uniqueLevels = ['All', ...Array.from(new Set(courses.map(c => String(c.level || '')))).filter(val => val !== '')];
  const uniqueGrades = ['All', ...Array.from(new Set(courses.map(c => c.gradeName || ''))).filter(val => val !== '')];

  const filteredCourses = courses.filter(c => {
    const matchLevel = selectedLevel === 'All' || String(c.level || '') === selectedLevel;
    const matchGrade = selectedGrade === 'All' || (c.gradeName || '') === selectedGrade;
    return matchLevel && matchGrade;
  });

  const numCourses = filteredCourses.length;

  return (
    <div className="planet-detail-screen" style={{ overflowY: 'auto', justifyContent: 'flex-start' }}>
      <div className="pd-header" style={{ position: 'sticky', top: 0, height: 'auto', padding: '20px 0', background: 'linear-gradient(to bottom, rgba(11,12,16,1) 40%, rgba(11,12,16,0) 100%)', zIndex: 20 }}>
        <h1 className="pd-title">{t('professorCourses.myCourses', { defaultValue: 'Mis Cursos' })}</h1>
        
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', justifyContent: 'center', zIndex: 10, position: 'relative', pointerEvents: 'auto' }}>
          <select 
            value={selectedLevel} 
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {uniqueLevels.map(lvl => (
              <option key={lvl} value={lvl} style={{ color: '#000' }}>
                {lvl === 'All' ? t('filters.allLevels', { defaultValue: 'Todos los niveles' }) : lvl}
              </option>
            ))}
          </select>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {uniqueGrades.map(grd => (
              <option key={grd} value={grd} style={{ color: '#000' }}>
                {grd === 'All' ? t('filters.allGrades', { defaultValue: 'Todos los grados' }) : grd}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fondo espacial */}
      <div className="space-background">
        <div className="stars"></div>
        <div className="nebula"></div>
      </div>

      {numCourses === 0 ? (
        <div style={{ zIndex: 10, color: 'white', textAlign: 'center', marginTop: '100px' }}>
          <h2>{t('professorCourses.noCoursesTitle')}</h2>
          <p>{t('professorCourses.noCoursesDesc')}</p>
        </div>
      ) : (
        <div ref={gridRef} className="courses-grid" style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '70px 30px', 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '60px 40px 120px', 
          zIndex: 10, 
          position: 'relative',
          width: '100%'
        }}>
          
          {planetPositions.length > 1 && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1 }}>
              <path
                d={`M ${planetPositions[0].x},${planetPositions[0].y} ` + planetPositions.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(255, 255, 0, 0.6)"
                strokeWidth="2"
                strokeDasharray="6, 6"
              />
            </svg>
          )}

          {filteredCourses.map((course, i) => {
            const asset = PLANET_ASSETS[i % PLANET_ASSETS.length];
            const baseTitle = i18n.language.startsWith('en') && course.title_en ? course.title_en : course.title;
            const displayTitle = t(`dynamicSubjects.${course.title}`, { defaultValue: baseTitle });

            return (
              <div
                key={course.id}
                className="course-planet-item"
                onClick={() => handleCourseClick(course.id)}
                style={{ 
                  position: 'relative', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  width: '100px', 
                  transition: 'transform 0.3s' 
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img src={asset} alt={`Curso ${course.id}`} style={{ width: '100%', height: '65px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))' }} />
                <div style={{ 
                  marginTop: '10px', 
                  color: 'white', 
                  background: 'rgba(0, 0, 0, 0.7)', 
                  padding: '4px 8px', 
                  borderRadius: '8px', 
                  fontSize: '0.75rem', 
                  whiteSpace: 'normal', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '140px',
                  lineHeight: '1.2'
                }}>
                  {displayTitle}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default ProfessorAssignmentCoursesScreen
