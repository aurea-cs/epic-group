import React from 'react'
import { PageElement } from './types'
import TrueFalseElement from './elements/TrueFalseElement'
import MultipleChoiceElement from './elements/MultipleChoiceElement'
import OpenEndedElement from './elements/OpenEndedElement'
import ConnectElement from './elements/ConnectElement'
import RankElement from './elements/RankElement'

interface PageElementsProps {
    elements: PageElement[]
    onAnswer: (elementId: string, response: any) => void
}

// Renders inside the same relatively-positioned container as the page's
// <img> (see BookViewer's page-surface div), so % coordinates line up with
// the image regardless of screen size.
const PageElements: React.FC<PageElementsProps> = ({ elements, onAnswer }) => {
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {elements.map(el => (
                <div
                    key={el.id}
                    style={{
                        position: 'absolute',
                        left: `${el.x * 100}%`,
                        top: `${el.y * 100}%`,
                        width: `${el.width * 100}%`,
                        height: `${el.height * 100}%`,
                        pointerEvents: 'auto',
                    }}
                >
                    {renderElement(el, response => onAnswer(el.id, response))}
                </div>
            ))}
        </div>
    )
}

function renderElement(el: PageElement, handleAnswer: (response: any) => void) {
    switch (el.type) {
        case 'true_false':
            return <TrueFalseElement config={el.config as any} savedResponse={el.saved_response} onAnswer={handleAnswer} />
        case 'multiple_choice':
            return <MultipleChoiceElement config={el.config as any} savedResponse={el.saved_response} onAnswer={handleAnswer} />
        case 'open_ended':
            return <OpenEndedElement config={el.config as any} savedResponse={el.saved_response} onAnswer={handleAnswer} />
        case 'connect':
            return <ConnectElement config={el.config as any} savedResponse={el.saved_response} onAnswer={handleAnswer} />
        case 'rank':
            return <RankElement config={el.config as any} savedResponse={el.saved_response} onAnswer={handleAnswer} />
        default:
            return null
    }
}

export default PageElements