import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Trip } from './types.ts';

type AppContextType = {
  trips: Trip[];
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, trip: Trip) => void;
  deleteTrip: (id: string) => void;
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  previewTrip: Trip | null;
  setPreviewTrip: (trip: Trip | null) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('logistics_trips');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [previewTrip, setPreviewTrip] = useState<Trip | null>(null);

  useEffect(() => {
    localStorage.setItem('logistics_trips', JSON.stringify(trips));
  }, [trips]);

  const addTrip = (trip: Trip) => setTrips(prev => [...prev, trip]);
  const updateTrip = (id: string, updated: Trip) => setTrips(prev => prev.map(t => t.id === id ? updated : t));
  const deleteTrip = (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    if (activeTripId === id) setActiveTripId(null);
  };

  return (
    <AppContext.Provider value={{ trips, addTrip, updateTrip, deleteTrip, activeTripId, setActiveTripId, previewTrip, setPreviewTrip }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
