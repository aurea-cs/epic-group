import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

const PlanetDetailScreen: React.FC<PlanetDetailScreenProps> = () => {
  const { courseId, } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { pdfUrl?: string; title?: string } | null;

  const title = state?.title || `Curso ${courseId}`;
  
  const [subPlanets, setSubPlanets] = useState<any[]>([]);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        if (!courseId) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/subjects/${courseId}/modules`);
        if (!res.ok) throw new Error('Error fetching modules');
        const data = await res.json();
        
        const numSubPlanets = data.length;
        const radius = 250; 
        const items = data.map((module: any, i: number) => {
          const angle = (i / numSubPlanets) * (2 * Math.PI);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const asset = PLANET_ASSETS[i % PLANET_ASSETS.length];
          
          const mItems = (module.items || []).filter((item: any) => item.type === 'pdf');
          const totalItems = mItems.length;
          
          const readItems = JSON.parse(localStorage.getItem('readItems') || '{}');
          const completedItems = mItems.filter((it: any) => it.is_completed || readItems[it.id]).length;
          
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
          
          return { id: module.id, moduleId: module.id, title: module.title, x, y, asset, stars };
        });
        setSubPlanets(items);
      } catch (err) {
        console.error("Error fetching modules:", err);
      }
    };
    fetchModules();
  }, [courseId]);

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
        {subPlanets.map((sp) => (
          <div
            key={sp.id}
            className="orbiting-planet"
            style={{
              transform: `translate(calc(-50% + ${sp.x}px), calc(-50% + ${sp.y}px))`
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
        ))}

        {/* Anillo orbital */}
        <div className="orbit-ring"></div>
      </div>
    </div>
  );
};

export default PlanetDetailScreen;
