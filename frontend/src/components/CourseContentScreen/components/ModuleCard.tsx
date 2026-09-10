import React, { useEffect, useState, useCallback } from 'react'
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    type CourseModule,
    type ModuleItem,
    type VrCodeEntry,
    type ExitTicketTemplate,
    getModuleExitTickets,
    attachExitTicketsToModule,
    detachExitTicketFromModule,
} from '../../../lib/adminApi'
import useReorderableList from '../hooks/useReorderableList'
import ItemRow from './ItemRow'
import VrRoomRow from './VrRoomRow'
import ExitTicketRow from './ExitTicketRow'
import SwitchExitTicketModal from './SwitchExitTicketModal'
import ConfirmModal from '../../general/ConfirmModal'

interface ModuleCardProps {
    module: CourseModule
    vrEntries: VrCodeEntry[]
    openMenuItemId: string | null
    kebabRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>
    onEditModule: (module: CourseModule) => void
    onDeleteModule: (module: CourseModule) => void
    onAddItem: (moduleId: string) => void
    onEditItem: (item: ModuleItem) => void
    onKebabClick: (e: React.MouseEvent, itemId: string) => void
    onAddVr: (moduleId: string) => void
    onEditVr: (entry: VrCodeEntry) => void
    onDeleteVr: (entry: VrCodeEntry) => void
    onReorderItems: (moduleId: string, order: { id: string; order_index: number }[]) => Promise<void>
    onReorderVr: (moduleId: string, order: { id: string; order_index: number }[]) => Promise<void>
}

// Generic drag-handle wrapper so we don't need to touch ItemRow / VrRoomRow internals
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    }

    return (
        <div ref={setNodeRef} style={style}>
            <span
                {...attributes}
                {...listeners}
                style={{
                    cursor: 'grab',
                    color: 'rgba(31, 41, 90, 0.35)',
                    padding: '0 0.25rem',
                    touchAction: 'none',
                    userSelect: 'none',
                }}
                aria-label="Arrastrar para reordenar"
            >
                ⠿
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </div>
    )
}

