import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import {
    getCenters,
    createCenter,
    updateCenter,
    deleteCenter,
    getHierarchy,
    type Hierarchy,
    createGrade as _createGrade,
    updateGrade as _updateGrade,
    deleteGrade as _deleteGrade,
    createSubject as _createSubject,
    updateSubject as _updateSubject,
    deleteSubject as _deleteSubject,
    type EducationalCenter,
    type GradeLevel as _GradeLevel,
    type Subject as _Subject,
} from '../lib/adminApi'
import { User } from '@supabase/supabase-js'
import './HierarchyConfig.css'
import './ProfessorDashboard.css' 
import ConfirmModal from './general/ConfirmModal'

interface HierarchyConfigProps {
    user: User
}

const HierarchyConfig: React.FC<HierarchyConfigProps> = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()

    // State for deletion
    const [confirmDeleteCenter, setConfirmDeleteCenter] = useState<EducationalCenter | null>(null)
    
    // State for data
    const [centers, setCenters] = useState<EducationalCenter[]>([])
    const [selectedCenter, setSelectedCenter] = useState<EducationalCenter | null>(null)

    // State for loading and errors
    const [loading, setLoading] = useState(false)
    const [_error, setError] = useState<string | null>(null)

    // State for modals
    const [showCenterModal, setShowCenterModal] = useState(false)
    // State for forms
    const [centerForm, setCenterForm] = useState({ name: '', address: '', phone: '', email: '', vr_code: '' })
    const [_gradeForm, _setGradeForm] = useState({ name: '', level: 0 })
    const [_subjectForm, _setSubjectForm] = useState({ name: '', description: '', hours_per_week: 0 })

    // State for editing
    const [editingCenter, setEditingCenter] = useState<EducationalCenter | null>(null)

    // State for hierarchy view
    const [activeCenterId,] = useState<string>('')
    const [, setHierarchy] = useState<Hierarchy | null>(null)

    // Load centers on mount
    useEffect(() => {
        loadCenters()
    }, [])

    useEffect(() => {
        if (activeCenterId) {
            loadHierarchy(activeCenterId)
        } else {
            setHierarchy(null)
        }
    }, [activeCenterId])

    const loadHierarchy = async (id: string) => {
        try {
            setLoading(true)
            const data = await getHierarchy(id)
            setHierarchy(data)
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos de la escuela')
        } finally {
            setLoading(false)
        }
    }

    const loadCenters = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getCenters()
            setCenters(data)
        } catch (err: any) {
            setError(err.message || 'Error al cargar centros educativos')
        } finally {
            setLoading(false)
        }
    }

    // ========== CENTER FUNCTIONS ==========

    const handleCreateCenter = () => {
        setCenterForm({ name: '', address: '', phone: '', email: '', vr_code: '' })
        setEditingCenter(null)
        setShowCenterModal(true)
    }

    const handleEditCenter = (center: EducationalCenter) => {
        setCenterForm({
            name: center.name,
            address: center.address || '',
            phone: center.phone || '',
            email: center.email || '',
            vr_code: center.vr_code || '',
        })
        setEditingCenter(center)
        setShowCenterModal(true)
    }

    const handleSaveCenter = async () => {
        try {
            setLoading(true)
            if (editingCenter) {
                await updateCenter(editingCenter.id, centerForm)
            } else {
                await createCenter(centerForm)
            }
            await loadCenters()
            setShowCenterModal(false)
        } catch (err: any) {
            setError(err.message || 'Error al guardar centro')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteCenter = async (id: string) => {
        try {
            setLoading(true)
            await deleteCenter(id)
            await loadCenters()
            if (selectedCenter?.id === id) {
                setSelectedCenter(null)
            }
        } catch (err: any) {
            setError(err.message || 'Error al eliminar centro')
        } finally {
            setConfirmDeleteCenter(null)
            setLoading(false)
        }
    }

    return (
        <>
            <div className="professor-dashboard-container" style={{ padding: '2rem' }}>
                <div className="prof-main-col" style={{ width: '100%' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2 className="section-title-modern" style={{ color: 'white' }}>{t('adminCenters.title')}</h2>
                        <div className="add-dropdown-container" style={{ position: 'relative' }}>
                            <button
                                onClick={() => handleCreateCenter()}
                                style={{
                                    background: '#d966ff',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {t('adminCenters.newCenter')}
                            </button>
                        </div>
                    </div>

                    <div className="classes-grid" style={{ marginTop: '1.5rem' }}>
                        {loading && !centers.length ? (
                            <p style={{ gridColumn: '1 / -1' }}>{t('adminCenters.loading')}</p>
                        ) : centers.length === 0 ? (
                            <p style={{ gridColumn: '1 / -1', color: '#64748b' }}>{t('adminCenters.noCenters')}</p>
                        ) : (
                            centers.map(center => (
                                <div key={center.id} className="class-card" style={{ position: 'relative', background: 'white', color: '#310041c0' }} onClick={() => navigate(`/admin/school/${center.id}`)}>
                                    <div className="class-header">
                                        <h3 style={{ color: '#310041ff' }}>{center.name}</h3>
                                    </div>
                                    <div className="class-stats">
                                        <div className="stat-row">
                                            <span>{center.address || t('adminCenters.noAddress')}</span>
                                        </div>
                                    </div>
                                    <div className="class-stats">
                                        <div className="stat-row">
                                            <span className="stat-icon">📞</span>
                                            <span>{center.phone || t('adminCenters.noPhone')}</span>
                                        </div>
                                    </div>
                                    <div className="class-stats">
                                        <div className="stat-row">
                                            <span className="stat-icon">✉️</span>
                                            <span>{center.email || t('adminCenters.noEmail')}</span>
                                        </div>
                                    </div>
                                    <div className="item-actions" style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEditCenter(center)
                                            }}
                                            title={t('adminCenters.editTooltip')}
                                            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setConfirmDeleteCenter(center)
                                            }}
                                            title={t('adminCenters.deleteTooltip')}
                                            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </div>

                {/* Styled Type Form Modal */}
                {showCenterModal && (
                    <div className="modal-overlay" onClick={() => setShowCenterModal(false)}>
                        <div className="school-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-icon">
                                    {editingCenter ? '✏️' : '🏫'}
                                </div>
                                <h2>{editingCenter ? t('adminCenters.editCenterTitle') : t('adminCenters.newCenterTitle')}</h2>
                                <p>{t('adminCenters.modalSubtitle')}</p>
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label>{t('adminCenters.nameLabel')}</label>
                                    <input
                                        type="text"
                                        value={centerForm.name}
                                        onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                                        placeholder={t('adminCenters.namePlaceholder')}
                                        className="modern-input"
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('adminCenters.addressLabel')}</label>
                                    <input
                                        type="text"
                                        value={centerForm.address}
                                        onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                                        placeholder={t('adminCenters.addressPlaceholder')}
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('adminCenters.phoneLabel')}</label>
                                    <input
                                        type="text"
                                        value={centerForm.phone}
                                        onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })}
                                        placeholder={t('adminCenters.phonePlaceholder')}
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('adminCenters.emailLabel')}</label>
                                    <input
                                        type="email"
                                        value={centerForm.email}
                                        onChange={(e) => setCenterForm({ ...centerForm, email: e.target.value })}
                                        placeholder={t('adminCenters.emailPlaceholder')}
                                        className="modern-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('adminCenters.vrCodeLabel')}</label>
                                    <input
                                        type="text"
                                        value={centerForm.vr_code}
                                        onChange={(e) => setCenterForm({ ...centerForm, vr_code: e.target.value })}
                                        placeholder={t('adminCenters.vrCodePlaceholder')}
                                        className="modern-input"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn-cancel-modern" onClick={() => setShowCenterModal(false)}>
                                    {t('adminCenters.cancel')}
                                </button>
                                <button
                                    className="btn-save-modern"
                                    onClick={handleSaveCenter}
                                    disabled={!centerForm.name || loading}
                                >
                                    {loading ? t('adminCenters.saving') : t('adminCenters.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                { confirmDeleteCenter !== null && (
                    <ConfirmModal
                        message={t('adminCenters.deleteConfirmMsg')}
                        onConfirm={()=>handleDeleteCenter(confirmDeleteCenter.id)}
                        onCancel={() => setConfirmDeleteCenter(null)}
                        confirmLabel={t('adminCenters.deleteConfirmBtn')}
                        danger
                    />
                )}
            </div>
        </>
    )
}

export default HierarchyConfig
