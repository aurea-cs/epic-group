import React from 'react'

interface ToggleProps {
    on: boolean
    color: string
}

const Toggle: React.FC<ToggleProps> = ({ on, color }) => (
    <span style={{
        width: '30px',
        height: '16px',
        borderRadius: '999px',
        position: 'relative',
        display: 'inline-block',
        background: on ? color : 'rgba(31,41,90,0.2)',
        transition: 'background 0.15s',
        flexShrink: 0
    }}>
        <span style={{
            position: 'absolute',
            top: '2px',
            left: on ? '16px' : '2px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s'
        }} />
    </span>
)

export default Toggle