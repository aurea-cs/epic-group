import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getStudentReadItems } from '../lib/api'
import './AssignmentsScreen.css'
import { getUserRole } from '../utils/getUserRole'
import { useVrCode } from '../hooks/useVrCode'

import planetasolito1 from '../assets/planetasolito1.png'
import planetasolito2 from '../assets/planetasolito2.png'
import planetasolito3 from '../assets/planetasolito3.png'
import planetasolito4 from '../assets/planetasolito4.png'
import planetasolito5 from '../assets/planetasolito5.png'

interface AssignmentsScreenProps {
  user: User
}

interface Planet {
  id: string
  number: number
  stars: number
  completed: boolean
  image: string
  x: number
  y: number
  title: string
  courseData: any
}

// ---- Layout tuning constants -------------------------------------------
// Change these to reshape the map without touching any logic below.
const PLANET_SPACING_X = 220   // px between planet centers, horizontally
const EDGE_PADDING_X = 160     // px of empty space before first / after last planet
const WAVE_AMPLITUDE = 140     // px the path swings above/below the vertical center
const WAVE_FREQUENCY = 0.8     // higher = more twists per planet
const FALLBACK_TRACK_HEIGHT = 500 // used only before the track has been measured
// --------------------------------------------------------------------------

const getPlanetXY = (index: number, trackHeight: number) => {
  const x = EDGE_PADDING_X + index * PLANET_SPACING_X
  const centerY = trackHeight / 2
  const y = centerY + Math.sin(index * WAVE_FREQUENCY) * WAVE_AMPLITUDE
  return { x, y }
}

const getContentWidth = (count: number, viewportWidth: number) => {
  if (count === 0) return viewportWidth
  const naturalWidth = EDGE_PADDING_X * 2 + (count - 1) * PLANET_SPACING_X
  return Math.max(viewportWidth, naturalWidth)
}

