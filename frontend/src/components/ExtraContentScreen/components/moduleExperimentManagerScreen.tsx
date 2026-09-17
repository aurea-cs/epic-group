import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatGradeDisplayName } from '../hooks/gradeFormat'
import {
    getThinkBlocks,
    getThinkBlock,
    createThinkBlock,
    updateThinkBlock,
    deleteThinkBlock,
    bulkReplaceThinkBlockPrompts,
    type ThinkBlock,
    type ThinkBlockPrompt,
    type ThinkBlockPromptType,
    type CurriculumGrade,
    type CurriculumSubject,
    type CurriculumModule,
} from '../../../lib/adminApi'

// ─── Constants & Icons ────────────────────────────────────────────────────────

const PROMPT_TYPE_LABELS: Record<ThinkBlockPromptType, string> = {
    piensa: '🧠 Piensa',
    observa: '👀 Observa',
    experimenta: '🧪 Experimenta',
    otro: '⭐ Otro',
}

const DEFAULT_PROMPT_ICONS: Record<ThinkBlockPromptType, string> = {
    piensa: '🧠',
    observa: '👀',
    experimenta: '🧪',
    otro: '💡',
}

const PRESET_ICONS = ['🧠', '👀', '🧪', '🔎', '💡', '❓', '🔬', '📝', '⚡', '🌱']

