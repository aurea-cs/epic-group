import React from 'react'

export type TabKey = 'categories' | 'exit_tickets' | 'global_curriculum'

interface SegmentedTabsProps {
    activeTab: TabKey
    onChange: (tab: TabKey) => void
    labelCategories: string
    labelExitTickets: string
    labelGlobalCurriculum: string
}

/**
 * Single-track segmented control.
 * The active segment is a sliding highlight across 3 states.
 */
const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
    activeTab,
    onChange,
    labelCategories,
    labelExitTickets,
    labelGlobalCurriculum,
}) => {
    const getTransform = () => {
        if (activeTab === 'categories') return 'translateX(0%)'
        if (activeTab === 'exit_tickets') return 'translateX(100%)'
        return 'translateX(200%)'
    }

    return (
        <div className="segmented-tabs" role="tablist">
            <div
                className="segmented-tabs-highlight"
                style={{ transform: getTransform() }}
            />
            <button
                role="tab"
                aria-selected={activeTab === 'categories'}
                className={`segmented-tab ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => onChange('categories')}
            >
                <span>{labelCategories}</span>
            </button>
            <button
                role="tab"
                aria-selected={activeTab === 'exit_tickets'}
                className={`segmented-tab ${activeTab === 'exit_tickets' ? 'active' : ''}`}
                onClick={() => onChange('exit_tickets')}
            >
                <span>{labelExitTickets}</span>
            </button>
            <button
                role="tab"
                aria-selected={activeTab === 'global_curriculum'}
                className={`segmented-tab ${activeTab === 'global_curriculum' ? 'active' : ''}`}
                onClick={() => onChange('global_curriculum')}
            >
                <span>{labelGlobalCurriculum}</span>
            </button>
        </div>
    )
}

export default SegmentedTabs