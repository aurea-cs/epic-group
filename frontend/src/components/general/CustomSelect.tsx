import React from 'react'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import './CustomSelect.css'

export interface SelectOption {
    value: string
    label: string
}

interface CustomSelectProps {
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder }) => {
    return (
        <Select.Root value={value} onValueChange={onChange}>
            <Select.Trigger className="custom-select-trigger">
                <Select.Value placeholder={placeholder} />
                <Select.Icon className="custom-select-icon">
                    <ChevronDown size={16} />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content className="custom-select-content" position="popper" sideOffset={4}>
                    <Select.Viewport className="custom-select-viewport">
                        {options.map(opt => (
                            <Select.Item key={opt.value} value={opt.value} className="custom-select-item">
                                <Select.ItemText>{opt.label}</Select.ItemText>
                                <Select.ItemIndicator className="custom-select-item-indicator">
                                    <Check size={14} />
                                </Select.ItemIndicator>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    )
}

export default CustomSelect