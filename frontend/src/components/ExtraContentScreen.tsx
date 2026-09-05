import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import {
  getGradesByCenter,
  getSubjectsByGrade,
  getExitTickets,
  createExitTicket,
  updateExitTicket,
  deleteExitTicket,
  addExitTicketQuestion,
  deleteExitTicketQuestion,
  type GradeLevel,
  type Subject,
  type ExitTicketTemplate,
} from '../lib/adminApi'
import ConfirmModal from './general/ConfirmModal'
import './ExtraContentScreen.css'

interface ExtraContentScreenProps {
  user: User
}

interface CategoryItem {
  id: string
  name: string
  icon: string
  description: string
  badgeText: string
  badgeClass: 'primaria' | 'secundaria'
}

const HARDCODED_CENTER_ID = '3162dec3-a792-44d6-9868-1c9682d215c3'

// Formats grade level into clear human-readable strings based on level attribute:
// - Primaria (1-6): "1er de Primaria", "2do de Primaria", ... "6to de Primaria"
// - Secundaria (1-3): "1er de Secundaria", "2do de Secundaria", "3er de Secundaria"
// - Preparatoria / Bachillerato (1-6): "1er Semestre de Preparatoria", ... "6to Semestre de Preparatoria"
const formatGradeDisplayName = (t: any, rawName?: string, levelVal?: number | string | null): string => {
  if (!rawName) return t('professorCourses.noGrade', { defaultValue: 'Sin Grado' })
  const name = rawName.trim()
  if (!name) return t('professorCourses.noGrade', { defaultValue: 'Sin Grado' })

  const levelNum = (levelVal !== undefined && levelVal !== null && levelVal !== '') ? parseInt(String(levelVal), 10) : NaN
  if (isNaN(levelNum)) {
    return name
  }

  const nameLower = name.toLowerCase()

  if (levelNum === 0) return `${t('professorCourses.general', { defaultValue: 'General' })} ${name}`

  // Preparatoria / Prepa / Bachillerato -> Semestres 1-6
  if (nameLower.includes('prepa') || nameLower.includes('bachillerato')) {
    const ordinal = levelNum === 1
      ? t('professorCourses.ordinal1', { defaultValue: '1er' })
      : levelNum === 2
        ? t('professorCourses.ordinal2', { defaultValue: '2do' })
        : levelNum === 3
          ? t('professorCourses.ordinal3', { defaultValue: '3er' })
          : `${levelNum}${t('professorCourses.ordinalOther', { defaultValue: 'to' })}`
    return `${ordinal} ${t('professorCourses.semesterOf', { defaultValue: 'Semestre de' })} ${name}`
  }

  // Primaria (1-6), Secundaria (1-3), or default level
  let suffix = t('professorCourses.ordinalOther', { defaultValue: 'º' })
  if (levelNum === 1) suffix = t('professorCourses.ordinal1', { defaultValue: '1er' }).replace('1', '')
  else if (levelNum === 2) suffix = t('professorCourses.ordinal2', { defaultValue: '2do' }).replace('2', '')
  else if (levelNum === 3) suffix = t('professorCourses.ordinal3', { defaultValue: '3er' }).replace('3', '')

  return `${levelNum}${suffix} ${t('professorCourses.of', { defaultValue: 'de' })} ${name}`
}

