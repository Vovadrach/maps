import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context.tsx';
import { useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortablePoint } from '../components/SortablePoint.tsx';
import { PlaceAutocomplete, LIGHT_MAP_ID } from '../components/MapComponents.tsx';
import { ArrowLeft, Upload, FileText, Loader2, Navigation, AlertCircle, RefreshCw, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ParsedWaypoint, Point, Trip } from '../types.ts';

export function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trips, addTrip, updateTrip, setActiveTripId } = useAppContext();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  
  // Local state for editing points
  const [points, setPoints] = useState<Point[]>([]);
  const [unmappedAddresses, setUnmappedAddresses] = useState<ParsedWaypoint[]>([]);
  const [name, setName] = useState('');
  
  // UI states
  const [isUploading, setIsUploading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set active trip ID so map knows what to render (if map is always visible in layout)
  useEffect(() => {
    setActiveTripId(id || null);
    return () => setActiveTripId(null);
  }, [id, setActiveTripId]);

  const { setPreviewTrip } = useAppContext();

  useEffect(() => {
    setPreviewTrip({
      id: id || 'new',
      name: name || 'Новий Рейс',
      createdAt: trip ? trip.createdAt : Date.now(),
      points: points,
      unmappedAddresses: unmappedAddresses
    });
    return () => setPreviewTrip(null);
  }, [points, name, unmappedAddresses, id, trip, setPreviewTrip]);

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  useEffect(() => {
    if (id === 'new') {
      setTrip({ id: 'new', name: 'Новий Рейс', createdAt: Date.now(), points: [] });
      setPoints([]);
      setName('');
    } else {
      const existing = trips.find(t => t.id === id);
      if (existing) {
        setTrip(existing);
        setPoints(existing.points);
        setName(existing.name);
        setUnmappedAddresses(existing.unmappedAddresses || []);
      }
    }
  }, [id, trips]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPoints((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        // Update sequence index
        return newArray.map((pt: any, idx: number) => Object.assign({}, pt, { sequenceIndex: idx }));
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      // We MUST use window.location.origin or relative path for fullstack setup
      const res = await fetch('/api/parse-order', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (data.clientName && !name) {
        setName(data.clientName);
      }

      if (data.waypoints && data.waypoints.length > 0) {
        setUnmappedAddresses(prev => [...prev, ...data.waypoints]);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Не вдалося обробити PDF');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmMapping = (index: number, wp: ParsedWaypoint, mapPoint: Point) => {
    const newPoint = Object.assign({}, mapPoint, {
      type: wp.type as any,
      company: wp.company || mapPoint.company,
      sequenceIndex: points.length
    }) as Point;
    
    setPoints(prev => [...prev, newPoint]);
    setUnmappedAddresses(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddManualPoint = (p: Point) => {
    // Add transit or custom point
    const newPoint = Object.assign({}, p, {
      type: 'transit',
      sequenceIndex: points.length
    }) as Point;
    setPoints([...points, newPoint]);
  };

  const handleRemovePoint = (pointId: string) => {
    setPoints(prev => {
      const newPts = prev.filter(p => p.id !== pointId);
      return newPts.map((p: any, i: number) => Object.assign({}, p, { sequenceIndex: i }));
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Введіть назву рейсу (Клієнта)");
      return;
    }

    const t: Trip = {
      id: trip && trip.id !== 'new' ? trip.id : 'trip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: name,
      createdAt: trip ? trip.createdAt : Date.now(),
      points: points,
      unmappedAddresses: unmappedAddresses
    };

    if (id === 'new') {
      addTrip(t);
      navigate(`/trips/${t.id}`);
    } else {
      updateTrip(t.id, t);
    }
    
    // Feedback
    const btn = document.getElementById('save-btn');
    if (btn) {
      const old = btn.innerText;
      btn.innerText = 'Збережено!';
      setTimeout(() => btn.innerText = old, 2000);
    }
  };

  if (!trip) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-6">
      <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={() => navigate('/trips')} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Назва рейсу..."
            className="text-lg md:text-xl font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 w-32 md:w-auto"
          />
        </div>
        <div className="flex items-center space-x-2 md:space-x-2">
          {trip.id !== 'new' && (
            <button 
              onClick={() => navigate(`/trips/${trip.id}/cargo`)}
              className="bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium text-xs md:text-sm transition-colors shadow-sm border border-sky-200 flex items-center"
            >
              <Box className="w-4 h-4 md:mr-1.5" />
              <span className="hidden md:inline">3D Вантаж</span>
            </button>
          )}
          <button 
            id="save-btn"
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium text-xs md:text-sm transition-colors shadow-sm"
          >
            Зберегти
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 md:p-6 space-y-4 md:space-y-6">
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-violet-500" />
              Завантаження Злеценя (PDF)
            </h2>
            <p className="text-sm text-slate-500 mt-1">AI автоматично розпізнає адреси, які потім можна додати на карту.</p>
          </div>
          
          <div className="p-6">
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full relative group border-2 border-dashed border-violet-200 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-violet-50 hover:border-violet-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50/30"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
                  <span className="font-medium text-violet-700">Аналіз PDF через Gemini AI...</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Upload className="w-6 h-6 text-violet-500" />
                  </div>
                  <span className="font-semibold text-slate-700">Натисніть щоб вибрати PDF</span>
                  <span className="text-xs text-slate-400 mt-2">до 20MB</span>
                </>
              )}
            </button>
            
            {unmappedAddresses.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between pointer-events-none mb-1">
                   <h3 className="text-sm font-semibold text-slate-700">Знайдені адреси ({unmappedAddresses.length})</h3>
                   <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Очікують підтвердження</span>
                </div>
                <AnimatePresence>
                {unmappedAddresses.map((wp, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    key={wp.address + idx} 
                    className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 mb-3"
                  >
                    <div className="flex items-start justify-between mb-3">
                       <div>
                         <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${wp.type === 'loading' ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'}`}>
                           {wp.type === 'loading' ? 'Завантаження' : 'Розвантаження'}
                         </span>
                         {wp.company && <p className="font-medium text-slate-800 text-sm mt-2">{wp.company}</p>}
                         <p className="text-xs text-slate-600 mt-1">{wp.address}</p>
                       </div>
                       <button 
                         onClick={() => setUnmappedAddresses(prev => prev.filter((_, i) => i !== idx))}
                         className="text-amber-400 hover:text-red-500 transition-colors bg-white p-1 rounded-md shadow-sm"
                         title="Відхилити"
                       >
                         <AlertCircle className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="bg-white rounded-lg p-1.5 shadow-sm border border-amber-100/50">
                       <PlaceAutocomplete 
                         initialQuery={`${wp.company ? wp.company + ' ' : ''}${wp.address}`}
                         compact={true}
                         placeholder="Підтвердіть точку на карті..."
                         onPlaceSelected={(p) => handleConfirmMapping(idx, wp, p)}
                       />
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-slate-800 flex items-center">
                <Navigation className="w-5 h-5 mr-2 text-sky-500" />
                Цикл Рейсу
              </h2>
              <p className="text-sm text-slate-500 mt-1">Організуйте адреси. Порядок точок визначає маршрут.</p>
            </div>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold">
              {points.length} точок
            </span>
          </div>
          
          <div className="p-6">
            {points.length > 0 ? (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={points.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {points.map((point, index) => {
                      const cargoCount = trip.cargoItems?.filter(c => c.pointId === point.id).length || 0;
                      return (
                         <SortablePoint key={point.id} point={point} index={index} onRemove={handleRemovePoint} assignedCargo={cargoCount} />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl mb-4">
                Немає точок. Завантажте PDF або додайте адресу вручну.
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Додати доїзд (вручну)</label>
              <PlaceAutocomplete onPlaceSelected={handleAddManualPoint} placeholder="Пошук адреси доїзду..." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
