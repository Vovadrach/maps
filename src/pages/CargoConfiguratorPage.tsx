import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Edges, Grid, Html } from '@react-three/drei';
import { useAppContext } from '../context.tsx';
import type { CargoItem, TruckDimensions, Point, Trip } from '../types.ts';
import { ArrowLeft, Plus, Save, Box, Trash2, Move, RotateCw, AlertTriangle } from 'lucide-react';
import * as THREE from 'three';

// 3D Cargo Box Component
function CargoBox({ 
  item, 
  truckDimensions,
  allCargos,
  isSelected, 
  onSelect,
  onTransformEnd,
  onDragStart,
  onDragEnd
}: { 
  item: CargoItem, 
  truckDimensions: TruckDimensions,
  allCargos: CargoItem[],
  isSelected: boolean, 
  onSelect: () => void,
  onTransformEnd: (position: [number, number, number], rotation: [number, number, number]) => void,
  onDragStart: () => void,
  onDragEnd: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [dragOffset, setDragOffset] = useState<THREE.Vector3 | null>(null);
  const [isColliding, setIsColliding] = useState(false);
  const isCollidingRef = useRef(false);
  
  const planeY = item.height / 2 + 0.05;
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY), [planeY]);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    let colliding = false;
    const EPSILON = 0.05;

    const myPos = meshRef.current.position;
    const isRotated = Math.abs(Math.round((item.rotation[1] as number) / (Math.PI / 2)) % 2) === 1;
    const myW = isRotated ? item.length : item.width;
    const myL = isRotated ? item.width : item.length;
    
    const myMinX = myPos.x - myW / 2;
    const myMaxX = myPos.x + myW / 2;
    const myMinZ = myPos.z - myL / 2;
    const myMaxZ = myPos.z + myL / 2;

    // Check truck bounds
    if (
      myMinX < -truckDimensions.width / 2 - EPSILON ||
      myMaxX > truckDimensions.width / 2 + EPSILON ||
      myMinZ < -truckDimensions.length / 2 - EPSILON ||
      myMaxZ > truckDimensions.length / 2 + EPSILON
    ) {
      colliding = true;
    }

    if (!colliding) {
      for (const other of allCargos) {
        if (other.id === item.id) continue;
        
        const otherRot = Math.abs(Math.round((other.rotation[1] as number) / (Math.PI / 2)) % 2) === 1;
        const otherW = otherRot ? other.length : other.width;
        const otherL = otherRot ? other.width : other.length;
        
        // Use position from mesh if dragging, but we only drag one at a time.
        // Other items are static, so we can use their state positions:
        const otherMinX = other.position[0] - otherW / 2;
        const otherMaxX = other.position[0] + otherW / 2;
        const otherMinZ = other.position[2] - otherL / 2;
        const otherMaxZ = other.position[2] + otherL / 2;

        if (myMinX + EPSILON < otherMaxX && myMaxX - EPSILON > otherMinX &&
            myMinZ + EPSILON < otherMaxZ && myMaxZ - EPSILON > otherMinZ) {
           colliding = true;
           break;
        }
      }
    }

    if (colliding !== isCollidingRef.current) {
      isCollidingRef.current = colliding;
      setIsColliding(colliding);
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect();
    
    if (e.target.setPointerCapture) {
        e.target.setPointerCapture(e.pointerId);
    }
    
    if (e.ray.intersectPlane(plane, intersectPoint)) {
      const offset = new THREE.Vector3().copy(meshRef.current!.position).sub(intersectPoint);
      setDragOffset(offset);
      onDragStart();
    }
  };

  const handlePointerMove = (e: any) => {
    if (dragOffset && isSelected) {
      e.stopPropagation();
      if (e.ray.intersectPlane(plane, intersectPoint)) {
        let newX = intersectPoint.x + dragOffset.x;
        let newZ = intersectPoint.z + dragOffset.z;
        
        // Removed hard clamping, let collision handle out of bounds natively visually
        meshRef.current!.position.x = newX;
        meshRef.current!.position.z = newZ;
      }
    }
  };

  const handlePointerUp = (e: any) => {
    if (dragOffset) {
      e.stopPropagation();
      if (e.target.releasePointerCapture) {
          e.target.releasePointerCapture(e.pointerId);
      }
      setDragOffset(null);
      onDragEnd();
      const p = meshRef.current!.position;
      const r = meshRef.current!.rotation;
      onTransformEnd([p.x, planeY, p.z], [r.x, r.y, r.z]);
    }
  };

  return (
    <group>
      <mesh 
        ref={meshRef}
        position={[item.position[0], planeY, item.position[2]]}
        rotation={item.rotation as any}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[item.width, item.height, item.length]} />
        <meshStandardMaterial color={isColliding ? '#ef4444' : item.color} transparent opacity={isSelected || isColliding ? 0.8 : 1} />
        <Edges scale={1} threshold={15} color={isColliding ? '#7f1d1d' : isSelected ? "#8b5cf6" : "black"} />
        
        {isSelected && (
          <Html position={[-item.width / 2 + 0.1, item.height / 2 + 0.1, -item.length / 2 + 0.1]} zIndexRange={[100, 0]}>
            <div 
              className={`flex items-center space-x-1 ${isColliding ? 'bg-red-50' : 'bg-white/90'} backdrop-blur shadow-md rounded-lg p-1 border ${isColliding ? 'border-red-200' : 'border-slate-200'} pointer-events-auto select-none`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isColliding && (
                <div className="flex items-center justify-center p-1 text-red-500" title="Вантаж пересікається або виходить за межі">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const newRotY = (item.rotation[1] as number) + Math.PI / 2;
                  const rotYIdx = Math.round(newRotY / (Math.PI / 2)) % 2;
                  const isRotated = Math.abs(rotYIdx) === 1;
                  
                  const itemW = isRotated ? item.length : item.width;
                  const itemL = isRotated ? item.width : item.length;
                  
                  const minX = -truckDimensions.width / 2 + itemW / 2;
                  const maxX = truckDimensions.width / 2 - itemW / 2;
                  
                  const minZ = -truckDimensions.length / 2 + itemL / 2;
                  const maxZ = truckDimensions.length / 2 - itemL / 2;

                  const p = meshRef.current!.position;
                  // Removed clamping on rotation as well, let error highlight show if out of bounds
                  onTransformEnd([p.x, planeY, p.z], [item.rotation[0], newRotY, item.rotation[2]]);
                }}
                className={`flex items-center p-1.5 text-xs font-bold ${isColliding ? 'text-red-700 hover:bg-red-100' : 'text-violet-600 hover:bg-violet-100'} rounded-md whitespace-nowrap touch-manipulation`}
                title="Обернути 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </Html>
        )}
      </mesh>
    </group>
  );
}

