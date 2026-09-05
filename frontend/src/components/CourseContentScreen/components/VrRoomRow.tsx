import React from 'react'
import { type VrCodeEntry } from '../../../lib/adminApi'

interface VrRoomRowProps {
    entry: VrCodeEntry
    onEdit: (entry: VrCodeEntry) => void
    onDelete: (entry: VrCodeEntry) => void
}

const VrRoomRow: React.FC<VrRoomRowProps> = ({ entry, onEdit, onDelete }) => (
    <div className="module-item-row vr-room">
        <div style={{ fontSize: '1.5rem' }}>🚀</div>

        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 'bold' }}>{entry.title || 'Sala VR'}</div>
            {entry.description && (
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    {entry.description}
                </div>
            )}
            <a
                href={entry.code}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    fontSize: '0.75rem', color: '#c4b5fd', marginTop: '0.25rem',
                    letterSpacing: '0.1em', display: 'block', wordBreak: 'break-all',
                }}
            >
                Link: {entry.code}
            </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <a
                href={entry.code}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(196,181,253,0.5)',
                    background: 'rgba(108,92,231,0.2)', color: '#c4b5fd', fontSize: '0.8rem',
                    textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap',
                }}
            >
                Ver 🔗
            </a>
            <button
                onClick={() => onEdit(entry)}
                title="Editar"
                style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                    background: 'rgba(255,255,255,0.12)', color: '#fff',
                    cursor: 'pointer', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                ✏️
            </button>
            <button
                onClick={() => onDelete(entry)}
                title="Eliminar"
                style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                    background: 'rgba(220,38,38,0.15)', color: '#f87171',
                    cursor: 'pointer', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                🗑️
            </button>
        </div>
    </div>
)

export default VrRoomRow