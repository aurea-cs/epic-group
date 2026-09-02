import React, { useState, useEffect, useCallback } from 'react'
import { getCenterProfessors, assignProfessor, unassignProfessor, assignSubjectProfessor } from '../lib/adminApi'
import UserActivityModal from './UserActivityModal'
import './HierarchyConfig.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignedProfessor {
    id: string
    email: string
    full_name: string | null
    avatar_url?: string | null
    total_time_seconds?: number
}

interface PlatformProfessor {
    id: string
    name: string
    email: string
    avatar_url?: string | null
    centers: { id: string; name: string }[]
}

interface UserData {
    email: string
    password: string
    full_name: string
    subject_ids?: string[]
}

export interface SubjectAssignmentResult {
    subjectId: string
    status: 'success' | 'already_assigned' | 'error'
    message: string
}

export interface DetailedUserResult {
    email: string
    fullName: string
    accountStatus: 'created' | 'already_exists' | 'error'
    accountMessage: string
    centerStatus: 'assigned' | 'already_assigned' | 'error' | 'skipped'
    centerMessage: string
    subjectResults: SubjectAssignmentResult[]
}

interface Results {
    success: number
    errors: number
    errorDetails: { email: string; error: string }[]
    processed: DetailedUserResult[]
}

function formatTime(totalSeconds?: number): string {
    if (!totalSeconds) return '0m'
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

interface TeacherManagementProps {
    centerId: string
    centerName?: string
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email: string): string {
    const str = name || email || '?'
    return str.substring(0, 2).toUpperCase()
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TeacherManagement: React.FC<TeacherManagementProps> = ({ centerId }) => {

    // ── Assigned professors ────────────────────────────────────────────
    const [assignedTeachers, setAssignedTeachers] = useState<AssignedProfessor[]>([])
    const [loadingAssigned, setLoadingAssigned] = useState(false)

    // ── Tabs ───────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'existing'>('manual')

    // ── Manual creation ────────────────────────────────────────────────
    const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: 'ingles2025' })
    const [creating, setCreating] = useState(false)

    // ── Existing professors search ─────────────────────────────────────
    const [allProfessors, setAllProfessors] = useState<PlatformProfessor[]>([])
    const [loadingAll, setLoadingAll] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [assigningId, setAssigningId] = useState<string | null>(null)

    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
    const [selectedTeacherName, setSelectedTeacherName] = useState<string>('')

    // ── CSV import ─────────────────────────────────────────────────────
    const [importing, setImporting] = useState(false)
    const [results, setResults] = useState<Results | null>(null)
    const [parsing, setParsing] = useState(false)

    // ── Unassign ───────────────────────────────────────────────────────
    const [unassigningId, setUnassigningId] = useState<string | null>(null)

    // ── Error banner ───────────────────────────────────────────────────
    const [error, setError] = useState<string | null>(null)

    // ─── Fetch assigned professors for this center ─────────────────────
    const fetchAssigned = useCallback(async () => {
        setLoadingAssigned(true)
        try {
            const data = await getCenterProfessors(centerId)
            setAssignedTeachers(data)
        } catch (err: any) {
            setError(err.message || 'Error al cargar profesores asignados')
        } finally {
            setLoadingAssigned(false)
        }
    }, [centerId])

    useEffect(() => { fetchAssigned() }, [fetchAssigned])

    // ─── Fetch ALL platform professors when "existing" tab opens ───────
    useEffect(() => {
        if (activeTab !== 'existing') return
        setAllProfessors([])
        setSearchQuery('')
        setLoadingAll(true)
        fetch(`${API}/api/professors`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
            .then(data => setAllProfessors(Array.isArray(data) ? data : []))
            .catch(err => setError(err.message || 'Error al cargar profesores'))
            .finally(() => setLoadingAll(false))
    }, [activeTab])

    // ─── Create professor + assign to center & subjects with detailed reporting ───
    const createAndAssignProfessorDetails = async (form: {
        fullName: string
        email: string
        password: string
        subjectIds?: string[]
    }): Promise<DetailedUserResult> => {
        const result: DetailedUserResult = {
            email: form.email,
            fullName: form.fullName,
            accountStatus: 'created',
            accountMessage: '',
            centerStatus: 'assigned',
            centerMessage: '',
            subjectResults: []
        }

        let userId: string | null = null

        // 1. Create or lookup user account
        try {
            const res = await fetch(`${API}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, password: form.password, fullName: form.fullName, role: 'professor' })
            })
            const data = await res.json()

            if (!res.ok) {
                const existing = allProfessors.find(p => p.email.toLowerCase() === form.email.toLowerCase()) ||
                    assignedTeachers.find(t => t.email.toLowerCase() === form.email.toLowerCase())
                if (existing) {
                    userId = existing.id
                    result.accountStatus = 'already_exists'
                    result.accountMessage = 'Usuario ya registrado previamente'
                } else {
                    result.accountStatus = 'error'
                    result.accountMessage = data.error || 'Error creando usuario'
                    result.centerStatus = 'skipped'
                    result.centerMessage = 'Omisión por fallo en cuenta'
                    return result
                }
            } else {
                if (data.alreadyExists) {
                    result.accountStatus = 'already_exists'
                    result.accountMessage = 'Usuario ya registrado previamente'
                } else {
                    result.accountStatus = 'created'
                    result.accountMessage = 'Usuario creado exitosamente'
                }
                userId = data.user?.id || null
            }
        } catch (err: any) {
            result.accountStatus = 'error'
            result.accountMessage = err.message || 'Error creando usuario'
            result.centerStatus = 'skipped'
            result.centerMessage = 'Omisión por fallo en cuenta'
            return result
        }

        // 2. Assign to Center
        if (userId) {
            try {
                const centerRes = await assignProfessor(centerId, userId)
                if (centerRes && (centerRes.alreadyAssigned || centerRes.message?.includes('already'))) {
                    result.centerStatus = 'already_assigned'
                    result.centerMessage = 'Ya asignado a este centro'
                } else {
                    result.centerStatus = 'assigned'
                    result.centerMessage = 'Asignado al centro exitosamente'
                }
            } catch (err: any) {
                if (err.message?.toLowerCase().includes('already') || err.message?.includes('23505')) {
                    result.centerStatus = 'already_assigned'
                    result.centerMessage = 'Ya asignado a este centro'
                } else {
                    result.centerStatus = 'error'
                    result.centerMessage = err.message || 'Error asignando al centro'
                }
            }

            // 3. Assign each Subject independently so errors in one don't block others
            if (form.subjectIds && form.subjectIds.length > 0) {
                for (const subId of form.subjectIds) {
                    const cleanSubId = subId.trim()
                    if (!cleanSubId) continue
                    try {
                        const subRes = await assignSubjectProfessor(cleanSubId, userId)
                        if (subRes && subRes.alreadyAssigned) {
                            result.subjectResults.push({
                                subjectId: cleanSubId,
                                status: 'already_assigned',
                                message: 'Ya asignado previamente a esta materia'
                            })
                        } else {
                            result.subjectResults.push({
                                subjectId: cleanSubId,
                                status: 'success',
                                message: 'Asignado a la materia exitosamente'
                            })
                        }
                    } catch (err: any) {
                        result.subjectResults.push({
                            subjectId: cleanSubId,
                            status: 'error',
                            message: err.message || 'Error al asignar la materia'
                        })
                    }
                }
            }
        }

        return result
    }

    const createAndAssignProfessor = async (form: { fullName: string; email: string; password: string; subjectIds?: string[] }) => {
        const detail = await createAndAssignProfessorDetails(form)
        if (detail.accountStatus === 'error') {
            throw new Error(detail.accountMessage)
        }
        return { email: form.email, fullName: form.fullName }
    }

    const handleCreateTeacher = async () => {
        if (!createForm.fullName || !createForm.email || !createForm.password) {
            setError('Todos los campos son requeridos.')
            return
        }
        setCreating(true)
        setError(null)
        try {
            await createAndAssignProfessor(createForm)
            setCreateForm({ fullName: '', email: '', password: 'ingles2025' })
            alert('Profesor procesado exitosamente')
            fetchAssigned()
        } catch (err: any) {
            setError(err.message || 'Error al crear profesor')
        } finally {
            setCreating(false)
        }
    }

    // ─── Assign an existing platform professor ─────────────────────────
    const handleAssignExisting = async (prof: PlatformProfessor) => {
        const alreadyAssigned = assignedTeachers.some(t => t.id === prof.id)
        if (alreadyAssigned) {
            alert(`${prof.name} ya está asignado a este centro.`)
            return
        }
        setAssigningId(prof.id)
        try {
            await assignProfessor(centerId, prof.id)
            alert(`${prof.name} asignado/a exitosamente a este centro.`)
            fetchAssigned()
        } catch (err: any) {
            alert(err.message || 'Error al asignar profesor')
        } finally {
            setAssigningId(null)
        }
    }

    // ─── Unassign professor from center ───────────────────────────────
    const handleUnassign = async (teacher: AssignedProfessor) => {
        if (!confirm(`¿Desasignar a ${teacher.full_name || teacher.email} de este centro?`)) return
        setUnassigningId(teacher.id)
        try {
            await unassignProfessor(centerId, teacher.id)
            setAssignedTeachers(prev => prev.filter(t => t.id !== teacher.id))
        } catch (err: any) {
            alert(err.message || 'Error al desasignar profesor')
        } finally {
            setUnassigningId(null)
        }
    }

    // ─── CSV import ────────────────────────────────────────────────────
    const importCsvProfessors = async (users: UserData[]) => {
        setImporting(true)
        setResults(null)
        const res: Results = { success: 0, errors: 0, errorDetails: [], processed: [] }
        for (const user of users) {
            const detail = await createAndAssignProfessorDetails({
                fullName: user.full_name,
                email: user.email,
                password: user.password,
                subjectIds: user.subject_ids
            })

            res.processed.push(detail)

            const hasError = detail.accountStatus === 'error' ||
                detail.centerStatus === 'error' ||
                detail.subjectResults.some(s => s.status === 'error')

            if (hasError) {
                res.errors++
                const errMsgs: string[] = []
                if (detail.accountStatus === 'error') errMsgs.push(`Cuenta: ${detail.accountMessage}`)
                if (detail.centerStatus === 'error') errMsgs.push(`Centro: ${detail.centerMessage}`)
                detail.subjectResults.filter(s => s.status === 'error').forEach(s => {
                    errMsgs.push(`Materia [${s.subjectId}]: ${s.message}`)
                })
                res.errorDetails.push({ email: user.email, error: errMsgs.join(' | ') })
            } else {
                res.success++
            }
            await new Promise(r => setTimeout(r, 50))
        }
        setResults(res)
        setImporting(false)
        fetchAssigned()
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        setParsing(true)
        const reader = new FileReader()
        reader.onload = async (e) => {
            const text = e.target?.result as string
            if (!text) return
            const lines = text.split(/\r\n|\n/)
            const parsed: UserData[] = []
            let start = 0

            let emailCol = 0
            let passCol = 1
            let nameCol = 2
            let subjectCols: number[] = [3, 4, 5, 6, 7, 8]

            if (lines[0].toLowerCase().includes('email')) {
                start = 1
                const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
                const eIdx = headers.findIndex(h => h.includes('email'))
                const pIdx = headers.findIndex(h => h.includes('pass'))
                const nIdx = headers.findIndex(h => h.includes('name') || h.includes('nombre'))

                if (eIdx !== -1) emailCol = eIdx
                if (pIdx !== -1) passCol = pIdx
                if (nIdx !== -1) nameCol = nIdx

                const foundSubjectCols: number[] = []
                headers.forEach((h, idx) => {
                    if (h.includes('subject') || h.includes('materia')) {
                        foundSubjectCols.push(idx)
                    }
                })

                if (foundSubjectCols.length > 0) {
                    subjectCols = foundSubjectCols.slice(0, 6)
                }
            }

            for (let i = start; i < lines.length; i++) {
                const line = lines[i].trim()
                if (!line) continue
                const parts = line.split(',')
                if (parts.length >= 3) {
                    const email = parts[emailCol]?.trim() || ''
                    const password = parts[passCol]?.trim() || 'ingles2025'
                    const full_name = parts[nameCol]?.trim() || ''

                    const subject_ids: string[] = []
                    for (const colIdx of subjectCols) {
                        const val = parts[colIdx]?.trim()
                        if (val && !subject_ids.includes(val)) {
                            subject_ids.push(val)
                        }
                    }

                    if (email && full_name) {
                        parsed.push({ email, password, full_name, subject_ids })
                    }
                }
            }
            if (confirm(`Se encontraron ${parsed.length} profesores en el CSV. ¿Importar ahora?`)) {
                await importCsvProfessors(parsed)
            }
            setParsing(false)
            if (event.target) event.target.value = ''
        }
        reader.readAsText(file)
    }

    // ─── Filtered search results ───────────────────────────────────────
    const filteredProfessors = searchQuery.trim().length < 1
        ? allProfessors
        : allProfessors.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email.toLowerCase().includes(searchQuery.toLowerCase())
        )

    // ─── Render ────────────────────────────────────────────────────────
    return (
        <div className="hierarchy-config-modal-panel" style={{ marginTop: 0, color: '#fff' }}>

            {/* Error Banner */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '0.88rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="admin-tabs" style={{ background: 'transparent' }}>
                <div className="tabs-container">
                    <button className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')} style={{ color: activeTab === 'manual' ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                        👤 Crear Manualmente
                    </button>
                    <button className={`tab-button ${activeTab === 'csv' ? 'active' : ''}`} onClick={() => setActiveTab('csv')} style={{ color: activeTab === 'csv' ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                        📂 Importar desde CSV
                    </button>
                    <button className={`tab-button ${activeTab === 'existing' ? 'active' : ''}`} onClick={() => setActiveTab('existing')} style={{ color: activeTab === 'existing' ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                        🔍 Buscar Existente
                    </button>
                </div>
            </div>

            {/* ── Manual Tab ── */}
            {activeTab === 'manual' && (
                <div className="form-grid">
                    <h4 style={{ color: '#ffffff', margin: 0, textAlign: 'center' }}>Registrar Nuevo Profesor</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px', margin: '1rem auto 0 auto', width: '100%' }}>
                        <div className="form-group">
                            <label style={{ color: '#ffffff', fontWeight: 'bold' }}>Nombre Completo *</label>
                            <input
                                type="text"
                                value={createForm.fullName}
                                onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                                placeholder="Ej: Juan García"
                                className="modern-input"
                                style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ color: '#ffffff', fontWeight: 'bold' }}>Correo Electrónico *</label>
                            <input
                                type="email"
                                value={createForm.email}
                                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                placeholder="profesor@escuela.com"
                                className="modern-input"
                                style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ color: '#ffffff', fontWeight: 'bold' }}>Contraseña *</label>
                            <input
                                type="text"
                                value={createForm.password}
                                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                placeholder="Contraseña temporal"
                                className="modern-input"
                                style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                            />
                        </div>
                        <button
                            className="btn-save-modern"
                            onClick={handleCreateTeacher}
                            disabled={!createForm.fullName || !createForm.email || !createForm.password || creating}
                            style={{ height: '46px', marginTop: 'auto', background: (!createForm.fullName || !createForm.email || !createForm.password || creating) ? 'rgba(192,132,252,0.35)' : 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', border: 'none', boxShadow: (!createForm.fullName || !createForm.email || !createForm.password || creating) ? 'none' : '0 4px 15px rgba(168,85,247,0.35)' }}
                        >
                            {creating ? 'Creando...' : '✓ Crear Profesor'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Existing Professor Tab ── */}
            {activeTab === 'existing' && (
                <div className="form-grid">
                    <h4 style={{ color: '#ffffff', margin: 0, textAlign: 'center' }}>Asignar Profesor Existente</h4>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        className="modern-input"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ marginBottom: '1rem', width: '100%', background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                        autoFocus
                    />
                    <div className="users-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {loadingAll ? (
                            <p style={{ color: 'rgba(255,255,255,0.7)', padding: '20px', textAlign: 'center' }}>Cargando profesores...</p>
                        ) : (
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th style={{ color: '#c084fc' }}>Nombre</th>
                                        <th style={{ color: '#c084fc' }}>Email</th>
                                        <th style={{ color: '#c084fc' }}>Centros</th>
                                        <th style={{ color: '#c084fc' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProfessors.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                                {searchQuery ? 'Sin resultados para esa búsqueda.' : 'No hay profesores registrados en la plataforma.'}
                                            </td>
                                        </tr>
                                    ) : filteredProfessors.map(prof => {
                                        const alreadyHere = assignedTeachers.some(t => t.id === prof.id)
                                        return (
                                            <tr key={prof.id}>
                                                <td style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{prof.name}</td>
                                                <td style={{ color: 'rgba(255,255,255,0.6)' }}>{prof.email}</td>
                                                <td style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
                                                    {prof.centers.length === 0
                                                        ? <span style={{ color: '#fbbf24' }}>Sin centros</span>
                                                        : prof.centers.map(c => c.name).join(', ')
                                                    }
                                                </td>
                                                <td>
                                                    {alreadyHere ? (
                                                        <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: 600 }}>✓ Asignado</span>
                                                    ) : (
                                                        <button
                                                            className="btn-save-modern"
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#ffffff', border: 'none' }}
                                                            disabled={assigningId === prof.id}
                                                            onClick={() => handleAssignExisting(prof)}
                                                        >
                                                            {assigningId === prof.id ? 'Asignando...' : 'Asignar'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ── CSV Tab ── */}
            {activeTab === 'csv' && (
                <div className="csv-upload-subject">
                    <h4 style={{ color: '#ffffff', textAlign: 'center' }}>Subir Archivo CSV</h4>
                    <div className="csv-helper-text" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Formato requerido: <code style={{ color: '#a855f7', background: 'rgba(168,85,247,0.1)' }}>email, password, full_name, subject_1, subject_2, ..., subject_6 (opcionales)</code>
                        <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                            Puedes incluir hasta 6 campos opcionales para IDs de materias (<code>subject_1</code> a <code>subject_6</code>) para asignar el profesor a múltiples materias al importar.
                        </div>
                    </div>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="modern-input"
                        style={{ maxWidth: '400px', margin: '0 auto', background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                        disabled={parsing || importing}
                    />
                    {(parsing || importing) && (
                        <p style={{ color: '#c084fc', textAlign: 'center', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                            {parsing ? 'Procesando archivo...' : `Importando profesores...`}
                        </p>
                    )}
                </div>
            )}

            {/* ── Import Results ── */}
            {results && (
                <div className="results-section" style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    margin: '1.5rem 0',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem' }}>📈 Resultados de Importación</h3>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto' }}>
                        {results.processed.map((item, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(0,0,0,0.25)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                padding: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                    <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{item.fullName || item.email}</span>
                                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{item.email}</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                                    {/* Account Badge */}
                                    <span style={{
                                        padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 500,
                                        background: item.accountStatus === 'created' ? 'rgba(16,185,129,0.2)' : item.accountStatus === 'already_exists' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)',
                                        color: item.accountStatus === 'created' ? '#10b981' : item.accountStatus === 'already_exists' ? '#60a5fa' : '#f87171'
                                    }}>
                                        Cuenta: {item.accountMessage}
                                    </span>
                                    {/* Center Badge */}
                                    <span style={{
                                        padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 500,
                                        background: item.centerStatus === 'assigned' ? 'rgba(16,185,129,0.2)' : item.centerStatus === 'already_assigned' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)',
                                        color: item.centerStatus === 'assigned' ? '#10b981' : item.centerStatus === 'already_assigned' ? '#60a5fa' : '#f87171'
                                    }}>
                                        Centro: {item.centerMessage}
                                    </span>
                                </div>

                                {/* Subjects Detailed Breakdown */}
                                {item.subjectResults.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.6rem', paddingLeft: '0.75rem', borderLeft: '3px solid #a855f7', fontSize: '0.82rem' }}>
                                        {item.subjectResults.map((sub, sIdx) => (
                                            <div key={sIdx} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                color: sub.status === 'success' ? '#34d399' : sub.status === 'already_assigned' ? '#93c5fd' : '#f87171'
                                            }}>
                                                <span>{sub.status === 'success' ? '✓' : sub.status === 'already_assigned' ? 'ℹ' : '✕'}</span>
                                                <span>Materia <code style={{ color: '#c084fc', background: 'rgba(192,132,252,0.1)', padding: '1px 5px', borderRadius: '3px' }}>{sub.subjectId}</code>: {sub.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Assigned Professors List ── */}
            <div className="user-list-section">
                <h3 style={{ color: '#c084fc', fontSize: '1.2rem', margin: '2rem 0 1rem' }}>
                    📋 Profesores Asignados a este Centro ({loadingAssigned ? '...' : assignedTeachers.length})
                </h3>
                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th style={{ color: '#c084fc', width: '52px' }}></th>
                                <th style={{ color: '#c084fc' }}>Nombre</th>
                                <th style={{ color: '#c084fc' }}>Email</th>
                                <th style={{ color: '#c084fc' }}>Acciones</th>
                                <th>Avatar</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Tiempo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingAssigned ? (
                                <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#1f295a' }}>Cargando...</td></tr>
                            ) : assignedTeachers.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#4b5563' }}>No hay profesores asignados a este centro.</td></tr>
                            ) : assignedTeachers.map(teacher => (
                                <tr key={teacher.id}>
                                    <td style={{ width: '52px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #1f295a, #4c63b6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', color: '#fff', fontSize: '0.85rem'
                                        }}>
                                            {initials(teacher.full_name, teacher.email)}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500, color: '#1f295a' }}>{teacher.full_name || 'Profesor'}</td>
                                    <td style={{ color: '#4b5563' }}>{teacher.email}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', color: '#334155' }}>⏱️ {formatTime(teacher.total_time_seconds)}</span>
                                            <button
                                                onClick={() => {
                                                    setSelectedTeacherId(teacher.id)
                                                    setSelectedTeacherName(teacher.full_name || teacher.email)
                                                }}
                                                style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#cbd5e1'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                            >
                                                Ver más
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleUnassign(teacher)}
                                            className="action-btn delete"
                                            disabled={unassigningId === teacher.id}
                                        >
                                            {unassigningId === teacher.id ? '...' : 'Desasignar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loadingAssigned && assignedTeachers.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#4b5563' }}>
                                        No hay maestros asignados a este colegio.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {selectedTeacherId && (
                <UserActivityModal
                    userId={selectedTeacherId}
                    userName={selectedTeacherName}
                    onClose={() => setSelectedTeacherId(null)}
                />
            )}
        </div>
    )
}

export default TeacherManagement
