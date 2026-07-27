import React, { useState, useRef, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { format, parse, isValid } from 'date-fns'
import { es as esDateFns } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import 'react-day-picker/style.css'
import './CustomDatePicker.css'

interface CustomDatePickerProps {
    /** ISO-ish value: "yyyy-MM-dd'T'HH:mm" when includeTime, otherwise "yyyy-MM-dd" */
    value: string
    onChange: (value: string) => void
    includeTime?: boolean
    placeholder?: string
}

const DATE_FMT = 'yyyy-MM-dd'
const DATETIME_FMT = "yyyy-MM-dd'T'HH:mm"

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, includeTime = false, placeholder = 'Seleccionar fecha' }) => {
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    // Guaranteed outside-click close, independent of Radix's internal dismiss layer
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

    const parsedDate = value
        ? parse(value, includeTime ? DATETIME_FMT : DATE_FMT, new Date())
        : undefined
    const selectedDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined
    const currentTime = selectedDate ? format(selectedDate, 'HH:mm') : '00:00'

    const commit = (date: Date, time: string) => {
        if (includeTime) {
            const [h, m] = time.split(':').map(Number)
            const withTime = new Date(date)
            withTime.setHours(h || 0, m || 0, 0, 0)
            onChange(format(withTime, DATETIME_FMT))
        } else {
            onChange(format(date, DATE_FMT))
        }
    }

    const handleDaySelect = (date: Date | undefined) => {
        if (!date) return
        commit(date, currentTime)
        if (!includeTime) setOpen(false)
    }

    const handleTimeChange = (time: string) => {
        if (!selectedDate) return
        commit(selectedDate, time)
    }

    const label = selectedDate
        ? includeTime
            ? format(selectedDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: esDateFns })
            : format(selectedDate, "d 'de' MMMM, yyyy", { locale: esDateFns })
        : null

    const currentYear = new Date().getFullYear()

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button ref={triggerRef} type="button" className="custom-date-trigger" data-placeholder={!label || undefined}>
                    <span>{label || placeholder}</span>
                    <CalendarDays size={16} className="custom-date-icon" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content ref={contentRef} className="custom-date-content" align="start" sideOffset={4}>
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDaySelect}
                        locale={es}
                        showOutsideDays
                        captionLayout="dropdown"
                        navLayout="around"
                        startMonth={new Date(currentYear - 100, 0)}
                        endMonth={new Date(currentYear + 10, 11)}
                        classNames={{
                            months: 'cdp-months',
                            month: 'cdp-month',
                            month_caption: 'cdp-caption',
                            caption_label: 'cdp-caption-label',
                            nav: 'cdp-nav',
                            button_previous: 'cdp-nav-button cdp-nav-button-prev',
                            button_next: 'cdp-nav-button cdp-nav-button-next',
                            month_grid: 'cdp-table',
                            weekdays: 'cdp-head-row',
                            weekday: 'cdp-head-cell',
                            week: 'cdp-row',
                            day: 'cdp-cell',
                            day_button: 'cdp-day',
                            selected: 'cdp-day-selected',
                            today: 'cdp-day-today',
                            outside: 'cdp-day-outside',
                            disabled: 'cdp-day-disabled',
                            dropdowns: 'cdp-dropdowns',
                            dropdown_root: 'cdp-dropdown-root',
                            dropdown: 'cdp-dropdown',
                            months_dropdown: 'cdp-dropdown',
                            years_dropdown: 'cdp-dropdown',
                            chevron: 'cdp-chevron',
                        }}
                    />
                    {includeTime && (
                        <div className="cdp-time-row">
                            <span className="cdp-time-label">Hora</span>
                            <input
                                type="time"
                                className="cdp-time-input"
                                value={currentTime}
                                onChange={e => handleTimeChange(e.target.value)}
                                disabled={!selectedDate}
                            />
                        </div>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}

export default CustomDatePicker