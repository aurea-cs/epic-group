import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

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


interface ProfessorActionItem {
    id: string;
    title: string;
    created_at: string;
    type: 'assignment' | 'event';
    actionType: 'create' | 'delete' | 'update';
    subjectName: string;
    details?: string;
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

import { useTranslation } from 'react-i18next'

function getReadablePath(path: string, t: any): string {
    if (path.includes('/dashboard')) return t('userActivityModal.paths.dashboard')
    
    if (path.includes('/vr-room')) return t('userActivityModal.paths.vrRoom')
    if (path.includes('/pdf')) return t('userActivityModal.paths.readingPdf')
    
    if (path.includes('/items')) return t('userActivityModal.paths.roomsFlashcards')
    if (path.includes('/content')) return t('userActivityModal.paths.readingCourseContent')
    if (path.includes('/planet')) return t('userActivityModal.paths.exploringPlanet')
    
    if (path.includes('/course') || path.includes('/courses')) {
        return t('userActivityModal.paths.courseDetail')
    }

    if (path.includes('/alumnos/')) return t('userActivityModal.paths.studentProfile')
    if (path.includes('/course-map')) return t('userActivityModal.paths.courseMap')
    if (path.includes('/progress')) return t('userActivityModal.paths.progress')
    if (path.includes('/schedule') || path.includes('/calendar')) return t('userActivityModal.paths.organizingCalendar')
    if (path.includes('/assignments')) return t('userActivityModal.paths.assignments')
    
    if (path === '/unknown' || path === 'null') return t('userActivityModal.paths.previousActivity')
    
    return path
}

const UserActivityScreen: React.FC = () => {
    const { userId } = useParams<{ userId: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const state = location.state as { userName?: string } | null
    const userName = state?.userName || 'Usuario'

    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<ActivityResponse | null>(null)
    const [profActions, setProfActions] = useState<ProfessorActionItem[]>([])
    const [expandedActionId, setExpandedActionId] = useState<string | null>(null)

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const [resActivity, resProf] = await Promise.all([
                    fetch(`${API_URL}/api/users/${userId}/activity`),
                    fetch(`${API_URL}/api/users/${userId}/professor-actions`)
                ]);
                if (!resActivity.ok) throw new Error('Error al cargar la actividad')
                const jsonActivity = await resActivity.json()
                setData(jsonActivity)

                if (resProf.ok) {
                    const actionsArray = await resProf.json();
                    actionsArray.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    setProfActions(actionsArray);
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchActivity()
    }, [userId])

    const groupedSections = React.useMemo(() => {
        if (!data) return [];
        const map: Record<string, number> = {};
        data.sections.forEach(sec => {
            const readable = getReadablePath(sec.path, t);
            if (!map[readable]) map[readable] = 0;
            map[readable] += sec.seconds;
        });
        return Object.keys(map)
            .map(key => ({ path: key, seconds: map[key] }))
            .sort((a, b) => b.seconds - a.seconds)
            .slice(0, 10);
    }, [data]);

    return (
        <div style={{ padding: '2rem 4rem', width: '100%', boxSizing: 'border-box', color: '#ffffff' }}>
            {/* Header */}
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={() => navigate(-1)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: '45px', height: '45px',
                    borderRadius: '12px', cursor: 'pointer', fontSize: '1.4rem', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                    ←
                </button>
                <div>
                    <h2 style={{ margin: 0, fontSize: '2.5rem', color: '#ffffff', fontWeight: 800, letterSpacing: '-0.5px' }}>{t('userActivityModal.title')}</h2>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', marginTop: '0.4rem', fontSize: '1.1rem' }}>{userName} - {t('userActivityModal.last7Days')}</p>
                </div>
            </div>

            {/* Content */}
            <div>
                {loading && <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem' }}>{t('userActivityModal.loading')}</div>}
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1rem', borderRadius: '12px', color: '#fca5a5', textAlign: 'center' }}>{error}</div>}
                
                {!loading && !error && data && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                        
                        {/* Gráfico de Barras */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '24px',
                            padding: '2.5rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#ffffff'
                        }}>
                            <h3 style={{ margin: '0 0 2rem 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 700 }}>
                                <span>📅</span> {t('userActivityModal.dailyActivity')}
                            </h3>
                            
                            {data.daily.length === 0 || data.daily.reduce((s, d) => s + d.seconds, 0) === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.5)' }}>{t('userActivityModal.noDailyActivity')}</p>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                                    <div style={{
                                        width: '220px',
                                        height: '220px',
                                        borderRadius: '50%',
                                        background: `conic-gradient(${(() => {
                                            const totalSeconds = data.daily.reduce((sum, d) => sum + d.seconds, 0);
                                            let currentPercentage = 0;
                                            const colors = ['#c084fc', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#f472b6', '#2dd4bf'];
                                            return data.daily.map((day, idx) => {
                                                const percent = (day.seconds / totalSeconds) * 100;
                                                const start = currentPercentage;
                                                const end = currentPercentage + percent;
                                                currentPercentage = end;
                                                return `${colors[idx % colors.length]} ${start}% ${end}%`;
                                            }).join(', ');
                                        })()})`,
                                        flexShrink: 0,
                                        boxShadow: '0 0 30px rgba(0,0,0,0.5)'
                                    }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                        {data.daily.filter(d => d.seconds > 0).map((day, idx) => {
                                            const colors = ['#c084fc', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#f472b6', '#2dd4bf'];
                                            const color = colors[data.daily.indexOf(day) % colors.length];
                                            const totalSeconds = data.daily.reduce((sum, d) => sum + d.seconds, 0);
                                            const percent = ((day.seconds / totalSeconds) * 100).toFixed(1);
                                            return (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.95rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
                                                        <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{day.date}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                        <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{formatTime(day.seconds)}</span>
                                                        <span style={{ color: color, fontWeight: 'bold', width: '50px', textAlign: 'right' }}>{percent}%</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top Secciones */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '24px',
                            padding: '2.5rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <h3 style={{ margin: '0 0 2rem 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 700 }}>
                                <span>📍</span> {t('userActivityModal.topSections')}
                            </h3>
                            
                            {groupedSections.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.5)' }}>{t('userActivityModal.noSections')}</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                    {groupedSections.map((section, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ 
                                                    background: 'rgba(192,132,252,0.15)', color: '#d8b4fe', width: '32px', height: '32px', 
                                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid rgba(192,132,252,0.3)'
                                                }}>
                                                    {idx + 1}
                                                </div>
                                                <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: '1.05rem' }}>
                                                    {section.path}
                                                </div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                {formatTime(section.seconds)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Acciones Recientes (Profesor) */}
                        {profActions.length > 0 && (
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '24px',
                                padding: '2.5rem',
                                border: '1px solid rgba(255,255,255,0.08)',
                                gridColumn: '1 / -1',
                                color: '#ffffff'
                            }}>
                                <h3 style={{ margin: '0 0 2rem 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.4rem', fontWeight: 700 }}>
                                    <span>🛠️</span> {t('userActivityModal.recentActions', 'Acciones Recientes')}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {profActions.map((action) => {
                                        const isExpanded = expandedActionId === action.id;
                                        return (
                                            <div 
                                                key={action.id} 
                                                onClick={() => {
                                                    if (action.actionType === 'update' && action.details) {
                                                        setExpandedActionId(isExpanded ? null : action.id);
                                                    }
                                                }}
                                                style={{ 
                                                    background: isExpanded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', 
                                                    padding: '1.2rem 1.5rem', 
                                                    borderRadius: '16px', 
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    cursor: (action.actionType === 'update' && action.details) ? 'pointer' : 'default',
                                                    transition: 'all 0.2s'
                                                }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                        <div style={{ 
                                                            background: action.actionType === 'delete' ? 'rgba(239,68,68,0.15)' : (action.actionType === 'update' ? 'rgba(59,130,246,0.15)' : (action.type === 'assignment' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)')), 
                                                            color: action.actionType === 'delete' ? '#fca5a5' : (action.actionType === 'update' ? '#93c5fd' : (action.type === 'assignment' ? '#fcd34d' : '#6ee7b7')), 
                                                            width: '45px', height: '45px', 
                                                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 'bold', fontSize: '1.4rem',
                                                            border: `1px solid ${action.actionType === 'delete' ? 'rgba(239,68,68,0.3)' : (action.actionType === 'update' ? 'rgba(59,130,246,0.3)' : (action.type === 'assignment' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'))}`,
                                                            flexShrink: 0
                                                        }}>
                                                            {action.actionType === 'delete' ? '🗑️' : (action.actionType === 'update' ? '✏️' : (action.type === 'assignment' ? '📂' : '📅'))}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: action.actionType === 'delete' ? '#fca5a5' : (action.actionType === 'update' ? '#93c5fd' : '#ffffff'), marginBottom: '0.2rem' }}>
                                                                {action.actionType === 'delete' 
                                                                    ? (action.type === 'assignment' ? 'Eliminó una tarea' : 'Eliminó un evento')
                                                                    : action.actionType === 'update'
                                                                        ? (action.type === 'assignment' ? 'Actualizó una tarea' : 'Actualizó un evento')
                                                                        : (action.type === 'assignment' ? 'Creó una nueva tarea' : 'Creó un nuevo evento')}
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                                                                {action.title} - <span style={{ color: 'rgba(255,255,255,0.8)' }}>{action.subjectName}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div>
                                                            <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '0.2rem' }}>{new Date(action.created_at).toLocaleDateString()}</div>
                                                            <div>{new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </div>
                                                        {action.actionType === 'update' && action.details && (
                                                            <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', marginLeft: '0.5rem', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                                ▼
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {isExpanded && action.details && (
                                                    <div style={{ marginTop: '1.5rem', marginLeft: 'calc(45px + 1.25rem)', padding: '1.2rem', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', borderLeft: '3px solid #3b82f6' }}>
                                                        <div style={{ color: '#93c5fd', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.8rem' }}>Detalles de la edición:</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {action.details.split('; ').map((line, i) => (
                                                                <div key={i} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}>
                                                                    <span style={{ color: '#3b82f6' }}>•</span> 
                                                                    <span>{line}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default UserActivityScreen
