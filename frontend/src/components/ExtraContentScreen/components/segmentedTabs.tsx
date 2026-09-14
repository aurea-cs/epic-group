import React from 'react'

type TabKey = 'categories' | 'exit_tickets'

interface SegmentedTabsProps {
    activeTab: TabKey
    onChange: (tab: TabKey) => void
    labelCategories: string
    labelExitTickets: string
}

/**
 * Single-track segmented control (not two separate floating buttons).
 * The active segment is a sliding highlight, which reads immediately as
 * "one toggle, two states" rather than two independent pills.
 */
const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
    activeTab,
    onChange,
    labelCategories,
    labelExitTickets,
}) => {
    return (
        <div className="segmented-tabs" role="tablist">
            <div
                className="segmented-tabs-highlight"
                style={{ transform: activeTab === 'categories' ? 'translateX(0%)' : 'translateX(100%)' }}
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
                <span>
                    {labelExitTickets}
                </span>
            </button>
        </div>
    )
}

export default SegmentedTabs