import React, { useEffect, useRef, useState } from 'react'
import { useImpersonation } from '../context/ImpersonationContext'
import './NavbarProfileControls.css'

interface NavbarProfileControlsProps {
  userDisplayName: string
  userRole?: string
  onNavigate: (path: string) => void
  onLogout?: () => Promise<void> | void
  onOpenNotifications?: () => void
  notificationCount?: number
  logoutLoading?: boolean
  profilePath?: string
  settingsPath?: string
}

const getInitials = (name: string) => {
  if (!name) return 'UX'
  const cleanedName = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')

  return cleanedName ? cleanedName.toUpperCase() : name.slice(0, 2).toUpperCase()
}

const NavbarProfileControls: React.FC<NavbarProfileControlsProps> = ({
  userDisplayName,
  userRole,
  onNavigate,
  onLogout,
  // onOpenNotifications,
  // notificationCount = 0,
  logoutLoading = false,
  profilePath = '/profile',
  settingsPath = '/settings'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { isImpersonating, openModal, exitImpersonation } = useImpersonation()

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const initials = getInitials(userDisplayName)
  // const badgeContent = notificationCount > 99 ? '99+' : notificationCount.toString()

  // const handleNotifications = () => {
  //   if (onOpenNotifications) {
  //     onOpenNotifications()
  //   }
  // }

  const handleNavigate = (path: string) => {
    onNavigate(path)
    setIsOpen(false)
  }

  const handleLogout = async () => {
    if (!onLogout) return
    await onLogout()
    setIsOpen(false)
  }

  return (
    <div className="profile-controls">


      <div
        className={`profile-dropdown ${isOpen ? 'open' : ''}`}
        ref={dropdownRef}
      >
        <button
          className="profile-trigger"
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span className="avatar-initials" aria-hidden="true">
            {initials}
          </span>

          <svg
            className="dropdown-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isOpen && (
          <div className="dropdown-menu" role="menu">
            <button
              className="dropdown-item"
              type="button"
              onClick={() => handleNavigate(profilePath)}
              role="menuitem"
            >
              <span className="dropdown-item-icon" aria-hidden="true">👤</span>
              <span>Ver perfil</span>
            </button>

            {userRole === 'admin' && !isImpersonating && (
              <button
                className="dropdown-item"
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  openModal()
                }}
                role="menuitem"
              >
                <span className="dropdown-item-icon" aria-hidden="true">🎭</span>
                <span>Suplantar usuario</span>
              </button>
            )}

            {isImpersonating && (
              <button
                className="dropdown-item"
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  exitImpersonation()
                }}
                role="menuitem"
                style={{ color: '#fbbf24' }}
              >
                <span className="dropdown-item-icon" aria-hidden="true">↩</span>
                <span>Volver a Administrador</span>
              </button>
            )}

            {settingsPath && (
              <button
                className="dropdown-item"
                type="button"
                onClick={() => handleNavigate(settingsPath)}
                role="menuitem"
              >
              </button>
            )}
            {onLogout && (
              <>
                <div className="dropdown-separator" role="presentation" />
                <button
                  className="dropdown-item logout"
                  type="button"
                  onClick={handleLogout}
                  role="menuitem"
                  disabled={logoutLoading}
                >
                  <span className="dropdown-item-icon" aria-hidden="true">🚪</span>
                  <span>{logoutLoading ? 'Cerrando…' : 'Cerrar sesión'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NavbarProfileControls

