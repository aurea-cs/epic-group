import React, { useEffect, useState } from 'react'

interface DailyActivity {
    date: string
    seconds: number
}

interface PathActivity {
    path: string
    seconds: number
}

interface ActivityResponse {
    daily: DailyActivity[]
    sections: PathActivity[]
}

interface UserActivityModalProps {
    userId: string
    userName: string
    onClose: () => void
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function formatTime(totalSeconds: number): string {
    if (!totalSeconds) return '0s'
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

function getReadablePath(path: string): string {
    if (path.startsWith('/dashboard')) return 'Dashboard Principal'
    if (path.startsWith('/course/')) {
        if (path.includes('/content/')) return 'Leyendo Contenido de Curso'
        if (path.includes('/planet/')) return 'Explorando Planeta (Módulo)'
        return 'Detalle de Curso'
    }
    if (path.startsWith('/alumnos/')) return 'Perfil de Alumno'
    if (path.startsWith('/course-map')) return 'Mapa del Curso'
    if (path.startsWith('/progress')) return 'Progreso'
    if (path.startsWith('/schedule') || path.startsWith('/calendar')) return 'Calendario / Horario'
    if (path.startsWith('/assignments')) return 'Tareas'
    if (path === '/unknown' || path === 'null') return 'Actividad Anterior'
    return path
}

const UserActivityModal: React.FC<UserActivityModalProps> = ({ userId, userName, onClose }) => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<ActivityResponse | null>(null)

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch(`${API_URL}/api/users/${userId}/activity`)
                if (!res.ok) throw new Error('Error al cargar la actividad')
                const json = await res.json()
                setData(json)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchActivity()
    }, [userId])

    const maxDailySeconds = data?.daily.reduce((max, d) => Math.max(max, d.seconds), 0) || 1

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Actividad Detallada</h2>
                        <p style={{ margin: 0, color: '#64748b', marginTop: '0.5rem' }}>{userName} (Últimos 7 días)</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: '#f1f5f9', border: 'none', width: '40px', height: '40px',
                        borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem', color: '#475569'
                    }}>
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem' }}>
                    {loading && <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando actividad...</div>}
                    {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
                    
                    {!loading && !error && data && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>
                            
                            {/* Gráfico de Barras */}
                            <div>
                                <h3 style={{ margin: '0 0 1.5rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📅</span> Actividad Diaria
                                </h3>
                                
                                {data.daily.length === 0 || data.daily.reduce((s, d) => s + d.seconds, 0) === 0 ? (
                                    <p style={{ color: '#94a3b8' }}>No hay actividad registrada en los últimos 7 días.</p>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
                                        <div style={{
                                            width: '200px',
                                            height: '200px',
                                            borderRadius: '50%',
                                            background: `conic-gradient(${(() => {
                                                const totalSeconds = data.daily.reduce((sum, d) => sum + d.seconds, 0);
                                                let currentPercentage = 0;
                                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
                                                return data.daily.map((day, idx) => {
                                                    const percent = (day.seconds / totalSeconds) * 100;
                                                    const start = currentPercentage;
                                                    const end = currentPercentage + percent;
                                                    currentPercentage = end;
                                                    return `${colors[idx % colors.length]} ${start}% ${end}%`;
                                                }).join(', ');
                                            })()})`,
                                            flexShrink: 0,
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                                            {data.daily.filter(d => d.seconds > 0).map((day, idx) => {
                                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
                                                const color = colors[data.daily.indexOf(day) % colors.length];
                                                const totalSeconds = data.daily.reduce((sum, d) => sum + d.seconds, 0);
                                                const percent = ((day.seconds / totalSeconds) * 100).toFixed(1);
                                                return (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }} />
                                                            <span style={{ color: '#475569', fontWeight: '500' }}>{day.date}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <span style={{ color: '#64748b', fontWeight: 'bold' }}>{formatTime(day.seconds)}</span>
                                                            <span style={{ color: color, fontWeight: 'bold', width: '45px', textAlign: 'right' }}>{percent}%</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Secciones */}
                            <div>
                                <h3 style={{ margin: '0 0 1.5rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📍</span> Secciones más visitadas
                                </h3>
                                
                                {data.sections.length === 0 ? (
                                    <p style={{ color: '#94a3b8' }}>No hay secciones registradas.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {data.sections.map((section, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ 
                                                        background: '#e0e7ff', color: '#4f46e5', width: '30px', height: '30px', 
                                                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 'bold', fontSize: '0.9rem'
                                                    }}>
                                                        {idx + 1}
                                                    </div>
                                                    <div style={{ fontWeight: 'bold', color: '#334155' }}>
                                                        {getReadablePath(section.path)}
                                                    </div>
                                                </div>
                                                <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                    {formatTime(section.seconds)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UserActivityModal
