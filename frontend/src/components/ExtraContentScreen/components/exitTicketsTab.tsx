import React, { useState } from 'react'
import ExitTicketFormModal from './exitTicketsFormModal'
import ExitTicketViewModal from './exitTicketsViewModal'
import ConfirmModal from '../../general/ConfirmModal'
import type { ExitTicketTemplate } from '../../../lib/adminApi'

interface ExitTicketsTabProps {
    exitTickets: ExitTicketTemplate[]
    loading: boolean
    error: string | null
    reload: () => Promise<void>
    remove: (id: string) => Promise<void>
}

const ExitTicketsTab: React.FC<ExitTicketsTabProps> = ({ exitTickets, loading, error, reload, remove }) => {
    // 'new' = create modal open, a string id = edit modal open for that template, null = closed
    const [formModalId, setFormModalId] = useState<string | 'new' | null>(null)
    const [viewModalId, setViewModalId] = useState<string | null>(null)
    const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<ExitTicketTemplate | null>(null)

    const handleDelete = async (templateId: string) => {
        try {
            await remove(templateId)
            setConfirmDeleteTemplate(null)
        } catch (err: any) {
            alert(err.message || 'Error al eliminar plantilla')
        }
    }

    return (
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
                    onClick={() => setFormModalId('new')}
                    style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
                >
                    ➕ Nuevo Ticket de Salida
                </button>
            </div>

            {error && (
                <div
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#f87171',
                        padding: '1rem 1.5rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        textAlign: 'center',
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className="notice-box">Cargando plantillas de tickets de salida...</div>
            ) : exitTickets.length === 0 ? (
                <div className="notice-box">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎟️</div>
                    <h3>No hay plantillas de Tickets de Salida registradas</h3>
                    <p style={{ margin: '0.5rem 0 1.5rem 0', fontSize: '0.9rem' }}>
                        Haz click en "Nuevo Ticket de Salida" para crear la primera plantilla global de evaluación.
                    </p>
                    <button className="btn-save-modern" onClick={() => setFormModalId('new')} style={{ width: 'auto', margin: '0 auto' }}>
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
                                    <p style={{ margin: '0 0 0.75rem 0' }}>{template.description || 'Sin descripción configurada.'}</p>
                                    <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: '600' }}>
                                        📋 {qCount} {qCount === 1 ? 'Pregunta' : 'Preguntas'} en este cuestionario
                                    </div>
                                </div>

                                <div className="category-card-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <button className="btn-preview-category" onClick={() => setViewModalId(template.id)}>
                                        👁️ Ver
                                    </button>
                                    <button className="btn-manage-category" onClick={() => setFormModalId(template.id)}>
                                        ✏️ Editar
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

            {formModalId !== null && (
                <ExitTicketFormModal
                    templateId={formModalId === 'new' ? null : formModalId}
                    onClose={() => setFormModalId(null)}
                    onSaved={async () => {
                        await reload()
                        setFormModalId(null)
                    }}
                />
            )}

            {viewModalId && (
                <ExitTicketViewModal
                    templateId={viewModalId}
                    onClose={() => setViewModalId(null)}
                    onEdit={() => {
                        const id = viewModalId
                        setViewModalId(null)
                        setFormModalId(id)
                    }}
                />
            )}

            {confirmDeleteTemplate && (
                <ConfirmModal
                    title="Eliminar Ticket de Salida"
                    message={`¿Estás seguro de eliminar el ticket de salida "${confirmDeleteTemplate.title}"?`}
                    onConfirm={() => handleDelete(confirmDeleteTemplate.id)}
                    onCancel={() => setConfirmDeleteTemplate(null)}
                    confirmLabel="Sí, eliminar"
                    danger
                />
            )}
        </div>
    )
}

export default ExitTicketsTab