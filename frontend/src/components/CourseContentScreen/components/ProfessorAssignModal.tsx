import React from 'react'

interface ProfessorAssignModalProps {
    availableProfessors: any[]
    allCenterProfessors: any[]
    selectedIds: string[]
    loading: boolean
    onToggleSelect: (profId: string) => void
    onToggleSelectAll: (available: any[]) => void
    onAssign: () => void
    onClose: () => void
}

const ProfessorAssignModal: React.FC<ProfessorAssignModalProps> = ({
    availableProfessors,
    allCenterProfessors,
    selectedIds,
    loading,
    onToggleSelect,
    onToggleSelectAll,
    onAssign,
    onClose,
}) => {
    const allSelected = availableProfessors.length > 0 && selectedIds.length === availableProfessors.length

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="school-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                <div className="modal-header">
                    <div className="modal-icon">👨‍🏫</div>
                    <h2>Asignar Profesor a la Materia</h2>
                </div>

                <div style={{ padding: '0 0 1rem 0' }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
                        Selecciona uno o varios profesores del centro para asignarlos a esta materia.
                    </p>

                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '2rem' }}>
                            Cargando...
                        </p>
                    ) : availableProfessors.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '2rem', fontStyle: 'italic' }}>
                            {allCenterProfessors.length === 0
                                ? 'No hay profesores asignados al centro todavía.'
                                : 'Todos los profesores del centro ya están asignados a esta materia.'}
                        </p>
                    ) : (
                        <>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: '0.75rem', padding: '0 0.25rem',
                            }}>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem',
                                    cursor: 'pointer', userSelect: 'none',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={() => onToggleSelectAll(availableProfessors)}
                                        style={{ cursor: 'pointer', accentColor: '#6c5ce7', width: '16px', height: '16px' }}
                                    />
                                    Seleccionar todos ({availableProfessors.length})
                                </label>
                                {selectedIds.length > 0 && (
                                    <span style={{ fontSize: '0.85rem', color: '#a29bfe', fontWeight: 500 }}>
                                        {selectedIds.length} seleccionado(s)
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                                {availableProfessors.map(prof => {
                                    const isSelected = selectedIds.includes(prof.id)
                                    return (
                                        <div
                                            key={prof.id}
                                            onClick={() => onToggleSelect(prof.id)}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '0.75rem 1rem',
                                                background: isSelected ? 'rgba(108, 92, 231, 0.15)' : 'rgba(255,255,255,0.04)',
                                                borderRadius: '8px',
                                                border: isSelected ? '1px solid #6c5ce7' : '1px solid rgba(255,255,255,0.08)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }}
                                                    style={{ cursor: 'pointer', accentColor: '#6c5ce7', width: '16px', height: '16px' }}
                                                />
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: '#6c5ce7', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '0.85rem',
                                                }}>
                                                    {(prof.full_name || prof.email || 'P').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '500', color: '#fff' }}>{prof.full_name || 'Sin nombre'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{prof.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel-modern" onClick={onClose} disabled={loading}>
                        Cancelar
                    </button>
                    {availableProfessors.length > 0 && (
                        <button
                            className="btn-save-modern"
                            onClick={onAssign}
                            disabled={loading || selectedIds.length === 0}
                            style={{
                                opacity: selectedIds.length === 0 ? 0.5 : 1,
                                cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading
                                ? 'Asignando...'
                                : `Asignar ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProfessorAssignModal