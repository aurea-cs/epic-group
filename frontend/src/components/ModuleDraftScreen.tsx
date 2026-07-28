import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { getCourseModules, getModuleVrCode, CourseModule, ModuleItem, VrCodeEntry } from '../lib/adminApi'
import { Book, Gamepad2, FileText, ArrowRight, Folder, Download, Play } from 'lucide-react'
import bannerImg from '../assets/banner.png'
import './ModuleDraftScreen.css'

interface ModuleDraftScreenProps {
  user: User
}

const ContentCard = ({ item, index, onViewPdf }: { item: ModuleItem, index: number, onViewPdf: (url: string) => void }) => {
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
            if (!item.content_url) {
              alert('Este contenido no tiene una URL configurada aún.');
              return;
            }
            const readItems = JSON.parse(localStorage.getItem('readItems') || '{}');
            readItems[item.id] = true;
            localStorage.setItem('readItems', JSON.stringify(readItems));
            if (item.type === 'pdf') {
              onViewPdf(item.content_url);
            } else {
              window.open(item.content_url, '_blank', 'noopener,noreferrer');
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

// ── PDF Viewer Modal (protected, no download) ────────────────────────────────
const PdfViewerModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = navigator.platform.toUpperCase().includes('MAC') ? e.metaKey : e.ctrlKey;
      if (isCmdOrCtrl && ['p', 'P', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const blockMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', blockMenu, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', blockMenu, true);
    };
  }, []);

  const viewerUrl = url.includes('#') ? `${url}&toolbar=0&navpanes=0` : `${url}#toolbar=0&navpanes=0`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', zIndex: 9999,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px', backgroundColor: '#1a0d3d',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 600 }}>Contenido</h3>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: '34px', height: '34px', color: 'white', fontSize: '1.1rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
          onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        >✕</button>
      </div>
      {/* Viewer */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#111' }}>
        <iframe
          src={viewerUrl}
          title="Document Viewer"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)', padding: '7px 16px', borderRadius: '20px',
          color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          🔒 Modo de solo lectura — Descargas y copias deshabilitadas
        </div>
      </div>
    </div>
  );
}

const VrSchoolCard = () => {
  const url = "https://epicgrouplab.itch.io/campus-san-gabriel"

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
        src={`https://picsum.photos/seed/vrschool/400/250`}
        alt="VR School"
        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
      />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
            Colegio VR (VR School)
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
            Explora el campus virtual en 3D y conoce las instalaciones del colegio en una experiencia interactiva completa.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
          <button
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            style={{
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
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Ingresar a VR School <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

const VrCard = ({ vrEntry }: { vrEntry: VrCodeEntry }) => {
  const vrUrl = `https://build-launcher-code.vercel.app/?code=${vrEntry.code}&v=3`

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
        src={`https://picsum.photos/seed/vr${vrEntry.id}/400/250`}
        alt="VR Room"
        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
      />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
            Sala VR
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
            Explora un mundo inmersivo donde la realidad virtual te transporta a nuevas dimensiones.
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
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Código de acceso
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#FCEE50', letterSpacing: '0.15em' }}>
              {vrEntry.code}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
          <button
            onClick={() => window.open(vrUrl, '_blank', 'noopener,noreferrer')}
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

const ResourceCard = ({ item, index }: { item: ModuleItem, index: number }) => {
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
          src={`https://picsum.photos/seed/recursos${item.id || index}/200`}
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
            onClick={() => window.open(item.content_url!, '_blank')}
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
              <>Descargar Recursos <Download size={16} /></>
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
  const [vrEntry, setVrEntry] = useState<VrCodeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null)

  const isProfessor = user.user_metadata?.role === 'professor' || user.user_metadata?.role === 'admin'

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
      setVrEntry(vr)
    } catch (err: any) {
      setError(err.message || 'Error al cargar los ítems del módulo')
    } finally {
      setLoading(false)
    }
  }

  // Filter contenidos: items with show_student === true
  const contenidos = (moduleData?.items || []).filter(item => item.show_student === true)

  // Filter recursos: only for professors, items with show_teacher === true
  const recursos = isProfessor
    ? (moduleData?.items || []).filter(item => item.show_teacher === true)
    : []

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#7334EF' }}>
        <p style={{ color: 'white', fontSize: '1.2rem' }}>Cargando contenido...</p>
      </div>
    )
  }

  return (
    <div className="module-draft-container">
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
            {contenidos.length > 0 ? (
              contenidos.map((item, idx) => (
                <ContentCard key={item.id} item={item} index={idx} onViewPdf={setActivePdfUrl} />
              ))
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                No hay contenidos disponibles en este módulo.
              </p>
            )}
          </div>
        </div>

        {/* Recursos Section — only for professors */}
        {isProfessor && (
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
              <Folder size={24} color="#FCEE50" /> RECURSOS
            </h2>
            <div style={{
              display: 'flex',
              gap: '24px',
              overflowX: 'auto',
              paddingBottom: '2rem',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.3) transparent'
            }}>
              {recursos.length > 0 ? (
                recursos.map((item, idx) => (
                  <ResourceCard key={item.id} item={item} index={idx} />
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
            paddingBottom: '2rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.3) transparent'
          }}>
            <VrSchoolCard />
            {vrEntry && <VrCard vrEntry={vrEntry} />}
          </div>
        </div>
      </div>
      {activePdfUrl && (
        <PdfViewerModal url={activePdfUrl} onClose={() => setActivePdfUrl(null)} />
      )}
    </div>
  )
}

export default ModuleDraftScreen
