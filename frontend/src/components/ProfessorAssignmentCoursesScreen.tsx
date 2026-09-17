import React, { useEffect, useState } from 'react'
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
  description: string
  centerName: string
  gradeName?: string
  level?: number | string | null
  campoFormativo?: string
}

const ProfessorAssignmentCoursesScreen: React.FC<ProfessorAssignmentCoursesScreenProps> = ({ user }) => {
  const { t } = useTranslation()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(250);
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 480) setRadius(120);
      else if (window.innerWidth < 768) setRadius(150);
      else if (window.innerWidth < 1024) setRadius(200);
      else setRadius(250);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const numCourses = courses.length;

  return (
    <div className="planet-detail-screen">
      <div className="pd-header">
        <h1 className="pd-title">{t('professorCourses.myCourses', { defaultValue: 'Mis Cursos' })}</h1>
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
        <div className="solar-system">
          {/* Planeta central */}
          <div className="central-planet">
            <img src={image30} alt="Planeta Central" />
            <div className="central-title">{t('professorCourses.myCourses', { defaultValue: 'Mis Cursos' })}</div>
          </div>

          {/* Planetas orbitando (Cursos) */}
          {courses.map((course, i) => {
            const angle = (i / numCourses) * (2 * Math.PI);
            const asset = PLANET_ASSETS[i % PLANET_ASSETS.length];
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const displayTitle = t(`dynamicSubjects.${course.title}`, { defaultValue: course.title });

            return (
              <div
                key={course.id}
                className="orbiting-planet"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`
                }}
                onClick={() => handleCourseClick(course.id)}
              >
                <img src={asset} alt={`Curso ${course.id}`} />
                <div className="sub-title" style={{ whiteSpace: 'nowrap' }}>
                  {displayTitle}
                </div>
              </div>
            );
          })}

          {/* Anillo orbital */}
          <div className="orbit-ring" style={{ width: radius * 2, height: radius * 2 }}></div>
        </div>
      )}
    </div>
  )
}

export default ProfessorAssignmentCoursesScreen
