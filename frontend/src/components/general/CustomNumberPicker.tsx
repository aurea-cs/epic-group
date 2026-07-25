import React from 'react'
import { Minus, Plus } from 'lucide-react'
import './CustomNumberPicker.css'

interface CustomNumberPickerProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    suffix?: string
}

const clamp = (n: number, min?: number, max?: number) => {
    let result = n
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    return result
}

const CustomNumberPicker: React.FC<CustomNumberPickerProps> = ({ value, onChange, min, max, step = 1, suffix }) => {
    const decrement = () => onChange(clamp(value - step, min, max))
    const increment = () => onChange(clamp(value + step, min, max))

    const handleInputChange = (raw: string) => {
        if (raw === '') {
            onChange(0)
            return
        }
        const parsed = Number(raw)
        if (!Number.isNaN(parsed)) onChange(parsed)
    }

    const handleBlur = () => {
        onChange(clamp(value, min, max))
    }

    return (
        <div className="custom-number-trigger">
            <button
                type="button"
                className="custom-number-btn"
                onClick={decrement}
                disabled={min !== undefined && value <= min}
                aria-label="Disminuir"
            >
                <Minus size={14} />
            </button>

            <div className="custom-number-input-wrap">
                <input
                    type="number"
                    className="custom-number-input"
                    value={value}
                    onChange={e => handleInputChange(e.target.value)}
                    onBlur={handleBlur}
                    min={min}
                    max={max}
                    step={step}
                />
                {suffix && <span className="custom-number-suffix">{suffix}</span>}
            </div>

            <button
                type="button"
                className="custom-number-btn"
                onClick={increment}
                disabled={max !== undefined && value >= max}
                aria-label="Aumentar"
            >
                <Plus size={14} />
            </button>
        </div>
    )
}

export default CustomNumberPicker