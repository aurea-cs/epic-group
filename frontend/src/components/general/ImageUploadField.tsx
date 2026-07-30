import { uploadImage } from '../../lib/adminApi'
import { useEffect, useRef, useState } from 'react'

const ImageUploadField = ({
    value,
    onChange,
    label = 'Imagen'
}: {
    value: string
    onChange: (url: string) => void
    label?: string
}) => {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState<string>(value)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setPreview(value) }, [value])

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten imágenes')
            return
        }
        try {
            setUploading(true)
            // Local preview while uploading
            const localUrl = URL.createObjectURL(file)
            setPreview(localUrl)
            const remoteUrl = await uploadImage(file)
            onChange(remoteUrl)
            setPreview(remoteUrl)
        } catch (err: any) {
            alert(err.message || 'Error al subir imagen')
            setPreview(value) // revert
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Preview */}
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                style={{
                    width: '80px', height: '80px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: uploading ? 'wait' : 'pointer', overflow: 'hidden', position: 'relative'
                }}
            >
                {preview ? (
                    <img
                        src={preview}
                        alt="preview"
                        onError={() => setPreview('')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🖼️</span>
                )}
                {uploading && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div className="loading-spinner" style={{ width: '20px', height: '20px' }} />
                    </div>
                )}
            </div>

            {/* URL input + upload button */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    {label} <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional)</span>
                </label>
                <input
                    type="text"
                    className="modern-input"
                    value={value}
                    onChange={e => { onChange(e.target.value); setPreview(e.target.value) }}
                    placeholder="https://... o sube un archivo"
                    disabled={uploading}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.4)',
                        color: '#c4b5fd', borderRadius: '6px', padding: '0.3rem 0.75rem',
                        fontSize: '0.8rem', cursor: uploading ? 'wait' : 'pointer'
                    }}
                >
                    {uploading ? 'Subiendo...' : preview ? '🔄 Cambiar imagen' : '⬆️ Subir imagen'}
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
                />
            </div>
        </div>
    )
}

export default ImageUploadField