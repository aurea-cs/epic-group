import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PdfViewerModal from './general/PdfViewerModal'

import { supabase } from '../lib/supabase' // ensure this path is correct or mock it if needed
// Let's just create a generic upload for now

const PdfViewerPage: React.FC = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const url = searchParams.get('url')

    if (!url) {
        navigate(-1)
        return null
    }

    const handleSave = async (blob: Blob) => {
        try {
            // For now, we will just download it to prove it works since we don't have the user's specific submission endpoint yet.
            // If they don't want downloads, we can just log it or upload it to a temp bucket.
            console.log('PDF Blob generated:', blob.size, 'bytes');
            alert('¡Respuestas procesadas correctamente y el PDF fue generado! (Simulación de guardado)');
            
            // To test it actually filled it:
            const objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl, '_blank');
        } catch (error) {
            console.error('Save error', error)
        }
    }

    return (
        <PdfViewerModal
            url={decodeURIComponent(url)}
            onClose={() => navigate(-1)}
            onSave={handleSave}
        />
    )
}

export default PdfViewerPage