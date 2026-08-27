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
            console.log('PDF Blob generated successfully:', blob.size, 'bytes');

            // Trigger instant download of the filled PDF file with drawings
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = 'documento_con_respuestas.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);

            alert('¡El documento con tus respuestas y dibujos se ha guardado y descargado con éxito!');
        } catch (error) {
            console.error('Save error', error)
            alert('Error al descargar el PDF.');
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