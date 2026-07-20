import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { getCourseModules, CourseModule } from '../lib/adminApi'
import group2Img from '../assets/Group_2.png'
import contenidoMateriaImg from '../assets/contenidomateria.png'
import pdfImg from '../assets/1pdf.png'
import entrarVrImg from '../assets/entrarasalavr.png'

interface ModuleDraftScreenProps {
  user: User
}

const ModuleDraftScreen: React.FC<ModuleDraftScreenProps> = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const [moduleData, setModuleData] = useState<CourseModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  useEffect(() => {
    if (courseId && moduleId) {
      loadModuleItems()
    }
  }, [courseId, moduleId])

  const loadModuleItems = async () => {
    try {
      setLoading(true)
      const modules = await getCourseModules(courseId!)
      const targetModule = modules.find(m => m.id === moduleId)

      if (!targetModule) {
        throw new Error('Módulo no encontrado')
      }

      setModuleData(targetModule)
    } catch (err: any) {
      setError(err.message || 'Error al cargar los ítems del módulo')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1e1e2e' }}>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Cargando contenido...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Lado Izquierdo */}
      <div
        style={{
          flex: 1,
          backgroundImage: `url(${group2Img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Lado Derecho */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#7334EF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4rem 2rem',
          position: 'relative'
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        >
          ← Regresar
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem', marginTop: '4rem' }}>
          <img
            src={contenidoMateriaImg}
            alt="Contenido Materia"
            style={{ width: '250px', maxWidth: '100%', objectFit: 'contain' }}
          />

          {moduleData?.items && moduleData.items.filter(item => item.type === 'pdf').length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateRows: 'repeat(3, auto)',
              gridAutoFlow: 'column',
              gap: '2rem',
              alignItems: 'center',
              justifyItems: 'center'
            }}>
              {moduleData.items.filter(item => item.type === 'pdf').map((pdfItem) => (
                <img
                  key={pdfItem.id}
                  src={pdfImg}
                  alt={pdfItem.title || "Contenido PDF"}
                  onClick={() => {
                    if (pdfItem.content_url) {
                      const readItems = JSON.parse(localStorage.getItem('readItems') || '{}');
                      readItems[pdfItem.id] = true;
                      localStorage.setItem('readItems', JSON.stringify(readItems));
                      
                      window.open(pdfItem.content_url, '_blank');
                    } else {
                      alert('Este PDF no tiene una URL configurada aún.');
                    }
                  }}
                  style={{
                    width: '200px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  title={pdfItem.title}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', textAlign: 'center' }}>
              No hay PDFs asignados.
            </p>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <img
            src={entrarVrImg}
            alt="Entrar a sala VR"
            style={{
              width: '350px',
              maxWidth: '100%',
              objectFit: 'contain',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        </div>
      </div>
    </div>
  )
}

export default ModuleDraftScreen
