import React from 'react'
import { useTranslation } from 'react-i18next'
import NavbarProfileControls from './NavbarProfileControls'
import LanguageToggle from './general/LanguageToggle'
import logoImage from '../assets/epic2.png'
import './TopNavigation.css'

interface NavItem {
  key: string
  labelKey: string
  path: string
  disabled?: boolean
}

interface TopNavigationProps {
  activeKey?: string
  userDisplayName: string
  userRole?: string // Add role prop
  onNavigate: (path: string) => void
  onLogout?: () => Promise<void> | void
  logoutLoading?: boolean
  notificationCount?: number
  onOpenNotifications?: () => void
  logoDestination?: string
  backgroundColor?: string
}

// Admin navigation items
const ADMIN_NAV_ITEMS: NavItem[] = [
  { key: 'admin-home', labelKey: 'topnav.home', path: '/dashboard' },
  { key: 'schools', labelKey: 'topnav.schools', path: '/admin' },
  { key: 'students', labelKey: 'topnav.students', path: '/students' },
  { key: 'professors', labelKey: 'topnav.professors', path: '/professors' },
  { key: 'content', labelKey: 'topnav.content', path: '/content' },
]

// Professor navigation items (current default)
const PROFESSOR_NAV_ITEMS: NavItem[] = [
  { key: 'home', labelKey: 'topnav.home', path: '/dashboard' },
  { key: 'my-courses', labelKey: 'topnav.myCourses', path: '/professor/assignments/courses' },
  { key: 'schedule', labelKey: 'topnav.schedule', path: '/schedule' },
]

// Student navigation items
const STUDENT_NAV_ITEMS: NavItem[] = [
  { key: 'home', labelKey: 'topnav.home', path: '/dashboard' },
  { key: 'my-courses', labelKey: 'topnav.myCourses', path: '/assignments' },
  { key: 'schedule', labelKey: 'topnav.schedule', path: '/schedule' },
  { key: 'calendar', labelKey: 'topnav.calendar', path: '/calendar' },
]

const TopNavigation: React.FC<TopNavigationProps> = ({
  activeKey,
  userDisplayName,
  userRole,
  onNavigate,
  onLogout,
  logoutLoading = false,
  notificationCount = 0,
  onOpenNotifications,
  logoDestination = '/dashboard',
  backgroundColor,
}) => {
  const { t } = useTranslation()

  // Select navigation items based on role
  const navItems =
    userRole === 'admin' ? ADMIN_NAV_ITEMS
    : userRole === 'student' ? STUDENT_NAV_ITEMS
    : PROFESSOR_NAV_ITEMS
  const handleLogoClick = () => {
    if (logoDestination) {
      onNavigate(logoDestination)
    }
  }

  const handleNavClick = (item: NavItem) => {
    if (item.disabled || !item.path || item.path === '#') {
      return
    }
    onNavigate(item.path)
  }

  return (
    <header className="top-navigation" role="banner" style={{ backgroundColor }}>
      <div className="top-navigation__bar">
        <div className="top-navigation__content">
          <button
            type="button"
            className="top-navigation__logo"
            onClick={handleLogoClick}
            aria-label="Ir al dashboard"
          >
            <img src={logoImage} alt="EPICGROUP LAB" className="top-navigation__logo-image" />
          </button>

          <div className="top-navigation__center">
            <nav className="top-navigation__links" aria-label="Navegación principal">
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      'top-navigation__link',
                      isActive ? 'top-navigation__link--active' : '',
                      item.disabled ? 'top-navigation__link--disabled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleNavClick(item)}
                    disabled={item.disabled}
                  >
                    {t(item.labelKey)}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="top-navigation__right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <LanguageToggle />
            <NavbarProfileControls
              userDisplayName={userDisplayName}
              onNavigate={onNavigate}
              onLogout={onLogout}
              logoutLoading={logoutLoading}
              notificationCount={notificationCount}
              onOpenNotifications={onOpenNotifications}
            />

          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNavigation

