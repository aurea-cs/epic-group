import React, { useRef, useState, useEffect } from 'react'

interface DrawingModalProps {
  isOpen: boolean
  fieldName: string
  initialDataUrl?: string
  onClose: () => void
  onSave: (fieldName: string, dataUrl: string) => void
}

const COLORS = ['#000000', '#1d4ed8', '#dc2626', '#16a34a']
const LINE_WIDTHS = [
  { label: 'Fino', value: 2 },
  { label: 'Medio', value: 4 },
  { label: 'Grueso', value: 7 },
]

export const DrawingModal: React.FC<DrawingModalProps> = ({
  isOpen,
  fieldName,
  initialDataUrl,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(4)
  const [hasContent, setHasContent] = useState(false)

  // Initialize canvas when modal opens
  useEffect(() => {
    if (!isOpen) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * (window.devicePixelRatio || 1)
    canvas.height = rect.height * (window.devicePixelRatio || 1)

    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Clear background to transparent
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Load initial image if exists
    if (initialDataUrl) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        setHasContent(true)
      }
      img.src = initialDataUrl
    } else {
      setHasContent(false)
    }
  }, [isOpen, initialDataUrl])

  if (!isOpen) return null

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 }
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    setIsDrawing(true)
    setHasContent(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.closePath()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    setHasContent(false)
  }

  const handleSaveDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasContent) {
      onSave(fieldName, '')
      onClose()
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    onSave(fieldName, dataUrl)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '650px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          color: 'white',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              ✍️ Espacio de Dibujo / Firma
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Campo: <code style={{ background: '#334155', padding: '2px 6px', borderRadius: '4px' }}>{fieldName}</code>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0f172a',
            padding: '12px',
            borderRadius: '10px',
          }}
        >
          {/* Colors */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Color:</span>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? '3px solid #38bdf8' : '2px solid transparent',
                  cursor: 'pointer',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </div>

          {/* Line Width */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Grosor:</span>
            {LINE_WIDTHS.map((w) => (
              <button
                key={w.value}
                onClick={() => setLineWidth(w.value)}
                style={{
                  background: lineWidth === w.value ? '#3b82f6' : '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: lineWidth === w.value ? 600 : 400,
                }}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Clear Button */}
          <button
            onClick={clearCanvas}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑️ Limpiar
          </button>
        </div>

        {/* Canvas Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '300px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
            cursor: 'crosshair',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              touchAction: 'none',
              display: 'block',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasContent && !isDrawing && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
                fontSize: '0.9rem',
                userSelect: 'none',
              }}
            >
              Dibuja o firma aquí...
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#475569',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveDrawing}
            style={{
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.4)',
            }}
          >
            Guardar Dibujo
          </button>
        </div>
      </div>
    </div>
  )
}
