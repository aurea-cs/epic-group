import React, { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import CategoriesTab from './components/categoriesTab'
import ExitTicketsTab from './components/exitTicketsTab'
import { useExitTickets } from './hooks/useExitTickets'
import './ExtraContentScreen.css'
import SegmentedTabs from './components/segmentedTabs'

interface ExtraContentScreenProps {
    user: User
}

const ExtraContentScreen: React.FC<ExtraContentScreenProps> = () => {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState<'categories' | 'exit_tickets'>('categories')

    // Owned here (once) and passed down, so switching tabs back and forth
    // doesn't refetch the list, and the nav-tab label can show a live count.
    const { exitTickets, loading, error, reload, remove } = useExitTickets()

    return (
        <div className="extra-content-screen">
            <div className="extra-content-container">
                <SegmentedTabs
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    labelCategories={t('extraContent.tabCategories')}
                    labelExitTickets={t('extraContent.tabExitTickets')}
                />

                {activeTab === 'categories' && <CategoriesTab onNavigateToExitTickets={() => setActiveTab('exit_tickets')} />}

                {activeTab === 'exit_tickets' && (
                    <ExitTicketsTab exitTickets={exitTickets} loading={loading} error={error} reload={reload} remove={remove} />
                )}
            </div>
        </div>
    )
}

export default ExtraContentScreen