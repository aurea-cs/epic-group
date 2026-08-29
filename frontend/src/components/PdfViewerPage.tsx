import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PdfViewerModal from './general/PdfViewerModal'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const PdfViewerPage: React.FC = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const url = searchParams.get('url')
    const itemId = searchParams.get('itemId')

    const [userId, setUserId] = useState<string | null>(null)
    const [assignment, setAssignment] = useState<any | null>(null)
    const [submission, setSubmission] = useState<any | null>(null)
    const [submittedRanges, setSubmittedRanges] = useState<Array<{pages: string, signed_url: string | null}>>([])
    const [pdfUrl, setPdfUrl] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (url) {
            setPdfUrl(decodeURIComponent(url))
        }
    }, [url])

    useEffect(() => {
        const loadUserAndAssignment = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setUserId(user.id)

                    if (itemId) {
                        const res = await fetch(`${API_URL}/api/assignments/by-item/${itemId}?student_id=${user.id}`)
                        if (res.ok) {
                            const data = await res.json()
                            if (data.id) {
                                setAssignment(data)
                                // Always keep the original PDF URL so students can interact
                                // with pages belonging to other open assignments.
                                // (The modal will lock already-submitted page ranges via submittedRanges.)
                                if (data.submitted_ranges?.length) {
                                    setSubmittedRanges(data.submitted_ranges)
                                }
                                if (data.submission) {
                                    setSubmission(data.submission)
                                    // Note: we intentionally do NOT replace pdfUrl with the submitted
                                    // file URL here — we always show the original workbook so other
                                    // open assignments on different pages remain accessible.
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading assignment context', err)
            } finally {
                setLoading(false)
            }
        }

        loadUserAndAssignment()
    }, [itemId])

    if (!url) {
        navigate(-1)
        return null
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>
                <p>Cargando información del documento...</p>
            </div>
        )
    }

    const handleSave = async (blob: Blob) => {
        setIsSaving(true)
        try {
            // 1. If there is an assignment and no submission yet
            if (assignment && userId && !submission) {
                console.log('Submitting assignment PDF response to backend...', blob.size, 'bytes')
                const formData = new FormData()
                formData.append('student_id', userId)
                formData.append('body_md', 'Entregado desde el lector de PDF interactivo.')
                
                // Get filename
                const originalName = url.split('/').pop()?.split('?')[0] || 'documento.pdf'
                const fileToUpload = new File([blob], `filled_${originalName}`, { type: 'application/pdf' })
                formData.append('files', fileToUpload)

                const res = await fetch(`${API_URL}/api/assignments/${assignment.id}/submit`, {
                    method: 'POST',
                    body: formData
                })

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || 'Error al enviar la entrega al servidor')
                }

                alert('¡Tu cuaderno de trabajo se ha guardado y entregado con éxito al profesor!')
                navigate(-1)
                return
            }

            // 2. Default fallback: trigger local download
            console.log('PDF Blob generated successfully (local download):', blob.size, 'bytes')
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = 'documento_con_respuestas.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);

            alert('¡El documento con tus respuestas y dibujos se ha guardado y descargado con éxito!');
        } catch (error: any) {
            console.error('Save error', error)
            alert(error.message || 'Error al guardar el PDF.')
        } finally {
            setIsSaving(false)
        }
    }

    // Hide save/submit button if already submitted (locked)
    const showSaveButton = !submission && !isSaving

    return (
        <PdfViewerModal
            url={pdfUrl}
            onClose={() => navigate(-1)}
            onSave={showSaveButton ? handleSave : undefined}
            itemId={itemId}
            studentId={userId}
            assignedPages={assignment?.assigned_pages}
            submittedRanges={submittedRanges}
        />
    )
}

export default PdfViewerPage