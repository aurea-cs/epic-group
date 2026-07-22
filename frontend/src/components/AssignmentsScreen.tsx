import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import './AssignmentsScreen.css'
import { getUserRole } from '../utils/getUserRole'

import planetasolito1 from '../assets/planetasolito1.png'
import planetasolito2 from '../assets/planetasolito2.png'
import planetasolito3 from '../assets/planetasolito3.png'
import planetasolito4 from '../assets/planetasolito4.png'
import planetasolito5 from '../assets/planetasolito5.png'

interface AssignmentsScreenProps {
  user: User
}

const AssignmentsScreen: React.FC<AssignmentsScreenProps> = ({ user }) => {
  const navigate = useNavigate()
  const userRole = getUserRole(user)

  const [coursePlanets, setCoursePlanets] = useState<any[]>([])

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const endpoint = userRole === 'student' 
          ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/students/${user.id}/courses`
          : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/professors/${user.id}/courses`;
          
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error('Error fetching courses')
        const data = await res.json()
        
        let coursesToRender = data;
        // Mock fallback if no courses are assigned so the UI is still visible
        if (!coursesToRender || coursesToRender.length === 0) {
          coursesToRender = [
            { id: 'mock1', title: 'Matemáticas Avanzadas', name: 'Matemáticas Avanzadas' },
            { id: 'mock2', title: 'Física Cuántica', name: 'Física Cuántica' },
            { id: 'mock3', title: 'Química Orgánica', name: 'Química Orgánica' },
          ];
        }

        // Define some planet images and positions
        const images = [planetasolito1, planetasolito2, planetasolito3, planetasolito4, planetasolito5]
        
        const getPlanetPosition = (index: number) => {
          const predefined = [
            { top: '80%', left: '20%' },
            { top: '60%', left: '50%' },
            { top: '35%', left: '30%' },
            { top: '20%', left: '70%' },
            { top: '10%', left: '40%' },
            { top: '75%', left: '75%' },
            { top: '50%', left: '20%' },
            { top: '45%', left: '80%' },
            { top: '85%', left: '50%' },
            { top: '25%', left: '15%' },
            { top: '65%', left: '85%' },
            { top: '15%', left: '85%' },
            { top: '90%', left: '85%' },
            { top: '40%', left: '55%' },
            { top: '15%', left: '20%' }
          ];
          
          if (index < predefined.length) {
            return predefined[index];
          }
          
          return {
            top: `${15 + (index * 13) % 70}%`,
            left: `${15 + (index * 17) % 70}%`
          };
        }

        // Process courses sequentially to avoid overwhelming the backend with simultaneous requests
        const planets = []
        for (let index = 0; index < coursesToRender.length; index++) {
          const course = coursesToRender[index]
          let stars = 0
          let completed = false
          
          try {
            // Fetch modules for the course to calculate progress
            const modRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/subjects/${course.id}/modules`)
            if (modRes.ok) {
              const modules = await modRes.json()
              let totalItems = 0
              let completedItems = 0
              
              const readItems = JSON.parse(localStorage.getItem('readItems') || '{}')
              
              modules.forEach((module: any) => {
                const items = (module.items || []).filter((item: any) => item.type === 'pdf')
                totalItems += items.length
                
                items.forEach((item: any) => {
                  if (item.is_completed || readItems[item.id]) {
                    completedItems++
                  }
                })
              })
              
              if (totalItems > 0) {
                const progress = completedItems / totalItems
                if (progress === 1) {
                  stars = 3
                } else if (progress >= 0.5) {
                  stars = 2
                } else if (progress > 0) {
                  stars = 1
                }
                completed = stars === 3
              }
            }
          } catch (err) {
            console.error(`Error fetching modules for course ${course.id}:`, err)
          }

          planets.push({
            id: course.id,
            number: index + 1,
            stars: stars,
            completed: completed,
            image: images[index % images.length],
            position: getPlanetPosition(index),
            title: course.title || course.name,
            courseData: course
          })
        }

        setCoursePlanets(planets)
      } catch (err) {
        console.error("Error fetching courses:", err)
      }
    }
    fetchCourses()
  }, [user.id, userRole])

  const handlePlanetClick = (course: any) => {
    const courseTitle = course.title || course.name;
    navigate(`/course/${course.id}/planet/1`, { state: { title: courseTitle, courseTitle: courseTitle } })
  }

  const handleStartCourse = () => {
    if (coursePlanets.length > 0) {
      handlePlanetClick(coursePlanets[0].courseData)
    }
  }

  return (
    <div className="assignments-screen">
      <div className="map-container">
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 100,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            backdropFilter: 'blur(5px)',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          ← Volver
        </button>

        <div className="course-map-header">
          <h1>Tus Cursos Asignados</h1>
          <p>Selecciona un planeta para ver los módulos del curso.</p>
        </div>

        {/* Fondo espacial con estrellas */}
        <div className="space-background">
          <div className="stars"></div>
          <div className="nebula"></div>
        </div>

        {/* Terreno alienígena */}
        <div className="alien-terrain"></div>

        {/* Líneas de conexión entre planetas */}
        <svg className="connection-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M82,75 Q68,65 68,50 Q48,45 48,65 Q22,55 12,55 Q12,35 12,35 Q32,25 32,20 Q12,15 12,15"
            stroke="#FFC000"
            strokeWidth="0.5"
            fill="none"
            strokeDasharray="2,2"
            className="main-path"
          />
          <path
            d="M82,75 Q55,70 48,65 Q35,60 22,55"
            stroke="#00BFFF"
            strokeWidth="0.3"
            fill="none"
            strokeDasharray="1,1"
            className="secondary-path"
          />
        </svg>

        {/* Planetas */}
        {coursePlanets.map((planet) => (
          <div
            key={planet.id}
            className={`planet-container ${planet.completed ? 'completed' : 'locked'}`}
            style={planet.position}
            onClick={() => handlePlanetClick(planet.courseData)}
          >
            <div className="planet-frame">
              {/* Imagen del planeta */}
              <img
                src={planet.image}
                alt={`Planeta ${planet.number}`}
                className="planet-image"
              />

              {/* Título debajo del planeta */}
              <div className="course-planet-title">
                {planet.title}
              </div>

              {/* Estrellas */}
              <div className="planet-stars">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className={`star ${index < planet.stars ? 'filled' : 'empty'}`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Cohete */}
        <div className="rocket-container">
          <div className="rocket">
            <div className="rocket-nose"></div>
            <div className="rocket-body">
              <div className="rocket-window"></div>
              <div className="rocket-bands"></div>
            </div>
            <div className="rocket-fins"></div>
            <div className="rocket-engine">
              <div className="engine-glow"></div>
            </div>
          </div>
        </div>

        {/* Botón START */}
        <div className="start-button-container">
          <button className="start-button" onClick={handleStartCourse}>
            START
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssignmentsScreen
