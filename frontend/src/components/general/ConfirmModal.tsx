import { ActionButton } from './SharedUI'
import './ConfirmModal.css'

interface ConfirmModalProps {
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel: () => void
    danger?: boolean
}

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem',
        }}
    >
        <div
        className="confirm-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
                background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
                padding: '1.75rem', 
                width: '480px',        
                height: '180px',       
                maxWidth: '480px', 
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f3e8ff' }}>{title}</h2>
            </div>
            {children}
        </div>
    </div>
)

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title = 'Confirmar acción',
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    danger = false,
}) => {
    return (
        <Modal title={title} onClose={onCancel}>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', justifyContent: 'center', textAlign: 'center' }}>
                {message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem',  }}>
                    <ActionButton
                        border="1px solid rgba(255,255,255,0.12)"
                        label={cancelLabel}
                        onClick={onCancel}
                        bg="rgba(255,255,255,0.06)"
                        hoverBg="rgba(255,255,255,0.12)"
                        textColor="#e5e7eb"
                    />

                    <ActionButton
                        border="1px solid rgba(255,255,255,0.12)"
                        label={confirmLabel}
                        onClick={onConfirm}
                        bg={danger ? 'rgba(248,113,113,0.6)' : 'rgba(168,85,247,0.6)'}
                        hoverBg={danger ? 'rgba(248,113,113,0.8)' : 'rgba(168,85,247,0.8)'}
                        textColor="#fff"
                    />
                </div>
            </div>
        </Modal>
    )
}

export default ConfirmModal