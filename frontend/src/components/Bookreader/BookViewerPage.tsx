import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BookViewer from './BookViewer'
import { supabase } from '../../lib/supabase'

const BookViewerPage: React.FC = () => {
    const navigate = useNavigate()
    const { itemId } = useParams<{ itemId: string }>()
    const [studentId, setStudentId] = useState<string | undefined>(undefined)

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser()
                if (user && !error) {
                    setStudentId(user.id)
                }
            } catch (err) {
                console.error('Error fetching authenticated user for BookViewer:', err)
            }
        }
        fetchUser()
    }, [])

    if (!itemId) {
        navigate(-1)
        return null
    }

    return (
        <BookViewer
            itemId={itemId}
            studentId={studentId}
            onClose={() => navigate(-1)}
        />
    )
}

export default BookViewerPage