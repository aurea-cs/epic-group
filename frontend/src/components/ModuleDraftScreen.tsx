import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { getCourseModules, getModuleVrCode, CourseModule, ModuleItem, VrCodeEntry } from '../lib/adminApi'
import { Book, Gamepad2, FileText, ArrowRight } from 'lucide-react'
import group2Img from '../assets/Group_2.png'

interface ModuleDraftScreenProps {
  user: User
}

// ── VR Room Card ──────────────────────────────────────────────────────────────

const VrRoomCard = ({ vrCode }: { vrCode: VrCodeEntry }) => {
  const vrUrl = `https://build-launcher-code.vercel.app/?code=${vrCode.code}&v=3`

  return (
    <div style={{
      backgroundColor: '#1a0d3d',
      borderRadius: '16px',
      padding: '0',
      width: '320px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      border: '2px solid rgba(252,238,80,0.35)',
      position: 'relative',
    }}>
      {/* Glowing header strip */}
      <div style={{
        background: 'linear-gradient(135deg, #FCEE50 0%, #f59e0b 100%)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Gamepad2 size={18} color="#1a0d3d" />
        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1a0d3d', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Sala VR
        </span>
      </div>

      {/* Rounded-rectangle preview image */}
      <div style={{ padding: '16px 20px 0' }}>
        <img
          src={`https://picsum.photos/seed/vr-${vrCode.id}/400/220`}
          alt="VR Room preview"
          style={{
            width: '100%',
            height: '160px',
            objectFit: 'cover',
            borderRadius: '12px',
            display: 'block',
          }}
        />
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
            Sala de Realidad Virtual
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.5', margin: 0 }}>
            Entra al entorno inmersivo de realidad virtual diseñado para este módulo. Vive una
            experiencia interactiva que refuerza los contenidos de forma dinámica.
          </p>
        </div>

        <div style={{
          background: 'rgba(252,238,80,0.08)',
          border: '1px solid rgba(252,238,80,0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.75rem',
          color: 'rgba(252,238,80,0.8)',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
        }}>
          Código: {vrCode.code}
        </div>

        <a
          href={vrUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#FCEE50',
            color: '#1a0d3d',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background 0.2s, transform 0.15s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#ffe900'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#FCEE50'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          Ingresar a la Sala <ArrowRight size={16} />
        </a>
      </div>
    </div>
  )
}

// ── Content Card ──────────────────────────────────────────────────────────────

const ContentCard = ({ item, index }: { item: ModuleItem, index: number }) => {
  return (
    <div style={{
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
          src={`https://picsum.photos/seed/${item.id || index}/200`}
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
          onClick={() => {
            if (item.content_url) {
              const readItems = JSON.parse(localStorage.getItem('readItems') || '{}');
              readItems[item.id] = true;
              localStorage.setItem('readItems', JSON.stringify(readItems));
              window.open(item.content_url, '_blank');
            } else {
              alert('Este contenido no tiene una URL configurada aún.');
            }
          }}
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

// ── Main Screen ───────────────────────────────────────────────────────────────

const ModuleDraftScreen: React.FC<ModuleDraftScreenProps> = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const navigate = useNavigate()
  const [moduleData, setModuleData] = useState<CourseModule | null>(null)
  const [vrCode, setVrCode] = useState<VrCodeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

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
        getModuleVrCode(moduleId!),
      ])

      const targetModule = modules.find(m => m.id === moduleId)
      if (!targetModule) throw new Error('Módulo no encontrado')

      setModuleData(targetModule)
      setVrCode(vr)
    } catch (err: any) {
      setError(err.message || 'Error al cargar los ítems del módulo')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#7334EF' }}>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Cargando contenido...</p>
      </div>
    )
  }

  // Only show items where show_student is explicitly true
  const visibleItems = (moduleData?.items || []).filter(item => item.show_student === true)

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>
      {/* Left side */}
      <div
        style={{
          flex: 1,
          backgroundImage: `url(${group2Img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Right side */}
      <div style={{
        flex: 1,
        backgroundColor: '#7334EF',
        padding: '4rem',
        boxSizing: 'border-box',
        position: 'relative',
        overflowY: 'auto'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '40px',
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

        <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: '1rem' }}>
          {moduleData?.title ? `Modulo - ${moduleData.title}` : 'Modulo 1 - Nombre del Modulo'}
        </h1>

        <p style={{ color: 'white', fontSize: '1rem', lineHeight: '1.6', opacity: 0.9, marginBottom: '3rem', maxWidth: '1000px' }}>
          Este módulo de aprendizaje está diseñado para sumergirte en un entorno interactivo, donde
          podrás explorar conceptos clave a través de actividades prácticas y recursos multimedia. A
          medida que avances, experimentarás un enfoque dinámico que fomenta la colaboración y el
          pensamiento crítico, asegurando que cada lección sea memorable y efectiva.
        </p>

        {/* Contenidos Section — VR card first, then module items */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
            <Book size={24} color="#FCEE50" /> CONTENIDOS
          </h2>
          <div style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            paddingBottom: '2rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.3) transparent'
          }}>
            {/* VR room card is always shown first if a code exists */}
            {vrCode && <VrRoomCard vrCode={vrCode} />}

            {/* Module items filtered to show_student=true */}
            {visibleItems.length > 0 ? (
              visibleItems.map((item, idx) => (
                <ContentCard key={item.id} item={item} index={idx} />
              ))
            ) : !vrCode ? (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                No hay contenidos en este módulo.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModuleDraftScreen
