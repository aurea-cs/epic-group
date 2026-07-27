// CustomMultiSelect.tsx
import React, { useState, useRef, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, X } from 'lucide-react'
import './CustomMultiSelect.css'

export interface SelectOption {
    value: string
    label: string
}

interface CustomMultiSelectProps {
    /** Comma-separated string, e.g. "pdf, docx, png" */
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
}

const parseValue = (value: string): string[] =>
    value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({ value, onChange, options, placeholder = 'Seleccionar opciones' }) => {
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    const selected = parseValue(value)

    // Same reliable outside-click close as CustomDatePicker
    useEffect(() => {
        if (!open) return
        const handlePointerDown = (e: PointerEvent) => {
            const target = e.target as Node
            if (contentRef.current?.contains(target)) return
            if (triggerRef.current?.contains(target)) return
            setOpen(false)
        }
        document.addEventListener('pointerdown', handlePointerDown)
        return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [open])

    const toggleOption = (optValue: string) => {
        const next = selected.includes(optValue)
            ? selected.filter(v => v !== optValue)
            : [...selected, optValue]
        onChange(next.join(', '))
    }

    const removeOption = (optValue: string, e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(selected.filter(v => v !== optValue).join(', '))
    }

    const selectedLabels = selected.map(v => options.find(o => o.value === v)?.label ?? v)

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    ref={triggerRef}
                    type="button"
                    className="custom-multiselect-trigger"
                    data-placeholder={selected.length === 0 || undefined}
                >
                    {selected.length === 0 ? (
                        <span className="custom-multiselect-placeholder">{placeholder}</span>
                    ) : (
                        <div className="custom-multiselect-tags">
                            {selectedLabels.map((label, i) => (
                                <span key={selected[i]} className="custom-multiselect-tag">
                                    {label}
                                    <X
                                        size={12}
                                        className="custom-multiselect-tag-remove"
                                        onClick={e => removeOption(selected[i], e)}
                                    />
                                </span>
                            ))}
                        </div>
                    )}
                    <ChevronDown size={16} className="custom-multiselect-icon" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content ref={contentRef} className="custom-multiselect-content" align="start" sideOffset={4}>
                    <div className="custom-multiselect-viewport">
                        {options.map(opt => {
                            const isChecked = selected.includes(opt.value)
                            return (
                                <div
                                    key={opt.value}
                                    className="custom-multiselect-item"
                                    data-state={isChecked ? 'checked' : 'unchecked'}
                                    onClick={() => toggleOption(opt.value)}
                                >
                                    <span className="custom-multiselect-item-box">
                                        {isChecked && <Check size={12} />}
                                    </span>
                                    <span>{opt.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}

export default CustomMultiSelect