// 3D Truck Trailer Component
function TruckTrailer({ dimensions }: { dimensions: TruckDimensions }) {
  const { width, height, length } = dimensions;
  
  return (
    <group position={[0, height / 2, 0]}>
       {/* Floor */}
       <mesh position={[0, -height/2, 0]} receiveShadow>
         <boxGeometry args={[width, 0.1, length]} />
         <meshStandardMaterial color="#475569" />
       </mesh>
       {/* Left wall */}
       <mesh position={[-width/2, 0, 0]} receiveShadow>
         <boxGeometry args={[0.1, height, length]} />
         <meshStandardMaterial color="#cbd5e1" transparent opacity={0.2} />
       </mesh>
       {/* Right wall */}
       <mesh position={[width/2, 0, 0]} receiveShadow>
         <boxGeometry args={[0.1, height, length]} />
         <meshStandardMaterial color="#cbd5e1" transparent opacity={0.2} />
       </mesh>
       {/* Front wall */}
       <mesh position={[0, 0, -length/2]} receiveShadow>
         <boxGeometry args={[width, height, 0.1]} />
         <meshStandardMaterial color="#cbd5e1" transparent opacity={0.2} />
       </mesh>
       
       <Grid infiniteGrid fadeDistance={50} sectionColor="#94a3b8" cellColor="#cbd5e1" position={[0, -height/2 + 0.06, 0]} />
    </group>
  );
}

