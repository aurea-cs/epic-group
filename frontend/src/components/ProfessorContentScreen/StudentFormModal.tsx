import React, { useState } from 'react'
import { ActionButton, Modal, fieldLabelStyle, inputStyle } from '../general/SharedUI'
import ConfirmModal from '../general/ConfirmModal'
import CustomMultiSelect from '../general/CustomMultiSelect'
import './AssignmentFormModal.css'

interface Center {
    id: string
    name: string
}

interface Student {
    id: string
    name: string
    email: string
    avatar_url?: string
    created_at?: string
    centers: Center[]
}

interface StudentFormModalProps {
    initial: Student | null
    allCenters: Center[]
    onClose: () => void
    onSubmit: (payload: Omit<Student, 'id' | 'created_at'>) => Promise<void>
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({ initial, allCenters, onClose, onSubmit }) => {
    const [name, setName] = useState(initial?.name || '')
    const [email, setEmail] = useState(initial?.email || '')
    const [centerIds, setCenterIds] = useState(
        (initial?.centers || []).map(c => c.id).join(', ')
    )
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)

    const isDirty =
        name.trim() !== (initial?.name || '') ||
        email.trim() !== (initial?.email || '') ||
        centerIds !== (initial?.centers || []).map(c => c.id).join(', ')

    const handleAttemptClose = () => {
        if (!isDirty) return onClose()
        setShowConfirm(true)
    }

    const handleSubmit = async () => {
        if (!name.trim() || !email.trim()) return
        setSaving(true)
        setFormError(null)
        try {
            const selectedIds = centerIds.split(',').map(id => id.trim()).filter(Boolean)
            const centers = allCenters.filter(c => selectedIds.includes(c.id))
            await onSubmit({
                name: name.trim(),
                email: email.trim(),
                avatar_url: initial?.avatar_url,
                centers,
            })
        } catch (e: any) {
            setFormError(e.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal title={initial ? 'Editar alumno' : 'Nuevo alumno'} onClose={handleAttemptClose}>
            {formError && (
                <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {formError}
                </div>
            )}
            {showConfirm && (
                <ConfirmModal
                    message="¿Seguro que quieres cerrar? Perderás los cambios."
                    confirmLabel="Sí, cerrar"
                    cancelLabel="Seguir editando"
                    danger
                    onConfirm={onClose}
                    onCancel={() => setShowConfirm(false)}
                />
            )}

            <label style={fieldLabelStyle}>Nombre completo</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. María García López" />

            <label style={fieldLabelStyle}>Correo electrónico</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alumno@ejemplo.com" />

            <label style={fieldLabelStyle}>Centros inscritos</label>
            <CustomMultiSelect
                value={centerIds}
                onChange={setCenterIds}
                placeholder="Seleccionar centros"
                options={allCenters.map(c => ({ value: c.id, label: c.name }))}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <ActionButton label="Cancelar" bg="rgba(255,255,255,0.06)" hoverBg="rgba(255,255,255,0.12)" textColor="#e5e7eb" border="1px solid rgba(255,255,255,0.12)" onClick={handleAttemptClose} />
                <ActionButton
                    label={saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear alumno'}
                    bg="rgba(168,85,247,0.5)" hoverBg="rgba(168,85,247,0.7)" textColor="#fff" border="1px solid rgba(192,132,252,0.5)"
                    onClick={handleSubmit} disabled={saving || !name.trim() || !email.trim()}
                />
            </div>
        </Modal>
    )
}

export default StudentFormModal