const ExtraContentScreen: React.FC<ExtraContentScreenProps> = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'categories' | 'exit_tickets'>('categories')

  // Step 1 & 2 states
  const [grades, setGrades] = useState<GradeLevel[]>([])
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)

  const [loadingGrades, setLoadingGrades] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Demo category modal state
  const [managingCategory, setManagingCategory] = useState<CategoryItem | null>(null)

  // Exit ticket global templates state
  const [exitTickets, setExitTickets] = useState<ExitTicketTemplate[]>([])
  const [loadingExitTickets, setLoadingExitTickets] = useState(false)
  const [showExitTicketModal, setShowExitTicketModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ExitTicketTemplate | null>(null)
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<ExitTicketTemplate | null>(null)

  // Exit ticket form state
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    is_active: true,
  })
  const [newQuestionForm, setNewQuestionForm] = useState({
    title: '',
    type: 'multiple_choice' as 'multiple_choice' | 'text' | 'rating',
    required: true,
  })
  const [tempQuestions, setTempQuestions] = useState<any[]>([])
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Load grades for hardcoded center on mount
  useEffect(() => {
    loadGrades()
    loadExitTicketTemplates()
  }, [])

  const getStageOrder = (name: string): number => {
    const n = name.toLowerCase()
    if (n.includes('primaria')) return 1
    if (n.includes('secundaria')) return 2
    if (n.includes('prepa') || n.includes('bachillerato') || n.includes('preparatoria')) return 3
    return 4
  }

  const loadGrades = async () => {
    try {
      setLoadingGrades(true)
      setError(null)
      const data = await getGradesByCenter(HARDCODED_CENTER_ID)
      const sorted = (data || []).sort((a, b) => {
        const stageA = getStageOrder(a.name)
        const stageB = getStageOrder(b.name)
        if (stageA !== stageB) return stageA - stageB
        const levelA = a.level !== undefined && a.level !== null ? Number(a.level) : 0
        const levelB = b.level !== undefined && b.level !== null ? Number(b.level) : 0
        return levelA - levelB
      })
      setGrades(sorted)
      if (sorted && sorted.length > 0) {
        setSelectedGrade(sorted[0])
      }
    } catch (err: any) {
      console.error('Error loading grades for hardcoded center:', err)
      setError(err.message || 'Error al cargar grados del centro')
    } finally {
      setLoadingGrades(false)
    }
  }

  const loadExitTicketTemplates = async () => {
    try {
      setLoadingExitTickets(true)
      const data = await getExitTickets()
      setExitTickets(data || [])
    } catch (err: any) {
      console.error('Error loading global exit tickets:', err)
    } finally {
      setLoadingExitTickets(false)
    }
  }

  // Load subjects whenever selected grade changes
  useEffect(() => {
    if (selectedGrade) {
      loadSubjects(selectedGrade.id)
    } else {
      setSubjects([])
      setSelectedSubject(null)
    }
  }, [selectedGrade])

  const loadSubjects = async (gradeId: string) => {
    try {
      setLoadingSubjects(true)
      const data = await getSubjectsByGrade(gradeId)
      setSubjects(data || [])
      if (data && data.length > 0) {
        setSelectedSubject(data[0])
      } else {
        setSelectedSubject(null)
      }
    } catch (err: any) {
      console.error('Error loading subjects for grade:', err)
      setSubjects([])
      setSelectedSubject(null)
    } finally {
      setLoadingSubjects(false)
    }
  }

  // Determine if the selected grade is Primaria vs Secundaria / Preparatoria
  const gradeNameLower = selectedGrade?.name?.toLowerCase() || ''
  const isPrimaria = gradeNameLower.includes('primaria')

  // Get categories based on grade level
  const categories: CategoryItem[] = isPrimaria
    ? [
      {
        id: 'comprueba',
        name: 'Comprueba lo que aprendiste',
        icon: '📝',
        description: 'Actividades de verificación y cuestionarios de aprendizaje interactivos.',
        badgeText: 'Primaria',
        badgeClass: 'primaria',
      },
      {
        id: 'ticket',
        name: 'Ticket de salida',
        icon: '🎟️',
        description: 'Pregunta o cuestionario global de cierre para evaluar la comprensión al finalizar la clase.',
        badgeText: 'Primaria',
        badgeClass: 'primaria',
      },
    ]
    : [
      {
        id: 'piensa',
        name: 'Piensa, experimenta, observa',
        icon: '🔬',
        description: 'Módulos prácticos de indagación, hipótesis, experimentación y análisis crítico.',
        badgeText: 'Secundaria / Prepa',
        badgeClass: 'secundaria',
      },
      {
        id: 'comprueba',
        name: 'Comprueba lo que aprendiste',
        icon: '📝',
        description: 'Evaluaciones objetivas y retos de consolidación de conceptos clave.',
        badgeText: 'Secundaria / Prepa',
        badgeClass: 'secundaria',
      },
      {
        id: 'ticket',
        name: 'Ticket de salida',
        icon: '🎟️',
        description: 'Cuestionario global de salida para medir avance diario y conceptos retenidos.',
        badgeText: 'Secundaria / Prepa',
        badgeClass: 'secundaria',
      },
    ]

  // ========== EXIT TICKET HANDLERS ==========

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ title: '', description: '', is_active: true })
    setTempQuestions([
      { title: '¿Qué concepto principal aprendiste hoy en clase?', type: 'text', required: true },
      { title: '¿Qué tan clara fue la lección de hoy?', type: 'rating', required: true }
    ])
    setShowExitTicketModal(true)
  }

  const handleOpenEditTemplate = (template: ExitTicketTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      title: template.title,
      description: template.description || '',
      is_active: template.is_active,
    })
    setTempQuestions(template.questions || [])
    setShowExitTicketModal(true)
  }

  const handleAddTempQuestion = () => {
    if (!newQuestionForm.title.trim()) return
    setTempQuestions(prev => [
      ...prev,
      {
        title: newQuestionForm.title.trim(),
        type: newQuestionForm.type,
        required: newQuestionForm.required,
        question_order: prev.length
      }
    ])
    setNewQuestionForm({ title: '', type: 'multiple_choice', required: true })
  }

  const handleRemoveTempQuestion = async (index: number, questionId?: string) => {
    if (editingTemplate && questionId) {
      try {
        await deleteExitTicketQuestion(questionId)
      } catch (err) {
        console.error('Error removing question:', err)
      }
    }
    setTempQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim()) return
    try {
      setSavingTemplate(true)
      if (editingTemplate) {
        await updateExitTicket(editingTemplate.id, {
          title: templateForm.title.trim(),
          description: templateForm.description.trim() || undefined,
          is_active: templateForm.is_active,
        })

        // Add any newly added temp questions that don't have an ID yet
        for (const q of tempQuestions) {
          if (!q.id) {
            await addExitTicketQuestion(editingTemplate.id, {
              title: q.title,
              type: q.type,
              required: q.required,
              question_order: q.question_order ?? 0
            })
          }
        }
      } else {
        await createExitTicket({
          title: templateForm.title.trim(),
          description: templateForm.description.trim() || undefined,
          is_active: templateForm.is_active,
          questions: tempQuestions,
        })
      }
      await loadExitTicketTemplates()
      setShowExitTicketModal(false)
    } catch (err: any) {
      alert(err.message || 'Error al guardar plantilla de Ticket de Salida')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteExitTicket(templateId)
      await loadExitTicketTemplates()
      setConfirmDeleteTemplate(null)
    } catch (err: any) {
      alert(err.message || 'Error al eliminar plantilla')
    }
  }

  return (
    <div className="extra-content-screen">
      <div className="extra-content-container">

        {/* Header */}
        <div className="extra-content-header">
          <h1>[Bajo Construcción] Gestión de Contenido Global</h1>
          <p>No tocar</p>
          <div className="center-badge">
            <span>Centro Base:</span> {HARDCODED_CENTER_ID}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="extra-nav-tabs">
          <button
            className={`extra-nav-tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <span>📚</span>
            <span>Contenido por Grado / Materia</span>
          </button>
          <button
            className={`extra-nav-tab ${activeTab === 'exit_tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('exit_tickets')}
          >
            <span>🎟️</span>
            <span>Plantillas Globales de Tickets de Salida ({exitTickets.length})</span>
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* TAB 1: CATEGORIES BY GRADE & SUBJECT */}
        {activeTab === 'categories' && (
          <>
            {/* STEP 1: Grade Level Selection */}
            <div className="section-label">
              <span className="step-num">1</span>
              <span>Selecciona el Grado</span>
            </div>

            {loadingGrades ? (
              <div className="notice-box">Cargando grados del centro...</div>
            ) : grades.length === 0 ? (
              <div className="notice-box">No se encontraron grados en el centro educativo base.</div>
            ) : (
              <div style={{ marginBottom: '2.5rem', maxWidth: '500px' }}>
                <select
                  value={selectedGrade?.id || ''}
                  onChange={(e) => {
                    const found = grades.find(g => g.id === e.target.value)
                    if (found) setSelectedGrade(found)
                  }}
                  className="modern-input"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1.25rem',
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    background: 'rgba(37, 22, 78, 0.85)',
                    border: '1px solid rgba(192, 132, 252, 0.4)',
                    color: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>-- Selecciona un grado --</option>
                  {grades.map((grade) => (
                    <option
                      key={grade.id}
                      value={grade.id}
                      style={{ background: '#25164E', color: '#ffffff' }}
                    >
                      {formatGradeDisplayName(t, grade.name, grade.level)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* STEP 2: Subject Selection */}
            {selectedGrade && (
              <>
                <div className="section-label">
                  <span className="step-num">2</span>
                  <span>Selecciona la Materia ({formatGradeDisplayName(t, selectedGrade.name, selectedGrade.level)})</span>
                </div>

                {loadingSubjects ? (
                  <div className="notice-box">Cargando materias del grado...</div>
                ) : subjects.length === 0 ? (
                  <div className="notice-box">No hay materias registradas en este grado.</div>
                ) : (
                  <div className="subjects-grid">
                    {subjects.map((subj) => {
                      const isActive = selectedSubject?.id === subj.id
                      return (
                        <div
                          key={subj.id}
                          className={`subject-card ${isActive ? 'active' : ''}`}
                          onClick={() => setSelectedSubject(subj)}
                        >
                          <div className="subject-card-title">{subj.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                            {subj.campo_formativo || 'Campo General'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* STEP 3: Content Categories */}
            {selectedGrade && selectedSubject && (
              <>
                <div className="section-label" style={{ marginTop: '2rem' }}>
                  <span className="step-num">3</span>
                  <span>
                    Categorías de Contenido — {selectedSubject.name} ({formatGradeDisplayName(t, selectedGrade.name, selectedGrade.level)})
                  </span>
                </div>

                <div className="categories-grid">
                  {categories.map((cat) => (
                    <div key={cat.id} className="category-card">
                      <div className="category-card-header">
                        <div className="category-icon-wrapper">{cat.icon}</div>
                        <div className="category-info">
                          <h3>{cat.name}</h3>
                          <span className={`level-badge ${cat.badgeClass}`}>
                            {cat.badgeText}
                          </span>
                        </div>
                      </div>

                      <div className="category-card-body">
                        {cat.description}
                      </div>

                      <div className="category-card-actions">
                        <button
                          className="btn-manage-category"
                          onClick={() => {
                            if (cat.id === 'ticket') {
                              setActiveTab('exit_tickets')
                            } else {
                              setManagingCategory(cat)
                            }
                          }}
                        >
                          <span>{cat.id === 'ticket' ? '🎟️ Gestionar Plantillas' : '⚙️ Administrar'}</span>
                        </button>
                        <button
                          className="btn-preview-category"
                          onClick={() => setManagingCategory(cat)}
                        >
                          👁️ Vista Previa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* TAB 2: GLOBAL EXIT TICKETS TEMPLATES */}
        {activeTab === 'exit_tickets' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>Plantillas Globales de Tickets de Salida</h2>
                <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                  Crea y gestiona cuestionarios predeterminados que se aplican a los módulos de aprendizaje.
                </p>
              </div>
              <button
                className="btn-save-modern"
                onClick={handleOpenCreateTemplate}
                style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
              >
                ➕ Nuevo Ticket de Salida
              </button>
            </div>

            {loadingExitTickets ? (
              <div className="notice-box">Cargando plantillas de tickets de salida...</div>
            ) : exitTickets.length === 0 ? (
              <div className="notice-box">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎟️</div>
                <h3>No hay plantillas de Tickets de Salida registradas</h3>
                <p style={{ margin: '0.5rem 0 1.5rem 0', fontSize: '0.9rem' }}>
                  Haz click en "Nuevo Ticket de Salida" para crear la primera plantilla global de evaluación.
                </p>
                <button
                  className="btn-save-modern"
                  onClick={handleOpenCreateTemplate}
                  style={{ width: 'auto', margin: '0 auto' }}
                >
                  ➕ Crear Primera Plantilla
                </button>
              </div>
            ) : (
              <div className="categories-grid">
                {exitTickets.map((template) => {
                  const qCount = template.exit_ticket_questions?.[0]?.count ?? template.questions?.length ?? 0
                  return (
                    <div key={template.id} className="category-card">
                      <div className="category-card-header">
                        <div className="category-icon-wrapper">🎟️</div>
                        <div className="category-info">
                          <h3>{template.title}</h3>
                          <span className={`level-badge ${template.is_active ? 'primaria' : 'secundaria'}`}>
                            {template.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>

                      <div className="category-card-body">
                        <p style={{ margin: '0 0 0.75rem 0' }}>
                          {template.description || 'Sin descripción configurada.'}
                        </p>
                        <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: '600' }}>
                          📋 {qCount} {qCount === 1 ? 'Pregunta' : 'Preguntas'} en este cuestionario
                        </div>
                      </div>

                      <div className="category-card-actions">
                        <button
                          className="btn-manage-category"
                          onClick={() => handleOpenEditTemplate(template)}
                        >
                          ✏️ Editar Cuestionario
                        </button>
                        <button
                          className="btn-preview-category"
                          onClick={() => setConfirmDeleteTemplate(template)}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL FOR MANAGING CATEGORY DEMO */}
        {managingCategory && selectedGrade && selectedSubject && (
          <div className="modal-overlay" onClick={() => setManagingCategory(null)}>
            <div className="school-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
              <div className="modal-header">
                <div className="modal-icon">{managingCategory.icon}</div>
                <h2>{managingCategory.name}</h2>
                <p>
                  Materia: <strong>{selectedSubject.name}</strong> | Grado: <strong>{formatGradeDisplayName(t, selectedGrade.name, selectedGrade.level)}</strong>
                </p>
              </div>

              <div style={{ padding: '1rem 0' }}>
                <div style={{
                  background: 'rgba(108, 92, 231, 0.1)',
                  border: '1px solid rgba(108, 92, 231, 0.3)',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.85)'
                }}>
                  ℹ️ Administra los recursos globales que se insertarán automáticamente en los módulos de esta categoría.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '0.85rem 1rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#fff' }}>
                        {managingCategory.name} - Plantilla Base
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        Se aplica a todos los módulos de {selectedSubject.name}
                      </div>
                    </div>
                    <span style={{
                      background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80',
                      padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'
                    }}>
                      Activo
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-cancel-modern" onClick={() => setManagingCategory(null)}>
                  Cerrar
                </button>
                <button
                  className="btn-save-modern"
                  onClick={() => {
                    alert('Cambios guardados')
                    setManagingCategory(null)
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOR CREATING / EDITING EXIT TICKET TEMPLATES & QUESTIONS */}
        {showExitTicketModal && (
          <div className="modal-overlay" onClick={() => { if (!savingTemplate) setShowExitTicketModal(false) }}>
            <div className="school-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
              <div className="modal-header">
                <div className="modal-icon">🎟️</div>
                <h2>{editingTemplate ? 'Editar Ticket de Salida' : 'Nuevo Ticket de Salida'}</h2>
                <p>Configura las preguntas globales del cuestionario.</p>
              </div>

              <div style={{ padding: '0.5rem 0' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Título del Cuestionario *</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                    placeholder="Ej: Ticket de Salida - Conceptos Generales"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Descripción / Instrucciones</label>
                  <textarea
                    className="modern-input"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Escribe las instrucciones para los estudiantes al responder este ticket..."
                    style={{ minHeight: '70px' }}
                  />
                </div>

                {/* Question List Header */}
                <div style={{
                  fontSize: '1rem', fontWeight: '700', color: '#c084fc',
                  marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <span>📋 Preguntas del Cuestionario ({tempQuestions.length})</span>
                </div>

                <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                  {tempQuestions.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '0.5rem' }}>
                      No has agregado preguntas a este cuestionario todavía.
                    </p>
                  ) : (
                    tempQuestions.map((q, idx) => (
                      <div key={idx} className="question-item-card">
                        <div>
                          <div className="question-item-title">
                            {idx + 1}. {q.title}
                          </div>
                          <div className="question-item-meta">
                            Tipo: {q.type === 'rating' ? '⭐ Calificación 1-5' : q.type === 'text' ? '✍️ Respuesta abierta' : '🔘 Opción múltiple'} | {q.required ? 'Obligatoria' : 'Opcional'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTempQuestion(idx, q.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)', border: 'none',
                            color: '#f87171', borderRadius: '6px', padding: '0.35rem 0.6rem',
                            cursor: 'pointer', fontSize: '0.8rem'
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new question box */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px dashed rgba(108, 92, 231, 0.5)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '0.75rem' }}>
                    + Agregar nueva pregunta
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="modern-input"
                      style={{ flex: 2, minWidth: '200px' }}
                      value={newQuestionForm.title}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, title: e.target.value })}
                      placeholder="Título de la pregunta..."
                    />
                    <select
                      className="modern-input"
                      style={{ flex: 1, minWidth: '140px' }}
                      value={newQuestionForm.type}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, type: e.target.value as any })}
                    >
                      <option value="multiple_choice">Opción Múltiple</option>
                      <option value="text">Respuesta Abierta</option>
                      <option value="rating">Calificación 1-5 ⭐</option>
                    </select>
                    <button
                      type="button"
                      className="btn-save-modern"
                      onClick={handleAddTempQuestion}
                      disabled={!newQuestionForm.title.trim()}
                      style={{ width: 'auto', padding: '0.65rem 1rem' }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  className="btn-cancel-modern"
                  onClick={() => setShowExitTicketModal(false)}
                  disabled={savingTemplate}
                >
                  Cancelar
                </button>
                <button
                  className="btn-save-modern"
                  onClick={handleSaveTemplate}
                  disabled={!templateForm.title.trim() || savingTemplate}
                >
                  {savingTemplate ? 'Guardando...' : 'Guardar Cuestionario'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {confirmDeleteTemplate && (
          <ConfirmModal
            title="Eliminar Ticket de Salida"
            message={`¿Estás seguro de eliminar el ticket de salida "${confirmDeleteTemplate.title}"?`}
            onConfirm={() => handleDeleteTemplate(confirmDeleteTemplate.id)}
            onCancel={() => setConfirmDeleteTemplate(null)}
            confirmLabel="Sí, eliminar"
            danger
          />
        )}

      </div>
    </div>
  )
}

export default ExtraContentScreen
