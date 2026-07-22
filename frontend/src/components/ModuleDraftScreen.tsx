import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { getCourseModules, CourseModule, ModuleItem } from '../lib/adminApi'
import { Book, Gamepad2, FileText, ArrowRight } from 'lucide-react'
import group2Img from '../assets/Group_2.png'

interface ModuleDraftScreenProps {
  user: User
}

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

const VrCard = ({ num }: { num: number }) => {
  return (
    <div style={{
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
        src={`https://picsum.photos/seed/vr${num}/400/250`} 
        alt="VR Room" 
        style={{ width: '100%', height: '200px', objectFit: 'cover' }} 
      />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>Nombre de Sala</h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
            Explora un mundo inmersivo donde la realidad virtual te transporta a nuevas dimensiones. Disfruta de experiencias interactivas que estimulan tus sentidos y amplían tu imaginación.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
          <button style={{
            flex: 1,
            backgroundColor: 'white',
            color: '#25164E',
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Ficha Guia <FileText size={16} />
          </button>
          <button style={{
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

const ModuleDraftScreen: React.FC<ModuleDraftScreenProps> = () => {
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#7334EF' }}>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Cargando contenido...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: '"Inter", sans-serif' }}>
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

      {/* Contenidos Section */}
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
          {moduleData?.items && moduleData.items.length > 0 ? (
            moduleData.items.map((item, idx) => (
              <ContentCard key={item.id} item={item} index={idx} />
            ))
          ) : (
             <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
               No hay contenidos en este módulo.
             </p>
          )}
        </div>
      </div>

      {/* Salas VR Section */}
      <div>
        <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
          <Gamepad2 size={24} color="#FCEE50" /> SALAS VR
        </h2>
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          overflowX: 'auto', 
          paddingBottom: '2rem',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.3) transparent'
        }}>
          {[1, 2, 3, 4].map(num => (
            <VrCard key={num} num={num} />
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}

export default ModuleDraftScreen
