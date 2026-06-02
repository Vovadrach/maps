import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AppProvider } from './context.tsx';
import { MainLayout } from './MainContainer.tsx';
import { TripsPage } from './pages/TripsPage.tsx';
import { TripDetailsPage } from './pages/TripDetailsPage.tsx';
import { CargoConfiguratorPage } from './pages/CargoConfiguratorPage.tsx';

// Please replace with your own API key
const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBBBHB2VBudIOvMpJPtxDUTbdv4VsRCtcI';

export default function App() {
  return (
    <APIProvider apiKey={API_KEY}>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<div className="p-8 hidden md:flex h-full flex-col justify-center items-center text-slate-400 bg-slate-50"><p className="text-xl font-medium text-slate-600 mb-2">Логістичний Центр</p><p>Виберіть рейс для редагування або перейдіть до списку рейсів у боковому меню.</p></div>} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="trips/:id" element={<TripDetailsPage />} />
              <Route path="trips/:id/cargo" element={<CargoConfiguratorPage />} />
              <Route path="cargo" element={<CargoConfiguratorPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </APIProvider>
  );
}
