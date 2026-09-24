import React from 'react'
import { useTranslation } from 'react-i18next'

interface ProfessorsPanelProps {
    professors: any[]
    loading: boolean
    onOpenModal: () => void
    onUnassign: (userId: string) => void
}

const ProfessorsPanel: React.FC<ProfessorsPanelProps> = ({
    professors,
    loading,
    onOpenModal,
    onUnassign,
}) => {
    const { t, i18n } = useTranslation()
    return (
    <div style={{
        background: 'rgba(108, 92, 231, 0.1)',
        border: '1px solid rgba(108, 92, 231, 0.3)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
    }}>
        <span style={{ color: '#c084fc', fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
            👨‍🏫 {i18n.language.startsWith('en') ? 'Professors:' : 'Profesores:'}
        </span>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
            {professors.length === 0 ? (
                <span style={{ color: 'white', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    {i18n.language.startsWith('en') ? 'No professors assigned' : 'Sin profesores asignados'}
                </span>
            ) : (
                professors.map(prof => (
                    <div key={prof.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(108, 92, 231, 0.25)',
                        border: '1px solid rgba(108, 92, 231, 0.5)',
                        borderRadius: '20px',
                        padding: '0.3rem 0.75rem 0.3rem 0.4rem',
                    }}>
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: '#6c5ce7', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff',
                        }}>
                            {(prof.full_name || prof.email || 'P').substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.875rem', color: '#d0d7f4ff' }}>
                            {prof.full_name || prof.email}
                        </span>
                        <button
                            onClick={() => onUnassign(prof.id)}
                            disabled={loading}
                            style={{
                                background: 'transparent', border: 'none', color: '#1f295a', opacity: 0.5,
                                cursor: 'pointer', fontSize: '0.8rem', padding: '0', lineHeight: 1,
                                display: 'flex', alignItems: 'center',
                            }}
                            title={i18n.language.startsWith('en') ? 'Unassign' : 'Desasignar'}
                        >
                            ✕
                        </button>
                    </div>
                ))
            )}
        </div>

        <button
            onClick={onOpenModal}
            disabled={loading}
            style={{
                background: 'rgba(108, 92, 231, 0.3)', border: '1px dashed rgba(108, 92, 231, 0.6)',
                color: '#c084fc', borderRadius: '20px', padding: '0.4rem 1rem',
                cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}
        >
            + {i18n.language.startsWith('en') ? 'Assign Professor' : 'Asignar Profesor'}
        </button>
    </div>
    )
}

export default ProfessorsPanel