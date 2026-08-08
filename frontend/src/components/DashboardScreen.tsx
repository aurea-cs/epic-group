import React from 'react'
import { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { getUserRole } from '../utils/getUserRole'
import { useVrCode } from '../hooks/useVrCode'
import './DashboardScreen.css'
import astronautaImage from '../assets/astronauta_flotando.png'
import elementoDecorativo1 from '../assets/E_elemento.png'
import manoRosa from '../assets/mano_rosa.png'
import medallaIcon from '../assets/medalla.png'
import rectanguloRosa from '../assets/rectangulo_rosa.png'

interface DashboardScreenProps {
  user: User
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ user }) => {
  const navigate = useNavigate()

  const userRole = getUserRole(user)
  const isAdmin = ['admin'].includes(userRole)
  const { vrCode, openVrCode } = useVrCode(user)

  return (
    <div className="dashboard-screen">
      <div className="dashboard-content">
        <div className="welcome-section">
          <div className="welcome-content">
            <div className="welcome-text">
              <h1 className="welcome-title">¡Bienvenid@!</h1>
              <h2 className="user-name">{user.user_metadata?.full_name || user.email || 'Usuario'}</h2>
              <div className="progress-info" onClick={() => navigate(isAdmin ? '/admin' : userRole === 'professor' ? '/professor/assignments/courses' : '/assignments')}>
                <img src={medallaIcon} alt="Medalla" className="medal-icon-img" />
                <span className="grades-text">{isAdmin ? 'Ver centros educativos >' : 'Ver campos formativos >'}</span>
              </div>
              <p className="agenda-text">
                {isAdmin ? (
                  'Haz click para administrar los centros educativos y su contenido.'
                ) : userRole === 'professor' ? (
                  <>
                    Haz click para checar a tus materias,<br />asignar tareas, y ver entregas de los alumnos.
                  </>
                ) : (
                  <>
                    Haz click para ver tus horarios de clase,<br />
                    ¡Accede a tu agenda!
                  </>
                )}
              </p>
              <button
                className="level-up-btn"
                onClick={() => {
                  if (isAdmin) {
                    navigate('/students')
                  } else if (vrCode) {
                    openVrCode()
                  } else {
                    navigate('/schedule')
                  }
                }}
              >
                {isAdmin ? 'Ver alumnos' : vrCode ? 'Campus VR' : 'Horario'}
              </button>
            </div>
          </div>

          <div className="space-composition">
            <img src={manoRosa} alt="Mano Rosa" className="space-image_mano_rosa" />
            <img src={astronautaImage} alt="Astronauta" className="astronaut-image_fl" />
            <img src={elementoDecorativo1} alt="Elemento decorativo" className="space-image_Element_E" />
          </div>

          <div className="bottom-rectangle-container">
            <img src={rectanguloRosa} alt="Rectangulo" className="bottom-rectangle-img" />
            <div className="down-arrow-circle">
              <span className="down-arrow">˅</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardScreen
