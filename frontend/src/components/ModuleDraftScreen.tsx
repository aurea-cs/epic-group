import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { getCourseModules, CourseModule, ModuleItem } from '../lib/adminApi'
import './DashboardScreen.css'

interface ModuleDraftScreenProps {
  user: User
}

const ModuleDraftScreen: React.FC<ModuleDraftScreenProps> = ({ user }) => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const [moduleData, setModuleData] = useState<CourseModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const getIconForType = (type: string) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'video': return '🎥'
      case 'link': return '🔗'
      case 'assignment': return '📝'
      default: return '📦'
    }
  }

  if (loading) {
    return (
      <div className="dashboard-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1e1e2e' }}>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Cargando contenido...</p>
      </div>
    )
  }

  if (error || !moduleData) {
    return (
      <div className="dashboard-screen" style={{ padding: '2rem', textAlign: 'center', background: '#1e1e2e', minHeight: '100vh' }}>
        <h2 style={{ color: 'white' }}>❌ Error</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>{error || 'No se pudo cargar el contenido'}</p>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: '#6c5ce7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginTop: '1rem' }}
        >
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-screen" style={{ background: '#1a1a2e', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', color: '#a29bfe', border: '1px solid #a29bfe', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', marginBottom: '2rem' }}
        >
          ← Regresar
        </button>

        <h1 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          {moduleData.title}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '3rem' }}>
          Pantalla de borrador (Vista de contenido del tema)
        </p>

        {moduleData.items && moduleData.items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {moduleData.items.map((item: ModuleItem) => (
              <div key={item.id} style={{
                background: '#2d2d44',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              onClick={() => {
                if (item.content_url) {
                  window.open(item.content_url, '_blank')
                } else {
                  alert('Este contenido no tiene una URL configurada aún.')
                }
              }}
              >
                <div style={{ 
                  fontSize: '2rem',
                  background: 'rgba(108, 92, 231, 0.2)',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px'
                }}>
                  {getIconForType(item.type)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{item.title}</h3>
                  {item.description && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>
                      {item.description}
                    </p>
                  )}
                </div>
                
                <div style={{ color: '#a29bfe', fontSize: '1.5rem' }}>
                  →
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '1.1rem' }}>
              Este tema aún no tiene contenido asignado.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModuleDraftScreen
