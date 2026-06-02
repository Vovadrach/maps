import React, { useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Route as RouteIcon, Map, FileText, Settings, Briefcase, Navigation, Box } from 'lucide-react';
import { Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useAppContext } from './context.tsx';
import { LIGHT_MAP_ID, RoutePolyline } from './components/MapComponents.tsx';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shrink-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 text-white mb-8">
          <div className="p-2 bg-violet-600 rounded-lg shadow-lg shadow-violet-500/20">
            <RouteIcon className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">LogisMap</span>
        </div>
        
        <nav className="space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
                isActive ? 'bg-violet-600/10 text-violet-400' : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Map className="w-5 h-5" />
            <span>Карта</span>
          </NavLink>
          
          <NavLink
            to="/trips"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
                isActive || (location.pathname.startsWith('/trips') && !location.pathname.includes('/cargo')) ? 'bg-violet-600/10 text-violet-400' : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Briefcase className="w-5 h-5" />
            <span>Мої Рейси</span>
          </NavLink>

          <NavLink
            to="/cargo"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
                isActive || location.pathname.includes('/cargo') ? 'bg-violet-600/10 text-violet-400' : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Box className="w-5 h-5" />
            <span>3D Вантаж</span>
          </NavLink>
        </nav>
      </div>
      
      <div className="mt-auto p-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
           <div className="flex items-center space-x-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
               <span className="font-bold text-xs text-white">DR</span>
             </div>
             <div>
               <p className="text-sm font-medium text-white">Диспетчер</p>
               <p className="text-xs text-slate-500">Логістика</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export function MapArea() {
  const { trips, activeTripId, previewTrip } = useAppContext();
  const routesLib = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = React.useState<google.maps.DirectionsService | null>(null);
  const [routeSegments, setRouteSegments] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (routesLib && !directionsService) {
      setDirectionsService(new routesLib.DirectionsService());
    }
  }, [routesLib]);

  const activeTrip = useMemo(() => {
    if (previewTrip) return previewTrip;
    if (activeTripId === 'new') return { id: 'new', name: 'Новий Рейс', createdAt: Date.now(), points: [] };
    return trips.find(t => t.id === activeTripId) || (trips.length > 0 ? trips[0] : null);
  }, [trips, activeTripId, previewTrip]);

  // Handle route calculation for active trip
  React.useEffect(() => {
    if (!directionsService || !activeTrip || activeTrip.points.length < 2) {
      setRouteSegments([]);
      return;
    }

    const calculateRoutes = async () => {
      const segments = [];
      const points = activeTrip.points;
      
      for (let i = 0; i < points.length - 1; i++) {
        const origin = points[i].location;
        const destination = points[i+1].location;
        
        try {
          const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
            directionsService.route({
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            }, (res, status) => {
              if (status === 'OK' && res) resolve(res);
              else reject(status);
            });
          });
          
          if (result.routes[0]) {
            const r = result.routes[0];
            segments.push({
              path: r.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() })),
              color: '#8b5cf6', // violet-500
              distance: r.legs[0].distance?.text,
              duration: r.legs[0].duration?.text,
            });
          }
        } catch (err) {
          console.error("Route calculation error", err);
        }
      }
      setRouteSegments(segments);
    };

    calculateRoutes();
  }, [directionsService, activeTrip]);

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-100">
      <GoogleMap
          id={LIGHT_MAP_ID}
          defaultCenter={{lat: 48.3794, lng: 31.1656}}
          defaultZoom={5}
          mapId={LIGHT_MAP_ID}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{width: '100%', height: '100%'}}
          colorScheme="LIGHT"
        >
          {activeTrip && activeTrip.points.map((point, index) => {
            let bg = '#64748b'; // slate
            let border = '#475569';
            if (point.type === 'loading') { bg = '#10b981'; border = '#059669'; } // emerald
            if (point.type === 'unloading') { bg = '#8b5cf6'; border = '#7c3aed'; } // violet
            if (point.type === 'transit') { bg = '#0ea5e9'; border = '#0284c7'; } // sky
            
            return (
              <AdvancedMarker key={point.id} position={point.location} title={point.name} zIndex={50 + index}>
                <Pin background={bg} borderColor={border} glyphColor="#fff" glyph={String(index + 1)} />
              </AdvancedMarker>
            )
          })}
          
          {routeSegments.map((seg, i) => (
             <RoutePolyline key={i} path={seg.path} color={seg.color} />
          ))}
        </GoogleMap>
        
        {/* Active Trip Info overlay */}
        {activeTrip && (
           <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:w-80 bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl border border-slate-200 z-10 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center space-x-3 mb-2 text-violet-600">
               <Navigation className="w-5 h-5 fill-current shrink-0" />
               <span className="font-bold text-slate-800 line-clamp-1">{activeTrip.name}</span>
             </div>
             <div className="flex items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
               {routeSegments.length > 0 ? "Маршрутизація" : "Відображення точок"}
             </div>
             <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
               {activeTrip.points.map((p, idx) => (
                 <div key={idx} className="flex items-start gap-2 text-xs">
                   <div className="w-4 pt-0.5 flex justify-center text-[10px] font-bold text-slate-400 shrink-0">{idx+1}.</div>
                   <div className="truncate font-medium text-slate-700 leading-tight">{p.name || 'Точка'}</div>
                 </div>
               ))}
             </div>
           </div>
        )}
    </div>
  );
}

export function MainLayout() {
  const location = useLocation();
  const isMapOnly = location.pathname === '/';
  const isTripsList = location.pathname === '/trips';
  const isCargo = location.pathname.includes('/cargo');

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col-reverse md:flex-row relative overflow-hidden">
         {/* Main Content Area */}
         <div className={`flex-1 transition-all h-full overflow-y-auto ${isMapOnly ? 'hidden md:flex flex-col' : 'flex flex-col'}`}>
            <Outlet />
         </div>

         {/* Fixed Map Area */}
         <div className={`
            transition-all shrink-0 relative
            md:border-l md:border-slate-200 md:shadow-xl md:z-30
            ${isMapOnly ? 'flex-1' : ''}
            ${isTripsList ? 'hidden md:block md:w-[400px] lg:w-[500px]' : ''}
            ${(!isMapOnly && !isTripsList && !isCargo) ? 'h-[40vh] border-b border-slate-200 md:border-b-0 md:h-auto md:w-[400px] lg:w-[500px]' : ''}
            ${isCargo ? 'hidden' : ''}
         `}>
            <MapArea />
         </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden flex bg-white border-t border-slate-200 z-50 shrink-0">
        <NavLink to="/" end className={({isActive}) => `flex-1 py-3 flex flex-col items-center justify-center space-y-1 ${isActive ? 'text-violet-600' : 'text-slate-500'}`}>
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-medium">Карта</span>
        </NavLink>
        <NavLink to="/trips" className={({isActive}) => `flex-1 py-3 flex flex-col items-center justify-center space-y-1 ${isActive || (location.pathname.startsWith('/trips') && !location.pathname.includes('/cargo')) ? 'text-violet-600 bg-violet-50/50' : 'text-slate-500'} transition-colors`}>
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px] font-medium">Рейси</span>
        </NavLink>
        <NavLink to="/cargo" className={({isActive}) => `flex-1 py-3 flex flex-col items-center justify-center space-y-1 ${isActive || location.pathname.includes('/cargo') ? 'text-violet-600 bg-violet-50/50' : 'text-slate-500'} transition-colors`}>
          <Box className="w-5 h-5" />
          <span className="text-[10px] font-medium">3D Вантаж</span>
        </NavLink>
      </div>
    </div>
  );
}
