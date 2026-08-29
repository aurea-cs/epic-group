import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { getCourseModules, getModuleVrCode, CourseModule, ModuleItem, VrCodeEntry } from '../lib/adminApi'
import { getUserRole } from '../utils/getUserRole'
import { Book, Gamepad2, FileText, ArrowRight, Folder, Play } from 'lucide-react'
import { markItemAsRead } from '../lib/api'
import bannerImg from '../assets/banner.png'

import ciberImg from '../assets/ciber.png'
import dentrodespaceshipImg from '../assets/dentrodespaceship.png'
import './ModuleDraftScreen.css'

interface ModuleDraftScreenProps {
  user: User
}

const ContentCard = ({ item, index, onViewPdf, userId }: { item: ModuleItem, index: number, onViewPdf: (url: string, itemId: string) => void, userId: string }) => {
  return (
    <div 
      className="hoverable-card"
      onClick={() => {
            if (!item.content_url) {
              alert('Este contenido no tiene una URL configurada aún.');
              return;
            }
            const readItems = JSON.parse(localStorage.getItem('readItems') || '{}');
            readItems[item.id] = true;
            localStorage.setItem('readItems', JSON.stringify(readItems));
            
            markItemAsRead(userId, item.id).catch(console.error);
            
            if (item.type === 'pdf') {
              onViewPdf(item.content_url, item.id);
            } else {
              window.open(item.content_url, '_blank', 'noopener,noreferrer');
            }
          }}
      style={{
      backgroundColor: '#25164E',
      borderRadius: '16px',
      padding: '24px',
      width: '320px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img
          src={item.image_url}
          alt={item.title}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '6px solid #432E7E'
          }}
        />
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          {item.title}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
          {item.description || "En este módulo, explorarás temas como la interacción inmersiva, la creación de entornos virtuales y el impacto de la tecnología en la creatividad."}
        </p>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button
          style={{
            width: '100%',
            backgroundColor: 'white',
            color: '#25164E',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Cuaderno - Tema {index + 1} <FileText size={16} />
        </button>
      </div>
    </div>
  )
}


const VrCard = ({ vrEntry }: { vrEntry: VrCodeEntry }) => {
  const vrUrl = vrEntry.code

  return (
    <div 
      className="hoverable-card"
      onClick={() => window.open(vrUrl, '_blank', 'noopener,noreferrer')}
      style={{
      backgroundColor: '#25164E',
      borderRadius: '16px',
      padding: '0',
      width: '320px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <img
        src={vrEntry.image_url || dentrodespaceshipImg}
        alt="VR Room"
        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
      />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
            {vrEntry.title || "Sala VR"}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
            {vrEntry.description || "Explora un mundo inmersivo donde la realidad virtual te transporta a nuevas dimensiones."}
          </p>
          <div style={{
            marginTop: '10px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Plataforma VR
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
          <button
            style={{
            flex: 1,
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            padding: '10px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s'
          }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#25164E';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'white';
            }}
          >
            Ingresar <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

const ResourceCard = ({ item, onViewPdf }: { item: ModuleItem, index: number, onViewPdf: (url: string, itemId: string) => void }) => {
  const handleClick = () => {
    if (item.content_url) {
      if (item.type === 'video') { window.open(item.content_url, '_blank') }
      else {
        onViewPdf(item.content_url!, item.id)
      }
    }
  }

  return (
    <div 
      className="hoverable-card"
      onClick={handleClick}
      style={{
      backgroundColor: '#25164E',
      borderRadius: '16px',
      padding: '24px',
      width: '320px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img
          src={item.image_url || ciberImg}
          alt={item.title}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '6px solid #1E40AF'
          }}
        />
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          {item.title}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
          {item.description || "Aquí puedes acceder y descargar información adicional como PDFs, presentaciones y otros materiales que complementan tu aprendizaje."}
        </p>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {item.content_url && (
          <button
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: '#25164E',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            {item.type === 'video' ? (
              <>Ver Video <Play size={16} fill="currentColor" /></>
            ) : (
              <>Ver Recurso </>
            )}
          </button>
        )}
        {!item.content_url && (
          <button
            disabled
            style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.5)',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              cursor: 'not-allowed',
            }}
          >
            Sin URL configurada
          </button>
        )}
      </div>
    </div>
  )
}

const ModuleDraftScreen: React.FC<ModuleDraftScreenProps> = ({ user }) => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const [moduleData, setModuleData] = useState<CourseModule | null>(null)
  const [vrEntries, setVrEntries] = useState<VrCodeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  const userRole = getUserRole(user)

  const handleViewPdf = (url: string, itemId: string) => {
    navigate(
      `/course/${courseId}/module/${moduleId}/pdf?url=${encodeURIComponent(url)}&itemId=${itemId}`
    )
  }

  useEffect(() => {
    if (courseId && moduleId) {
      loadData()
    }
  }, [courseId, moduleId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [modules, vr] = await Promise.all([
        getCourseModules(courseId!),
        getModuleVrCode(moduleId!)
      ])

      const targetModule = modules.find(m => m.id === moduleId)
      if (!targetModule) {
        throw new Error('Módulo no encontrado')
      }

      setModuleData(targetModule)
      setVrEntries(vr)
    } catch (err: any) {
      setError(err.message || 'Error al cargar los ítems del módulo')
    } finally {
      setLoading(false)
    }
  }

  // Filter contenidos: items with show_student === true
  const contenidos = (moduleData?.items || []).filter(item => item.show_student === true)

  // Filter recursos: items with show_teacher === true
  const recursos = (moduleData?.items || []).filter(item => item.show_teacher === true)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#7334EF' }}>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Cargando contenido...</p>
      </div>
    )
  }

  return (
    <div className="module-draft-container">
      <div className="module-draft-inner">
        {/* Lado Izquierdo */}
        <div
          className="module-draft-left-panel"
          style={{ backgroundImage: `url(${bannerImg})` }}
        />

        {/* Lado Derecho */}
        <div className="module-draft-right-panel">
        <button
          onClick={() => navigate(-1)}
          className="module-draft-back-button"
        >
          ← Regresar
        </button>

        <h1 className="module-draft-title">
          {moduleData?.title ? `Módulo - ${moduleData.title}` : 'Módulo 1 - Nombre del Módulo'}
        </h1>

        <p style={{ color: 'white', fontSize: '1rem', lineHeight: '1.6', opacity: 0.9, marginBottom: '3rem', maxWidth: '1000px' }}>
          Este módulo de aprendizaje está diseñado para sumergirte en un entorno interactivo, donde
          podrás explorar conceptos clave a través de actividades prácticas y recursos multimedia. A
          medida que avances, experimentarás un enfoque dinámico que fomenta la colaboración y el
          pensamiento crítico, asegurando que cada lección sea memorable y efectiva.
        </p>

        {/* Contenidos Section */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
            <Book size={24} color="#FCEE50" /> CONTENIDOS
          </h2>
          <div style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            paddingTop: '12px',
            paddingBottom: '2rem',
            paddingLeft: '8px',
            paddingRight: '8px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.3) transparent'
          }}>
            {contenidos.length > 0 ? (
              contenidos.map((item, idx) => (
                <ContentCard key={item.id} item={item} index={idx} onViewPdf={handleViewPdf} userId={user.id} />
              ))
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                No hay contenidos disponibles en este módulo.
              </p>
            )}
          </div>
        </div>

        {/* Recursos Section */}
        {userRole !== 'student' && (
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              <Folder size={24} color="#FCEE50" /> RECURSOS
            </h2>
            <div style={{
              display: 'flex',
              gap: '24px',
              overflowX: 'auto',
              paddingTop: '12px',
              paddingBottom: '2rem',
              paddingLeft: '8px',
              paddingRight: '8px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.3) transparent'
            }}>
              {recursos.length > 0 ? (
                recursos.map((item, idx) => (
                  <ResourceCard key={item.id} item={item} index={idx} onViewPdf={handleViewPdf} />
                ))
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                  No hay recursos disponibles para este módulo.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Salas VR Section */}
        <div>
          <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
            <Gamepad2 size={24} color="#FCEE50" /> SALAS VR
          </h2>
          <div style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            paddingTop: '12px',
            paddingBottom: '2rem',
            paddingLeft: '8px',
            paddingRight: '8px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.3) transparent'
          }}>
            {vrEntries.map((entry) => (
              <VrCard key={entry.id} vrEntry={entry} />
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default ModuleDraftScreen