const ModuleCard: React.FC<ModuleCardProps> = ({
    module,
    vrEntries,
    openMenuItemId,
    kebabRefs,
    onEditModule,
    onDeleteModule,
    onAddItem,
    onEditItem,
    onKebabClick,
    onAddVr,
    onEditVr,
    onDeleteVr,
    onReorderItems,
    onReorderVr,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    )

    const vrList = useReorderableList(vrEntries, (order) => onReorderVr(module.id, order))
    const itemList = useReorderableList(module.items ?? [], (order) => onReorderItems(module.id, order))

    // Exit tickets attached to this module (non-sortable)
    const [exitTickets, setExitTickets] = useState<ExitTicketTemplate[]>([])
    const [loadingTickets, setLoadingTickets] = useState(true)
    const [switchingTicket, setSwitchingTicket] = useState<ExitTicketTemplate | null>(null)
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
    const [ticketToDetach, setTicketToDetach] = useState<ExitTicketTemplate | null>(null)

    const fetchExitTickets = useCallback(async () => {
        try {
            setLoadingTickets(true)
            const tickets = await getModuleExitTickets(module.id)
            setExitTickets(tickets)
        } catch {
            // Silently fail — exit tickets are supplementary info
            setExitTickets([])
        } finally {
            setLoadingTickets(false)
        }
    }, [module.id])

    useEffect(() => {
        fetchExitTickets()
    }, [fetchExitTickets])

    const handleDetachTicket = (ticket: ExitTicketTemplate) => {
        setTicketToDetach(ticket)
    }

    const handleConfirmDetachTicket = async () => {
        if (!ticketToDetach) return
        const ticket = ticketToDetach
        setTicketToDetach(null)
        try {
            await detachExitTicketFromModule(module.id, ticket.id)
            setExitTickets(prev => prev.filter(t => t.id !== ticket.id))
        } catch (err: any) {
            alert(err.message || 'Error al desconectar el ticket de salida')
        }
    }

    const handleOpenAttachTicketModal = () => {
        setSwitchingTicket(null)
        setIsTicketModalOpen(true)
    }

    const handleOpenSwitchTicketModal = (ticket: ExitTicketTemplate) => {
        setSwitchingTicket(ticket)
        setIsTicketModalOpen(true)
    }

    const handleConfirmTicketSelect = async (selectedTicketId: string) => {
        if (switchingTicket) {
            await detachExitTicketFromModule(module.id, switchingTicket.id)
        }
        await attachExitTicketsToModule(module.id, [selectedTicketId])
        await fetchExitTickets()
    }

    const hasContent = itemList.items.length > 0 || vrList.items.length > 0

    const handleVrDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = vrList.items.findIndex(i => i.id === active.id)
        const newIndex = vrList.items.findIndex(i => i.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return
        vrList.reorder(oldIndex, newIndex)
    }

    const handleItemDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = itemList.items.findIndex(i => i.id === active.id)
        const newIndex = itemList.items.findIndex(i => i.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return
        itemList.reorder(oldIndex, newIndex)
    }

    const anyDirty = vrList.isDirty || itemList.isDirty
    const anySaving = vrList.isSaving || itemList.isSaving

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid rgba(31, 41, 90, 0.2)',
            overflow: 'hidden',
        }}>
            {/* Module Header */}
            <div className="module-header-container" style={{
                padding: '1.5rem',
                background: 'rgba(31, 41, 90, 0.05)',
                borderBottom: '1px solid rgba(31, 41, 90, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, color: '#1f295a' }}>{module.title}</h3>
                    {anySaving && (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(31, 41, 90, 0.5)' }}>
                            Guardando orden…
                        </span>
                    )}
                    {!anySaving && anyDirty && (
                        <span style={{ fontSize: '0.75rem', color: '#6c5ce7' }}>
                            Cambios de orden sin guardar
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {anyDirty && (
                        <button
                            onClick={() => {
                                if (vrList.isDirty) vrList.flush()
                                if (itemList.isDirty) itemList.flush()
                            }}
                            className="btn-icon-admin"
                            style={{
                                background: 'rgba(108,92,231,0.12)',
                                color: '#6c5ce7',
                                fontSize: '0.8rem',
                                padding: '0.4rem 0.75rem',
                                width: 'auto',
                            }}
                        >
                            Guardar orden
                        </button>
                    )}
                    <button
                        onClick={() => onEditModule(module)}
                        className="btn-icon-admin"
                        style={{ background: 'rgba(31, 41, 90, 0.1)', color: '#1f295a' }}
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onDeleteModule(module)}
                        className="btn-icon-admin"
                        style={{ background: 'rgba(255, 0, 81, 0.2)', color: '#1f295a' }}
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Items List */}
            <div style={{ padding: '1rem' }}>
                {hasContent ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {itemList.items.length > 0 && (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleItemDragEnd}
                            >
                                <SortableContext
                                    items={itemList.items.map(item => item.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {itemList.items.map(item => (
                                        <SortableRow key={item.id} id={item.id}>
                                            <ItemRow
                                                item={item}
                                                openMenuItemId={openMenuItemId}
                                                kebabRef={el => { kebabRefs.current[item.id] = el }}
                                                onEdit={onEditItem}
                                                onKebabClick={onKebabClick}
                                            />
                                        </SortableRow>
                                    ))}
                                    {vrList.items.length > 0 && (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleVrDragEnd}
                            >
                                <SortableContext
                                    items={vrList.items.map(entry => entry.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {vrList.items.map(entry => (
                                        <SortableRow key={entry.id} id={entry.id}>
                                            <VrRoomRow
                                                entry={entry}
                                                onEdit={onEditVr}
                                                onDelete={onDeleteVr}
                                            />
                                        </SortableRow>
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                ) : (
                    <p style={{ color: 'rgba(31, 41, 90, 0.5)', fontStyle: 'italic', padding: '1rem' }}>
                        Sin contenido
                    </p>
                )}

                {/* Exit Tickets Section — non-sortable, rendered after all other content */}
                {!loadingTickets && exitTickets.length > 0 && (
                    <div style={{ marginTop: hasContent ? '0.75rem' : '0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            paddingBottom: '0.35rem',
                            borderBottom: '2px solid rgba(159, 121, 242, 0.2)',
                            marginBottom: '0.25rem',
                        }}>
                        </div>
                        {exitTickets.map(ticket => (
                            <ExitTicketRow
                                key={ticket.id}
                                ticket={ticket}
                                onDetach={handleDetachTicket}
                                onSwitch={handleOpenSwitchTicketModal}
                            />
                        ))}
                    </div>
                )}

                <div style={{
                    marginTop: '1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={() => onAddItem(module.id)}
                        style={{
                            background: 'transparent',
                            border: '1px dashed rgba(31, 41, 90, 0.5)',
                            color: '#1f295a',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        + Agregar contenido
                    </button>
                    <button
                        onClick={() => onAddVr(module.id)}
                        style={{
                            background: 'rgba(108,92,231,0.08)',
                            border: '1px dashed rgba(108,92,231,0.5)',
                            color: '#6c5ce7',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        🚀 Agregar sala
                    </button>
                    <button
                        onClick={handleOpenAttachTicketModal}
                        style={{
                            background: 'rgba(236, 72, 153, 0.08)',
                            border: '1px dashed rgba(236, 72, 153, 0.5)',
                            color: '#ec4899',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        🎟️ Ticket de salida
                    </button>
                </div>
            </div>

            <SwitchExitTicketModal
                isOpen={isTicketModalOpen}
                currentTicket={switchingTicket}
                attachedTicketIds={exitTickets.map(t => t.id)}
                onClose={() => {
                    setIsTicketModalOpen(false)
                    setSwitchingTicket(null)
                }}
                onSelectTicket={handleConfirmTicketSelect}
            />

            {ticketToDetach && (
                <ConfirmModal
                    title="Desconectar ticket de salida"
                    message={`¿Estás seguro de que deseas desconectar el ticket "${ticketToDetach.title}" de este módulo?`}
                    confirmLabel="Desconectar"
                    cancelLabel="Cancelar"
                    danger
                    onCancel={() => setTicketToDetach(null)}
                    onConfirm={handleConfirmDetachTicket}
                />
            )}
        </div>
    )
}

export default ModuleCard