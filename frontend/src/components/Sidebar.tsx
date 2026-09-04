import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Sidebar.css'
import logoImage from '../assets/epic2.png'
import { Users, Layout, BookOpen, Settings, User as UserIcon } from 'lucide-react'

interface NavItem {
    key: string
    labelKey: string
    path: string
    icon: React.ReactNode
}

interface SidebarProps {
    activeKey?: string
    userRole?: string
    onNavigate: (path: string) => void
}

const PROFESSOR_NAV_ITEMS: NavItem[] = [
    { key: 'dashboard', labelKey: 'sidebar.home', path: '/dashboard', icon: <Layout size={20} /> },
    { key: 'alumnos', labelKey: 'sidebar.students', path: '/alumnos', icon: <Users size={20} /> },
    { key: 'assignments', labelKey: 'sidebar.courses', path: '/assignments', icon: <BookOpen size={20} /> },
    { key: 'profile', labelKey: 'sidebar.profileSettings', path: '/profile', icon: <UserIcon size={20} /> },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
    { key: 'admin-home', labelKey: 'sidebar.home', path: '/dashboard', icon: <Layout size={20} /> },
    { key: 'dashboard-admin', labelKey: 'sidebar.adminPanel', path: '/admin', icon: <Settings size={20} /> },
    { key: 'profile', labelKey: 'sidebar.profileSettings', path: '/profile', icon: <UserIcon size={20} /> },
]

const STUDENT_NAV_ITEMS: NavItem[] = [
    { key: 'dashboard', labelKey: 'sidebar.home', path: '/dashboard', icon: <Layout size={20} /> },
    { key: 'assignments', labelKey: 'sidebar.courses', path: '/assignments', icon: <BookOpen size={20} /> },
    { key: 'profile', labelKey: 'sidebar.profileSettings', path: '/profile', icon: <UserIcon size={20} /> },
]

const TUTOR_NAV_ITEMS: NavItem[] = [
    { key: 'dashboard', labelKey: 'sidebar.home', path: '/dashboard', icon: <Layout size={20} /> },
    { key: 'assignments', labelKey: 'sidebar.courses', path: '/assignments', icon: <BookOpen size={20} /> },
    { key: 'profile', labelKey: 'sidebar.profileSettings', path: '/profile', icon: <UserIcon size={20} /> },
]

const Sidebar: React.FC<SidebarProps> = ({ userRole, onNavigate }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()

    const navItems = userRole === 'admin'
        ? ADMIN_NAV_ITEMS
        : userRole === 'student'
            ? STUDENT_NAV_ITEMS
            : userRole === 'tutor'
                ? TUTOR_NAV_ITEMS
                : PROFESSOR_NAV_ITEMS

    const isActive = (path: string) => location.pathname.startsWith(path)

    const handleNavigation = (path: string) => {
        onNavigate(path)
        navigate(path)
    }

    return (
        <aside className="sidebar-container">
            <div className="sidebar-logo" onClick={() => handleNavigation('/dashboard')}>
                <img src={logoImage} alt="EPICGROUP LAB" className="logo-image" />
            </div>

            <nav className="sidebar-nav">
                <ul className="sidebar-nav-list">
                    {navItems.map((item) => {
                        const active = isActive(item.path) && (item.path !== '/dashboard' || location.pathname === '/dashboard')
                        return (
                            <li
                                key={item.key}
                                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                                onClick={() => handleNavigation(item.path)}
                            >
                                <div className="sidebar-icon">{item.icon}</div>
                                <span className="sidebar-text">{t(item.labelKey)}</span>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}

export default Sidebar
