import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { getStudentProgress, type StudentData } from '../lib/api'

const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=random'

interface StudentProgressScreenProps {
    user: User
}

const StudentProgressScreen: React.FC<StudentProgressScreenProps> = ({ user }) => {
    const [dataLoading, setDataLoading] = useState(true)
    const [studentData, setStudentData] = useState<StudentData | null>(null)
    const [profileDetails, setProfileDetails] = useState<{ centers: string, grades: string, subjects: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()
    const { studentId } = useParams()
    const location = useLocation()

    useEffect(() => {
        const fetchStudentData = async () => {
            if (!studentId) {
                setError('No student ID provided')
                setDataLoading(false)
                return
            }

            try {
                setDataLoading(true)
                setError(null)

                // Fetch Profile Details
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/${studentId}/profile-details?role=student`)
                if (res.ok) {
                    const profileData = await res.json()
                    setProfileDetails(profileData)
                }

                const data = await getStudentProgress(studentId, user.id)
                setStudentData(data)
            } catch (err: any) {
                console.error('Error fetching student data:', err)
                setError('Error al cargar los datos del alumno')
            } finally {
                setDataLoading(false)
            }
        }

        fetchStudentData()
    }, [studentId, location.state, user.id])

    const handleBackToStudents = () => {
        navigate('/alumnos')
    }

    if (dataLoading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
    }

    if (error && !studentData) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
                <p>Error: {error}</p>
                <button onClick={handleBackToStudents} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Volver</button>
            </div>
        )
    }

    if (!studentData) return null

    return (
        <div style={{ padding: '2rem 4rem 8rem 4rem', backgroundColor: 'transparent', color: '#ffffff' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <button 
                        onClick={handleBackToStudents}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#ffffff', 
                            cursor: 'pointer', 
                            fontSize: '1rem', 
                            fontWeight: 'bold', 
                            marginBottom: '1rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem' 
                        }}
                    >
                        ← Volver a mis alumnos
                    </button>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>Perfil del Alumno</h1>
                    <p style={{ color: '#e2e8f0', fontSize: '1.1rem', marginTop: '0.5rem' }}>Información y progreso del estudiante en tus cursos</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Left Column - User Info Card */}
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #f1f5f9', marginBottom: '1.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                        <img src={studentData.avatar || defaultAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{studentData.name}</h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{studentData.email}</p>
                    
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid #bfdbfe' }}>
                        Rol: Alumno
                    </div>
                </div>

                {/* Right Column - Details & Activity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Details Card */}
                    <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>ℹ️</span> Información Académica
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Centros Educativos</div>
                                <div style={{ fontWeight: 'bold', color: '#334155' }}>{profileDetails ? profileDetails.centers : 'Cargando...'}</div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Grados</div>
                                <div style={{ fontWeight: 'bold', color: '#334155' }}>{profileDetails ? profileDetails.grades : 'Cargando...'}</div>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9', gridColumn: '1 / -1' }}>
                                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Materias Generales</div>
                                <div style={{ fontWeight: 'bold', color: '#334155' }}>{profileDetails ? profileDetails.subjects : 'Cargando...'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Activity / Progress Card */}
                    <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>📊</span> Tu Progreso
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {!studentData || studentData.courses.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No comparten cursos activos actualmente.</p>
                            ) : (
                                studentData.courses.map(course => (
                                    <div key={course.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', color: '#334155' }}>{course.name}</span>
                                            <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{course.progress}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{ width: `${course.progress}%`, height: '100%', background: '#2563eb', borderRadius: '6px' }}></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default StudentProgressScreen


