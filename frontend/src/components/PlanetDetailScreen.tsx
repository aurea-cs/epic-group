import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getStudentReadItems } from '../lib/api';
import './PlanetDetailScreen.css';

import planetasolito1 from '../assets/planetasolito1.png';
import planetasolito2 from '../assets/planetasolito2.png';
import planetasolito3 from '../assets/planetasolito3.png';
import planetasolito4 from '../assets/planetasolito4.png';
import planetasolito5 from '../assets/planetasolito5.png';
import image30 from '../assets/image30.png';

const PLANET_ASSETS = [
  planetasolito1, planetasolito2, planetasolito3, planetasolito4, planetasolito5
];

interface PlanetDetailScreenProps {
  user: User;
}

const PlanetDetailScreen: React.FC<PlanetDetailScreenProps> = ({ user }) => {
  const { courseId, } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { pdfUrl?: string; title?: string } | null;

  const title = state?.title || `Curso ${courseId}`;

  const [subPlanets, setSubPlanets] = useState<any[]>([]);
  const [radius, setRadius] = useState(250);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 480) setRadius(120);
      else if (window.innerWidth < 768) setRadius(150);
      else if (window.innerWidth < 1024) setRadius(200);
      else setRadius(250);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        if (!courseId) return;

        // Fetch modules and read items in parallel
        const [res, readItemsList] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/subjects/${courseId}/modules`),
          getStudentReadItems(user.id)
        ]);

        if (!res.ok) throw new Error('Error fetching modules');
        const data = await res.json();

        const readItemsSet = new Set(readItemsList);

        const numSubPlanets = data.length;
        const items = data.map((module: any, i: number) => {
          const angle = (i / numSubPlanets) * (2 * Math.PI);
          const asset = PLANET_ASSETS[i % PLANET_ASSETS.length];

          const mItems = (module.items || []).filter((item: any) => item.type === 'pdf');
          const totalItems = mItems.length;

          const completedItems = mItems.filter((it: any) => it.is_completed || readItemsSet.has(it.id)).length;

          let stars = 0;
          if (totalItems > 0) {
            const progress = completedItems / totalItems;
            if (progress === 1) {
              stars = 3;
            } else if (progress >= 0.5) {
              stars = 2;
            } else if (progress > 0) {
              stars = 1;
            }
          }

          return { id: module.id, moduleId: module.id, title: module.title, angle, asset, stars };
        });
        setSubPlanets(items);
      } catch (err) {
        console.error("Error fetching modules:", err);
      }
    };
    fetchModules();
  }, [courseId, user.id]);

  const handleSubPlanetClick = (module: any) => {
    navigate(`/course/${courseId}/module/${module.moduleId}/items`, {
      state: { title: module.title }
    });
  };

  const handleBack = () => {
    navigate('/assignments');
  };

  return (
    <div className="planet-detail-screen">
      <div className="pd-header">
        <button className="btn-back" onClick={handleBack}>
          ← Volver
        </button>
        <h1 className="pd-title">{title}</h1>
      </div>

      {/* Fondo espacial */}
      <div className="space-background">
        <div className="stars"></div>
        <div className="nebula"></div>
      </div>

      <div className="solar-system">
        {/* Planeta central */}
        <div className="central-planet">
          <img src={image30} alt="Planeta Central" />
          <div className="central-title">Núcleo</div>
        </div>

        {/* Planetas orbitando */}
        {subPlanets.map((sp) => {
          const x = Math.cos(sp.angle) * radius;
          const y = Math.sin(sp.angle) * radius;
          return (
            <div
              key={sp.id}
              className="orbiting-planet"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`
              }}
              onClick={() => handleSubPlanetClick(sp)}
            >
              <div className="planet-stars-top">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className={`star ${index < sp.stars ? 'filled' : 'empty'}`}
                  ></div>
                ))}
              </div>
              <img src={sp.asset} alt={`Sub-planeta ${sp.id}`} />
              <div className="sub-title">{sp.title}</div>
            </div>
          );
        })}

        {/* Anillo orbital */}
        <div className="orbit-ring" style={{ width: radius * 2, height: radius * 2 }}></div>
      </div>
    </div>
  );
};

export default PlanetDetailScreen;