function EMPTY_PROMPT(type: ThinkBlockPromptType = 'piensa'): ThinkBlockPrompt {
    return {
        prompt_type: type,
        icon: DEFAULT_PROMPT_ICONS[type],
        label: '',
        prompt_md: '',
        prompt_order: 0,
    }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ModuleExperimentManagerScreenProps {
    grade: CurriculumGrade
    subject: CurriculumSubject
    module: CurriculumModule | null
    onBack: () => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ModuleExperimentManagerScreen: React.FC<ModuleExperimentManagerScreenProps> = ({
    grade,
    subject,
    module,
    onBack,
}) => {
    const { t } = useTranslation()
    const [blocks, setBlocks] = useState<ThinkBlock[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    // View / Editor state
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState<boolean>(false)
    const [previewingBlock, setPreviewingBlock] = useState<ThinkBlock | null>(null)

    const curriculumModuleId = module?.id || null

    const loadData = async () => {
        if (!curriculumModuleId) {
            setBlocks([])
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const data = await getThinkBlocks(curriculumModuleId)
            setBlocks(data || [])
        } catch (err: any) {
            console.error('Error loading think blocks:', err)
            setError(err.message || 'Error al cargar los bloques de experimento.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [curriculumModuleId])

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este bloque de experimento?')) {
            return
        }
        try {
            await deleteThinkBlock(id)
            setBlocks((prev) => prev.filter((b) => b.id !== id))
        } catch (err: any) {
            alert(err.message || 'Error al eliminar el bloque.')
        }
    }

    const handleToggleActive = async (block: ThinkBlock) => {
        try {
            const updated = await updateThinkBlock(block.id, { is_active: !block.is_active })
            setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, is_active: updated.is_active } : b)))
        } catch (err: any) {
            alert(err.message || 'Error al actualizar el estado.')
        }
    }

    // Render Editor
    if (isCreating || editingBlockId) {
        return (
            <ThinkBlockEditor
                blockId={editingBlockId}
                curriculumModuleId={curriculumModuleId}
                onBack={() => {
                    setEditingBlockId(null)
                    setIsCreating(false)
                }}
                onSaved={() => {
                    setEditingBlockId(null)
                    setIsCreating(false)
                    loadData()
                }}
            />
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div className="workspace-header">
                <div className="workspace-header-info">
                    <button className="btn-back-link" onClick={onBack}>
                        ← {t('extraContent.btnBack', { defaultValue: 'Volver a Categorías' })}
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', fontWeight: 700 }}>
                            🔬 Piensa, observa y experimenta
                        </h2>
                        <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.55)' }}>
                            Gestión de tarjetas de indagación y experimentos del módulo
                        </span>
                    </div>
                </div>

                {curriculumModuleId && (
                    <button
                        className="btn-manage-category"
                        onClick={() => setIsCreating(true)}
                        style={{ padding: '0.6rem 1.2rem' }}
                    >
                        ➕ Crear experimento
                    </button>
                )}
            </div>

            {/* Context breadcrumb */}
            <div className="qm-context-bar">
                <div className="qm-context-item">
                    <span className="qm-context-label">Grado</span>
                    <span className="qm-context-value">{formatGradeDisplayName(t, grade.name, grade.level)}</span>
                </div>
                <span className="qm-context-sep">›</span>
                <div className="qm-context-item">
                    <span className="qm-context-label">Materia</span>
                    <span className="qm-context-value" style={{ color: '#c084fc' }}>{subject.name}</span>
                </div>
                <span className="qm-context-sep">›</span>
                <div className="qm-context-item">
                    <span className="qm-context-label">Módulo</span>
                    <span className="qm-context-value" style={{ color: '#4ade80' }}>
                        {module ? module.title : 'Sin módulo seleccionado'}
                    </span>
                </div>
            </div>

            {error && <div className="error-banner">⚠️ {error}</div>}

            {!curriculumModuleId ? (
                <div className="notice-box">
                    <p>Por favor, selecciona un módulo para gestionar sus bloques de experimento.</p>
                </div>
            ) : loading ? (
                <div className="notice-box" style={{ padding: '3rem 1.5rem' }}>
                    <div className="add-ticket-icon" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}>
                        🌀
                    </div>
                    <p>Cargando bloques de experimento...</p>
                </div>
            ) : blocks.length === 0 ? (
                <div
                    className="add-ticket-card"
                    onClick={() => setIsCreating(true)}
                    style={{ padding: '3rem 2rem' }}
                >
                    <div className="add-ticket-icon">🧪</div>
                    <h3 className="add-ticket-title">No hay experimentos registrados en este módulo</h3>
                    <p className="add-ticket-subtitle">
                        Haz clic aquí para crear el primer bloque de "Piensa, observa y experimenta"
                    </p>
                </div>
            ) : (
                <div className="qm-quiz-list">
                    {blocks.map((block) => {
                        const promptCount = Array.isArray(block.think_block_prompts) && block.think_block_prompts.length > 0
                            ? (block.think_block_prompts[0] as any).count ?? block.prompts?.length ?? 0
                            : block.prompts?.length ?? 0

                        return (
                            <div key={block.id} className="category-card" style={{ gap: '0.85rem' }}>
                                <div className="category-card-top">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <span className="gc-module-order">#{block.order_index}</span>
                                        <span className={`level-badge ${block.is_active ? 'primaria' : 'secundaria'}`}>
                                            {block.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <div className="category-card-icon-actions">
                                        <button
                                            className="btn-icon-action"
                                            title="Cambiar estado activo"
                                            onClick={() => handleToggleActive(block)}
                                        >
                                            {block.is_active ? '👁️' : '🙈'}
                                        </button>
                                        <button
                                            className="btn-icon-action"
                                            title="Editar bloque"
                                            onClick={() => setEditingBlockId(block.id)}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-icon-action btn-icon-danger"
                                            title="Eliminar bloque"
                                            onClick={() => handleDelete(block.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div className="category-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>
                                        🧠 Dato Curioso
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                                        {block.fun_fact_md.length > 120
                                            ? `${block.fun_fact_md.substring(0, 120)}...`
                                            : block.fun_fact_md}
                                    </p>

                                    {block.image_url && (
                                        <div style={{ marginTop: '0.4rem', borderRadius: '8px', overflow: 'hidden', height: '100px', width: '100%' }}>
                                            <img
                                                src={block.image_url}
                                                alt="Thumb"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { (e.target as any).style.display = 'none' }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                                        <span className="gc-meta-badge">
                                            {promptCount} {promptCount === 1 ? 'Prompt / Pregunta' : 'Prompts / Preguntas'}
                                        </span>
                                    </div>
                                </div>

                                <div className="category-card-actions">
                                    <button
                                        className="btn-preview-category"
                                        style={{ width: '100%' }}
                                        onClick={async () => {
                                            try {
                                                const full = await getThinkBlock(block.id)
                                                setPreviewingBlock(full)
                                            } catch (err) {
                                                setPreviewingBlock(block)
                                            }
                                        }}
                                    >
                                        👁️ Ver vista previa
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Preview Modal */}
            {previewingBlock && (
                <ThinkBlockPreviewModal
                    block={previewingBlock}
                    onClose={() => setPreviewingBlock(null)}
                />
            )}
        </div>
    )
}

// ─── ThinkBlockEditor Component ───────────────────────────────────────────────

interface ThinkBlockEditorProps {
    blockId: string | null
    curriculumModuleId: string | null
    onBack: () => void
    onSaved: () => void
}

const ThinkBlockEditor: React.FC<ThinkBlockEditorProps> = ({
    blockId,
    curriculumModuleId,
    onBack,
    onSaved,
}) => {
    const { t } = useTranslation()
    const [loading, setLoading] = useState<boolean>(!!blockId)
    const [saving, setSaving] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // Form fields
    const [funFactMd, setFunFactMd] = useState<string>('')
    const [imageUrl, setImageUrl] = useState<string>('')
    const [orderIndex, setOrderIndex] = useState<number>(0)
    const [isActive, setIsActive] = useState<boolean>(true)
    const [prompts, setPrompts] = useState<ThinkBlockPrompt[]>([EMPTY_PROMPT('piensa')])

    useEffect(() => {
        if (!blockId) return
        const fetchDetail = async () => {
            try {
                setLoading(true)
                const data = await getThinkBlock(blockId)
                setFunFactMd(data.fun_fact_md || '')
                setImageUrl(data.image_url || '')
                setOrderIndex(data.order_index ?? 0)
                setIsActive(data.is_active ?? true)
                setPrompts(data.prompts && data.prompts.length > 0 ? data.prompts : [EMPTY_PROMPT('piensa')])
            } catch (err: any) {
                console.error('Error loading think block detail:', err)
                setError(err.message || 'Error al cargar el detalle del bloque.')
            } finally {
                setLoading(false)
            }
        }
        fetchDetail()
    }, [blockId])

    const handleAddPrompt = (type: ThinkBlockPromptType = 'piensa') => {
        setPrompts((prev) => [
            ...prev,
            { ...EMPTY_PROMPT(type), prompt_order: prev.length },
        ])
    }

    const handleUpdatePrompt = (index: number, updates: Partial<ThinkBlockPrompt>) => {
        setPrompts((prev) =>
            prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
        )
    }

    const handleRemovePrompt = (index: number) => {
        if (prompts.length <= 1) {
            alert('El bloque debe contener al menos un prompt.')
            return
        }
        setPrompts((prev) => prev.filter((_, i) => i !== index))
    }

    const handleMovePrompt = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= prompts.length) return

        setPrompts((prev) => {
            const next = [...prev]
            const temp = next[index]
            next[index] = next[targetIndex]
            next[targetIndex] = temp
            return next.map((p, idx) => ({ ...p, prompt_order: idx }))
        })
    }

    const handleSave = async () => {
        if (!funFactMd.trim()) {
            setError('El texto de Dato Curioso / Sabías que... es obligatorio.')
            return
        }

        const invalidPrompt = prompts.find((p) => !p.prompt_md.trim())
        if (invalidPrompt) {
            setError('Todos los prompts deben tener un texto de pregunta/instrucción.')
            return
        }

        try {
            setSaving(true)
            setError(null)

            const formattedPrompts = prompts.map((p, idx) => ({
                prompt_type: p.prompt_type,
                icon: p.icon || DEFAULT_PROMPT_ICONS[p.prompt_type],
                label: p.label || null,
                prompt_md: p.prompt_md.trim(),
                prompt_order: idx,
            }))

            if (blockId) {
                // Update block metadata
                await updateThinkBlock(blockId, {
                    fun_fact_md: funFactMd.trim(),
                    image_url: imageUrl.trim() || null,
                    order_index: Number(orderIndex) || 0,
                    is_active: isActive,
                })

                // Bulk replace prompts
                await bulkReplaceThinkBlockPrompts(blockId, formattedPrompts)
            } else {
                if (!curriculumModuleId) {
                    throw new Error('ID de módulo no encontrado.')
                }

                await createThinkBlock({
                    curriculum_module_id: curriculumModuleId,
                    fun_fact_md: funFactMd.trim(),
                    image_url: imageUrl.trim() || null,
                    order_index: Number(orderIndex) || 0,
                    is_active: isActive,
                    prompts: formattedPrompts,
                })
            }

            onSaved()
        } catch (err: any) {
            console.error('Error saving think block:', err)
            setError(err.message || 'Error al guardar el bloque de experimento.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="notice-box" style={{ padding: '4rem 1.5rem' }}>
                <div className="add-ticket-icon" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}>
                    🌀
                </div>
                <p>Cargando editor del bloque de experimento...</p>
            </div>
        )
    }

    return (
        <div className="exit-ticket-workspace">
            {/* Header */}
            <div className="workspace-header">
                <div className="workspace-header-info">
                    <button className="btn-back-link" onClick={onBack}>
                        ← Volver a la lista
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>
                            {blockId ? 'Editar Bloque de Experimento' : 'Nuevo Bloque de Experimento'}
                        </h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                        className="btn-save-quiz"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        💾 {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            {error && <div className="error-banner">⚠️ {error}</div>}

            {/* Split Screen Editor */}
            <div className="editor-split-container">
                {/* Form Controls */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h3 className="glass-panel-title">🧠 Contenido Principal</h3>

                    <div>
                        <label className="selection-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                            Dato curioso / Sabías que... (Markdown) *
                        </label>
                        <textarea
                            className="qm-open-textarea"
                            rows={4}
                            placeholder="Escribe el texto de dato curioso o contexto introductorio..."
                            value={funFactMd}
                            onChange={(e) => setFunFactMd(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="selection-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                            URL de Imagen (Opcional)
                        </label>
                        <input
                            type="text"
                            className="gc-search-input"
                            style={{ padding: '0.65rem 0.9rem' }}
                            placeholder="https://ejemplo.com/imagen.png"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <label className="selection-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                                Orden de Tarjeta
                            </label>
                            <input
                                type="number"
                                className="gc-search-input"
                                style={{ padding: '0.65rem 0.9rem' }}
                                value={orderIndex}
                                onChange={(e) => setOrderIndex(Number(e.target.value))}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.2rem' }}>
                            <input
                                type="checkbox"
                                id="is_active_check"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="is_active_check" style={{ color: '#fff', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                                Bloque activo para estudiantes
                            </label>
                        </div>
                    </div>

                    <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />

                    {/* Prompts Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="glass-panel-title" style={{ margin: 0 }}>
                            📝 Prompts y Preguntas ({prompts.length})
                        </h3>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {(['piensa', 'observa', 'experimenta'] as ThinkBlockPromptType[]).map((tType) => (
                                <button
                                    key={tType}
                                    type="button"
                                    className="gc-grade-chip"
                                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                                    onClick={() => handleAddPrompt(tType)}
                                >
                                    + {PROMPT_TYPE_LABELS[tType]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {prompts.map((p, idx) => (
                            <div
                                key={idx}
                                className="question-item-card"
                                style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', background: 'rgba(255,255,255,0.03)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="gc-module-order">Prompt #{idx + 1}</span>
                                        <select
                                            className="selection-select"
                                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem', width: 'auto' }}
                                            value={p.prompt_type}
                                            onChange={(e) =>
                                                handleUpdatePrompt(idx, {
                                                    prompt_type: e.target.value as ThinkBlockPromptType,
                                                    icon: DEFAULT_PROMPT_ICONS[e.target.value as ThinkBlockPromptType],
                                                })
                                            }
                                        >
                                            <option value="piensa">🧠 Piensa</option>
                                            <option value="observa">👀 Observa</option>
                                            <option value="experimenta">🧪 Experimenta</option>
                                            <option value="otro">⭐ Otro</option>
                                        </select>
                                    </div>

                                    <div className="question-actions-group">
                                        <button
                                            type="button"
                                            className="btn-icon-action"
                                            disabled={idx === 0}
                                            onClick={() => handleMovePrompt(idx, 'up')}
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-icon-action"
                                            disabled={idx === prompts.length - 1}
                                            onClick={() => handleMovePrompt(idx, 'down')}
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-icon-action btn-icon-danger"
                                            onClick={() => handleRemovePrompt(idx)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '0 0 100px' }}>
                                        <label className="selection-label" style={{ fontSize: '0.68rem' }}>Icono</label>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <input
                                                type="text"
                                                className="gc-search-input"
                                                style={{ padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '1.1rem' }}
                                                value={p.icon || ''}
                                                onChange={(e) => handleUpdatePrompt(idx, { icon: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, minWidth: '180px' }}>
                                        <label className="selection-label" style={{ fontSize: '0.68rem' }}>Título Personalizado (Opcional)</label>
                                        <input
                                            type="text"
                                            className="gc-search-input"
                                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                                            placeholder={`Ej. ${PROMPT_TYPE_LABELS[p.prompt_type]}`}
                                            value={p.label || ''}
                                            onChange={(e) => handleUpdatePrompt(idx, { label: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="selection-label" style={{ fontSize: '0.68rem' }}>Pregunta / Instrucción *</label>
                                    <textarea
                                        className="qm-open-textarea"
                                        rows={2}
                                        placeholder="Ej. ¿Qué observaste cuando mezclaste los componentes?"
                                        value={p.prompt_md}
                                        onChange={(e) => handleUpdatePrompt(idx, { prompt_md: e.target.value })}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="qm-add-question-btn"
                        onClick={() => handleAddPrompt('piensa')}
                    >
                        + Agregar Prompt
                    </button>
                </div>

                {/* Live Preview Side Panel */}
                <div className="preview-sticky-wrapper">
                    <div className="preview-container">
                        <div className="preview-header-badge">
                            👁️ Vista previa interactiva
                        </div>

                        <div className="preview-question-card" style={{ background: 'rgba(37, 22, 78, 0.95)', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>🧠</span>
                                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                                    Dato Curioso
                                </h4>
                            </div>

                            <p style={{ color: '#e2e8f0', fontSize: '0.92rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                {funFactMd.trim() || 'El contenido de Dato Curioso aparecerá aquí...'}
                            </p>

                            {imageUrl && (
                                <div style={{ marginTop: '0.75rem', borderRadius: '10px', overflow: 'hidden', maxHeight: '180px' }}>
                                    <img
                                        src={imageUrl}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { (e.target as any).style.display = 'none' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                            {prompts.map((p, idx) => (
                                <div
                                    key={idx}
                                    className="preview-question-card"
                                    style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1.2rem' }}>{p.icon || DEFAULT_PROMPT_ICONS[p.prompt_type]}</span>
                                        <span style={{ color: '#c084fc', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                            {p.label || PROMPT_TYPE_LABELS[p.prompt_type]}
                                        </span>
                                    </div>
                                    <p style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
                                        {p.prompt_md || 'Escribe la pregunta o instrucción...'}
                                    </p>
                                    <textarea
                                        className="qm-open-textarea readonly-text-placeholder"
                                        rows={2}
                                        disabled
                                        placeholder="El estudiante escribirá su respuesta aquí..."
                                        style={{ cursor: 'not-allowed', opacity: 0.7 }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── ThinkBlockPreviewModal Component ─────────────────────────────────────────

interface ThinkBlockPreviewModalProps {
    block: ThinkBlock
    onClose: () => void
}

const ThinkBlockPreviewModal: React.FC<ThinkBlockPreviewModalProps> = ({ block, onClose }) => {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1.5rem',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1a103c',
                    border: '1px solid rgba(192, 132, 252, 0.3)',
                    borderRadius: '20px',
                    maxWidth: '650px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '1.75rem',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>
                        🔬 Vista Previa del Experimento
                    </h3>
                    <button
                        className="btn-icon-action"
                        onClick={onClose}
                        style={{ width: '32px', height: '32px', fontSize: '1rem' }}
                    >
                        ✕
                    </button>
                </div>

                <div className="preview-container">
                    <div className="preview-question-card" style={{ background: 'rgba(37, 22, 78, 0.95)', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧠</span>
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                                Dato Curioso
                            </h4>
                        </div>
                        <p style={{ color: '#e2e8f0', fontSize: '0.92rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {block.fun_fact_md}
                        </p>
                        {block.image_url && (
                            <div style={{ marginTop: '0.75rem', borderRadius: '10px', overflow: 'hidden', maxHeight: '220px' }}>
                                <img
                                    src={block.image_url}
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {block.prompts?.map((p, idx) => (
                            <div
                                key={idx}
                                className="preview-question-card"
                                style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{p.icon || DEFAULT_PROMPT_ICONS[p.prompt_type]}</span>
                                    <span style={{ color: '#c084fc', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                        {p.label || PROMPT_TYPE_LABELS[p.prompt_type]}
                                    </span>
                                </div>
                                <p style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
                                    {p.prompt_md}
                                </p>
                                <textarea
                                    className="qm-open-textarea readonly-text-placeholder"
                                    rows={2}
                                    disabled
                                    placeholder="El estudiante escribirá su respuesta aquí..."
                                    style={{ cursor: 'not-allowed', opacity: 0.7 }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ModuleExperimentManagerScreen
