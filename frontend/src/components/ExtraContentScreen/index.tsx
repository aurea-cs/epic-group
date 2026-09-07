import React, { useState } from 'react'
import { User } from '@supabase/supabase-js'
import CategoriesTab from './components/categoriesTab'
import ExitTicketsTab from './components/exitTicketsTab'
import { useExitTickets } from './hooks/useExitTickets'
import './ExtraContentScreen.css'

interface ExtraContentScreenProps {
    user: User
}

const HARDCODED_CENTER_ID = '3162dec3-a792-44d6-9868-1c9682d215c3'

const ExtraContentScreen: React.FC<ExtraContentScreenProps> = () => {
    const [activeTab, setActiveTab] = useState<'categories' | 'exit_tickets'>('categories')

    // Owned here (once) and passed down, so switching tabs back and forth
    // doesn't refetch the list, and the nav-tab label can show a live count.
    const { exitTickets, loading, error, reload, remove } = useExitTickets()

    return (
        <div className="extra-content-screen">
            <div className="extra-content-container">
                <div className="extra-content-header">
                    <h1>[Bajo Construcción] Gestión de Contenido Global</h1>
                    <p>No tocar</p>
                    <div className="center-badge">
                        <span>Centro Base:</span> {HARDCODED_CENTER_ID}
                    </div>
                </div>

                <div className="extra-nav-tabs">
                    <button
                        className={`extra-nav-tab ${activeTab === 'categories' ? 'active' : ''}`}
                        onClick={() => setActiveTab('categories')}
                    >
                        <span>📚</span>
                        <span>Contenido por Grado / Materia</span>
                    </button>
                    <button
                        className={`extra-nav-tab ${activeTab === 'exit_tickets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('exit_tickets')}
                    >
                        <span>🎟️</span>
                        <span>Plantillas Globales de Tickets de Salida ({exitTickets.length})</span>
                    </button>
                </div>

                {activeTab === 'categories' && <CategoriesTab onNavigateToExitTickets={() => setActiveTab('exit_tickets')} />}

                {activeTab === 'exit_tickets' && (
                    <ExitTicketsTab exitTickets={exitTickets} loading={loading} error={error} reload={reload} remove={remove} />
                )}
            </div>
        </div>
    )
}

export default ExtraContentScreen