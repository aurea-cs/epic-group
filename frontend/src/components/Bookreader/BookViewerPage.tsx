import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BookViewer from './BookViewer'

const BookViewerPage: React.FC = () => {
    const navigate = useNavigate()
    const { itemId } = useParams<{ itemId: string }>()

    if (!itemId) {
        navigate(-1)
        return null
    }

    return (
        <BookViewer
            itemId={itemId}
            onClose={() => navigate(-1)}
        />
    )
}

export default BookViewerPage