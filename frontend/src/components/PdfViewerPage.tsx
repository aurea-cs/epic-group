import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PdfViewerModal from './general/PdfViewerModal'

const PdfViewerPage: React.FC = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const url = searchParams.get('url')

    if (!url) {
        navigate(-1)
        return null
    }

    return (
        <PdfViewerModal
            url={decodeURIComponent(url)}
            onClose={() => navigate(-1)}
        />
    )
}

export default PdfViewerPage