export function CargoConfiguratorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trips, activeTripId, updateTrip, addTrip, setPreviewTrip } = useAppContext();
  
  const tripIdToUse = id || activeTripId;
  const trip = useMemo(() => {
    if (tripIdToUse === 'new') return { id: 'new', name: 'Новий Рейс', createdAt: Date.now(), points: [] } as Trip;
    const found = trips.find(t => t.id === tripIdToUse);
    if (found) return found;
    return trips.length > 0 ? trips[0] : { id: 'new', name: 'Новий Рейс', createdAt: Date.now(), points: [] } as Trip;
  }, [tripIdToUse, trips]);
  
  const [truckDimensions, setTruckDimensions] = useState<TruckDimensions>({ width: 2.4, height: 2.6, length: 13.6 });
  const [cargoItems, setCargoItems] = useState<CargoItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (trip) {
      setTruckDimensions(trip.truckDimensions || { width: 2.4, height: 2.6, length: 13.6 });
      setCargoItems(trip.cargoItems || []);
    }
  }, [trip?.id]);

  // Sync to context for global store
  const handleSave = () => {
    if (trip) {
      if (trip.id === 'new') {
        addTrip({
          id: 'trip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          createdAt: Date.now(),
          name: trip.name,
          points: trip.points,
          truckDimensions,
          cargoItems
        });
        navigate('/trips');
      } else {
        updateTrip(trip.id, {
          ...trip,
          truckDimensions,
          cargoItems
        });
        navigate(`/trips/${trip.id}`);
      }
    }
  };

  useEffect(() => {
    if (trip) {
       setPreviewTrip({ ...trip, truckDimensions, cargoItems });
    }
    return () => setPreviewTrip(null);
  }, [truckDimensions, cargoItems, trip, setPreviewTrip]);

  const addCargo = () => {
    const newItem: CargoItem = {
      id: 'cargo-' + Date.now(),
      name: `Вантаж ${cargoItems.length + 1}`,
      width: 1.2,
      height: 1.0,
      length: 0.8,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      position: [0, 0.5, 0], // Start centered with some height
      rotation: [0, 0, 0]
    };
    
    // Auto-place trying to avoid overlap (simplified logic)
    const existingCount = cargoItems.length;
    const minZ = -truckDimensions.length / 2 + newItem.length / 2;
    const maxZ = truckDimensions.length / 2 - newItem.length / 2;
    let initialZ = -truckDimensions.length / 2 + 1 + (existingCount * 1.5);
    initialZ = Math.max(minZ, Math.min(maxZ, initialZ));
    newItem.position = [0, newItem.height / 2 + 0.05, initialZ];
    
    setCargoItems([...cargoItems, newItem]);
    setSelectedItemId(newItem.id);
  };

  const updateSelectedCargo = (updates: Partial<CargoItem>) => {
    setCargoItems(items => items.map(c => c.id === selectedItemId ? { ...c, ...updates } : c));
  };
  
  const handleTransformEnd = (itemId: string, position: [number,number,number], rotation: [number,number,number]) => {
     setCargoItems(items => items.map(c => c.id === itemId ? { ...c, position, rotation } : c));
  };

  const deleteCargo = (id: string) => {
    setCargoItems(items => items.filter(c => c.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  if (!trip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
        <Box className="w-16 h-16 mb-4 text-slate-300" />
        <h2 className="text-xl font-medium text-slate-700 mb-2">Не обрано рейс</h2>
        <p className="text-center max-w-md">Будь ласка, перейдіть до списку рейсів та оберіть потрібний рейс для планування завантаження.</p>
        <button onClick={() => navigate('/trips')} className="mt-6 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg transition-colors font-medium">
          Перейти до рейсів
        </button>
      </div>
    );
  }

  const unloadingPoints = trip.points.filter(p => p.type === 'unloading');
  const selectedItem = cargoItems.find(c => c.id === selectedItemId);

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between z-20 shadow-sm shrink-0">
        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={() => navigate(`/trips/${trip.id}`)} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-slate-800">3D Планування: {trip.name}</h1>
            <span className="text-xs text-slate-500">Система розміщення вантажу</span>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium text-xs md:text-sm transition-colors shadow-sm ml-2 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Зберегти
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row relative">
        
        {/* 3D Canvas */}
        <div className="flex-1 bg-gradient-to-tr from-slate-200 to-slate-100 relative order-first md:order-last">
          <Canvas shadows camera={{ position: [5, 5, 10], fov: 45 }} onPointerMissed={() => setSelectedItemId(null)}>
             <color attach="background" args={['#e2e8f0']} />
             <ambientLight intensity={0.5} />
             <directionalLight 
                position={[10, 10, 10]} 
                intensity={1} 
                castShadow 
                shadow-mapSize={[1024, 1024]}
             />
             
             <TruckTrailer dimensions={truckDimensions} />
             
             {cargoItems.map(item => (
                <CargoBox 
                   key={item.id} 
                   item={item} 
                   allCargos={cargoItems}
                   truckDimensions={truckDimensions}
                   isSelected={selectedItemId === item.id}
                   onSelect={() => setSelectedItemId(item.id)}
                   onTransformEnd={(p, r) => handleTransformEnd(item.id, p, r)}
                   onDragStart={() => setIsDragging(true)}
                   onDragEnd={() => setIsDragging(false)}
                />
             ))}
             
             <OrbitControls makeDefault enabled={!isDragging} />
          </Canvas>

          {/* Hint Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur rounded-lg px-3 py-2 text-[10px] text-slate-500 font-medium border border-slate-200 shadow-sm pointer-events-none max-w-[250px] md:max-w-none">
             Один палець: Обертання камери • Два пальці: Зум/Панорамування • Тягніть вантаж для переміщення
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="w-full md:w-80 h-[40vh] md:h-full bg-white border-t md:border-t-0 border-slate-200 md:border-r overflow-y-auto shrink-0 p-4 space-y-6 order-last md:order-first z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none">
          
          {/* Truck Dimensions */}
          <div className="space-y-3">
             <h3 className="font-bold text-slate-800 flex items-center">
               <Box className="w-5 h-5 mr-2 text-violet-500" />
               Параметри фургону (м)
             </h3>
             <div className="grid grid-cols-3 gap-2">
               <div>
                  <label className="text-xs text-slate-500 mb-1 block">Ширина</label>
                  <input type="number" step="0.1" value={truckDimensions.width} onChange={e => setTruckDimensions({...truckDimensions, width: parseFloat(e.target.value) || 2.4})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
               </div>
               <div>
                  <label className="text-xs text-slate-500 mb-1 block">Висота</label>
                  <input type="number" step="0.1" value={truckDimensions.height} onChange={e => setTruckDimensions({...truckDimensions, height: parseFloat(e.target.value) || 2.6})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
               </div>
               <div>
                  <label className="text-xs text-slate-500 mb-1 block">Довжина</label>
                  <input type="number" step="0.1" value={truckDimensions.length} onChange={e => setTruckDimensions({...truckDimensions, length: parseFloat(e.target.value) || 13.6})} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
               </div>
             </div>
          </div>

          <hr className="border-slate-100" />

          {/* Cargo List */}
          <div>
            <div className="flex items-center justify-between mb-3">
               <h3 className="font-bold text-slate-800">Список вантажу</h3>
               <button onClick={addCargo} className="p-1.5 bg-violet-100 text-violet-700 hover:bg-violet-200 rounded-md transition-colors">
                 <Plus className="w-4 h-4" />
               </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cargoItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Немає вантажу. Додайте перший елемент.</p>
              ) : cargoItems.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedItemId(c.id)}
                  className={`p-2 rounded-lg border text-sm flex items-center justify-between cursor-pointer transition-colors ${selectedItemId === c.id ? 'bg-violet-50 border-violet-300 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-slate-700 truncate max-w-[120px]">{c.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteCargo(c.id); }} className="text-slate-400 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Selected Cargo Editor */}
          {selectedItem ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
               <h3 className="font-bold text-slate-800">Редагування вантажу</h3>
               
               <div>
                  <label className="text-xs text-slate-500 mb-1 block">Назва вантажу</label>
                  <input type="text" value={selectedItem.name} onChange={e => updateSelectedCargo({ name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
               </div>

               <div className="grid grid-cols-3 gap-2">
                 <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ш (м)</label>
                    <input type="number" step="0.1" value={selectedItem.width} onChange={e => updateSelectedCargo({ width: parseFloat(e.target.value) || 0.1 })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 mb-1 block">В (м)</label>
                    <input type="number" step="0.1" value={selectedItem.height} onChange={e => {
                       const newHeight = parseFloat(e.target.value) || 0.1;
                       updateSelectedCargo({ height: newHeight, position: [selectedItem.position[0], newHeight / 2 + 0.05, selectedItem.position[2]] });
                    }} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 mb-1 block">Д (м)</label>
                    <input type="number" step="0.1" value={selectedItem.length} onChange={e => updateSelectedCargo({ length: parseFloat(e.target.value) || 0.1 })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                 </div>
               </div>

               <div>
                  <label className="text-xs text-slate-500 mb-1 block">Колір</label>
                  <input type="color" value={selectedItem.color} onChange={e => updateSelectedCargo({ color: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer" />
               </div>

               <div>
                  <label className="text-xs text-slate-500 mb-1 block">Прив'язка до адреси розвантаження</label>
                  <select 
                     value={selectedItem.pointId || ''} 
                     onChange={e => updateSelectedCargo({ pointId: e.target.value || undefined })}
                     className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                     <option value="">-- Не прив'язано --</option>
                     {unloadingPoints.map((p, idx) => (
                        <option key={p.id} value={p.id}>({p.sequenceIndex + 1}) {p.name}</option>
                     ))}
                  </select>
               </div>
            </div>
          ) : (
             <div className="p-4 bg-slate-100 rounded-lg text-center text-sm text-slate-500 border border-slate-200 border-dashed">
                Виберіть вантаж для редагування його параметрів або додайте новий.
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