// Builds a single smooth path through a list of points using quadratic
// Bézier segments anchored at the midpoints between consecutive planets.
// Because it's generated from the same {x, y} data the planets use, the
// line always matches the planets — no more hand-tuned paths going stale.
const buildConnectionPath = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`

  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const midX = (prev.x + curr.x) / 2
    const midY = (prev.y + curr.y) / 2
    d += ` Q ${prev.x},${prev.y} ${midX},${midY}`
  }
  const last = points[points.length - 1]
  d += ` T ${last.x},${last.y}`
  return d
}

const AssignmentsScreen: React.FC<AssignmentsScreenProps> = ({ user }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userRole = getUserRole(user)
  const { vrCode, openVrCode } = useVrCode(user)

  const [coursePlanets, setCoursePlanets] = useState<Planet[]>([])
  const [loading, setLoading] = useState(true)

  const trackRef = useRef<HTMLDivElement>(null)
  const [trackHeight, setTrackHeight] = useState(FALLBACK_TRACK_HEIGHT)
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  // Measure the scroll track so planet Y positions and the SVG height are
  // based on real available space instead of a guessed constant.
  useLayoutEffect(() => {
    const measure = () => {
      if (trackRef.current) {
        setTrackHeight(trackRef.current.clientHeight)
      }
      setViewportWidth(window.innerWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchCourses = async () => {
      try {
        setLoading(true)
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const endpoint = userRole === 'student'
          ? `${baseUrl}/api/students/${user.id}/courses?include=progress`
          : `${baseUrl}/api/professors/${user.id}/courses?include=progress`;

        const res = await fetch(endpoint, { signal: controller.signal })
        if (!res.ok) throw new Error('Error fetching courses')
        const data = await res.json()

        let coursesToRender = data;
        // Mock fallback if no courses are assigned so the UI is still visible
        if (!coursesToRender || coursesToRender.length === 0) {
          coursesToRender = [
            { id: 'mock1', title: t('assignments.mockMath'), name: t('assignments.mockMath') },
            { id: 'mock2', title: t('assignments.mockPhysics'), name: t('assignments.mockPhysics') },
            { id: 'mock3', title: t('assignments.mockChemistry'), name: t('assignments.mockChemistry') },
          ];
        }

        const images = [planetasolito1, planetasolito2, planetasolito3, planetasolito4, planetasolito5]
        const currentTrackHeight = trackRef.current?.clientHeight || FALLBACK_TRACK_HEIGHT

        const hasBatchProgress = coursesToRender.some((c: any) => c.stars !== undefined)

        let planets: Planet[] = []

        if (hasBatchProgress) {
          // Direct 1-call batch path
          planets = coursesToRender.map((course: any, index: number) => {
            const { x, y } = getPlanetXY(index, currentTrackHeight)
            return {
              id: course.id,
              number: index + 1,
              stars: course.stars || 0,
              completed: !!course.completed,
              image: images[index % images.length],
              x,
              y,
              title: course.title || course.name,
              courseData: course
            }
          })
        } else {
          // Fallback path: parallelized module fetches
          let readItemsSet = new Set<string>();
          if (userRole === 'student') {
            try {
              const items = await getStudentReadItems(user.id);
              readItemsSet = new Set(items);
            } catch (e) {
              console.error('Error fetching read items:', e);
            }
          }

          const modulePromises = coursesToRender.map(async (course: any) => {
            try {
              const modRes = await fetch(`${baseUrl}/api/subjects/${course.id}/modules`, { signal: controller.signal })
              if (modRes.ok) {
                return await modRes.json()
              }
            } catch (err: any) {
              if (err.name !== 'AbortError') {
                console.error(`Error fetching modules for course ${course.id}:`, err)
              }
            }
            return []
          })

          const allModulesList = await Promise.all(modulePromises)

          planets = coursesToRender.map((course: any, index: number) => {
            const modules = allModulesList[index] || []
            let totalItems = 0
            let completedItems = 0

            modules.forEach((module: any) => {
              const items = (module.items || []).filter((item: any) => item.type === 'pdf')
              totalItems += items.length

              items.forEach((item: any) => {
                if (item.is_completed || readItemsSet.has(item.id)) {
                  completedItems++
                }
              })
            })

            let stars = 0
            let completed = false
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

            const { x, y } = getPlanetXY(index, currentTrackHeight)

            return {
              id: course.id,
              number: index + 1,
              stars,
              completed,
              image: images[index % images.length],
              x,
              y,
              title: course.title || course.name,
              courseData: course
            }
          })
        }

        if (!controller.signal.aborted) {
          setCoursePlanets(planets)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Error fetching courses:", err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchCourses()

    return () => {
      controller.abort()
    }
  }, [user.id, userRole, trackHeight])

  const contentWidth = useMemo(
    () => getContentWidth(coursePlanets.length, viewportWidth),
    [coursePlanets.length, viewportWidth]
  )

  const pathD = useMemo(
    () => buildConnectionPath(coursePlanets.map(p => ({ x: p.x, y: p.y }))),
    [coursePlanets]
  )

  // Let desktop users scroll the map horizontally with a normal mouse wheel,
  // not just via shift+scroll or a trackpad.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Once planets load, scroll so the first incomplete planet is roughly
  // centered — returning students land near their progress, not at the
  // far-left edge of a long horizontal map.
  useEffect(() => {
    if (loading || coursePlanets.length === 0 || !trackRef.current) return
    const target = coursePlanets.find(p => !p.completed) || coursePlanets[0]
    const el = trackRef.current
    const scrollTo = Math.max(0, target.x - el.clientWidth / 2)
    el.scrollTo({ left: scrollTo, behavior: 'auto' })
  }, [loading, coursePlanets])

  const handlePlanetClick = useCallback((course: any) => {
    const rawTitle = course.title || course.name;
    const courseTitle = t(`dynamicSubjects.${rawTitle}`, { defaultValue: rawTitle })
    navigate(`/course/${course.id}/planet/1`, { state: { title: courseTitle, courseTitle: courseTitle } })
  }, [navigate, t])

  const handleStartCourse = useCallback(() => {
    if (coursePlanets.length > 0) {
      handlePlanetClick(coursePlanets[0].courseData)
    }
  }, [coursePlanets, handlePlanetClick])

  return (
    <div className="assignments-screen">
      <div className="map-container">
        <button
          onClick={() => navigate('/dashboard')}
          className="assignments-back-button"
        >
          {t('assignments.backHome')}
        </button>

        <div className="course-map-header">
          <h1>{t('assignments.title')}</h1>
          <p>{t('assignments.subtitle')}</p>
        </div>

        {/* Fondo espacial con estrellas — fixed, does not scroll */}
        <div className="space-background">
          <div className="stars"></div>
          <div className="nebula"></div>
        </div>

        {/* Terreno alienígena — fixed, does not scroll */}

        {/* Pista horizontal desplazable */}
        <div className="map-scroll-track" ref={trackRef}>
          <div className="map-content" style={{ width: contentWidth }}>

            {/* Líneas de conexión, generadas a partir de las posiciones reales */}
            <svg
              className="connection-lines"
              width={contentWidth}
              height={trackHeight}
              viewBox={`0 0 ${contentWidth} ${trackHeight}`}
              preserveAspectRatio="none"
            >
              <path
                d={pathD}
                stroke="#FFC000"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4,4"
                className="main-path"
              />
              <path
                d={pathD}
                stroke="#00BFFF"
                strokeWidth="1"
                fill="none"
                strokeDasharray="2,2"
                className="secondary-path"
              />
            </svg>

            {/* Skeleton o Planetas */}
            {loading ? (
              <>
                {[0, 1, 2].map((i) => {
                  const { x, y } = getPlanetXY(i, trackHeight)
                  return (
                    <div
                      key={i}
                      className="planet-container planet-skeleton"
                      style={{ left: x, top: y }}
                    >
                      <div className="planet-frame skeleton-frame">
                        <div className="planet-skeleton-circle"></div>
                        <div className="planet-skeleton-title"></div>
                        <div className="planet-skeleton-stars"></div>
                      </div>
                    </div>
                  )
                })}
              </>
            ) : (
              coursePlanets.map((planet) => (
                <div
                  key={planet.id}
                  className={`planet-container ${planet.completed ? 'completed' : 'locked'}`}
                  style={{ left: planet.x, top: planet.y }}
                  onClick={() => handlePlanetClick(planet.courseData)}
                >
                  <div className="planet-frame">
                    {/* Imagen del planeta */}
                    <img
                      src={planet.image}
                      alt={`${t('assignments.planetAlt')} ${planet.number}`}
                      className="planet-image"
                    />

                    {/* Título debajo del planeta */}
                    <div className="course-planet-title">
                      {t(`dynamicSubjects.${planet.title}`, { defaultValue: planet.title })}
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
              ))
            )}
          </div>
        </div>

        {/* Cohete — anchored to the viewport, stays put while the map scrolls */}
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

        {/* Botón START — anchored to the viewport */}
        <div className="start-button-container">
          <button
            className="start-button"
            onClick={vrCode ? openVrCode : handleStartCourse}
          >
            {t('assignments.campusVr')}
          </button>
        </div>

      </div>
    </div>
  )
}

export default AssignmentsScreen