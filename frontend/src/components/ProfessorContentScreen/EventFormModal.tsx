import React, { useState } from 'react'
import { EVENT_TYPES, type CalendarEvent } from './types'
import { ActionButton, Modal, fieldLabelStyle, inputStyle } from '../general/SharedUI'

interface EventFormModalProps {
    initial: CalendarEvent | null
    onClose: () => void
    onSubmit: (payload: Omit<CalendarEvent, 'id' | 'created_at' | 'subject_id' | 'professor_id'>) => Promise<void>
}

const EventFormModal: React.FC<EventFormModalProps> = ({ initial, onClose, onSubmit }) => {
    const [title, setTitle] = useState(initial?.title || '')
    const [description, setDescription] = useState(initial?.description_md || '')
    const [type, setType] = useState(initial?.type || 'class')
    const [eventDate, setEventDate] = useState(initial?.event_date || '')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!title.trim() || !eventDate) return
        setSaving(true)
        setFormError(null)
        try {
            await onSubmit({
                title: title.trim(),
                description_md: description.trim() || null,
                type,
                event_date: eventDate,
            })
        } catch (e: any) {
            setFormError(e.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={initial ? 'Editar evento' : 'Nuevo evento'} onClose={onClose}>
            {formError && (
                <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {formError}
                </div>
            )}

            <label style={fieldLabelStyle}>Título</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Examen parcial" />

            <label style={fieldLabelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles del evento" />

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Tipo</label>
                    <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
                        {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={fieldLabelStyle}>Fecha</label>
                    <input style={inputStyle} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <ActionButton label="Cancelar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)" textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)" onClick={onClose} />
                <ActionButton
                    label={saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear evento'}
                    bg="rgba(168,85,247,0.5)" hoverBg="rgba(168,85,247,0.7)" textColor="#fff" border="1px solid rgba(192,132,252,0.5)"
                    onClick={handleSubmit} disabled={saving || !title.trim() || !eventDate}
                />
            </div>
        </Modal>
    )
}

export default EventFormModal