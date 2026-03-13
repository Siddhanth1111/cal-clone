import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PublicBooking from './pages/PublicBooking';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect to dashboard for now */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Admin Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Public Booking Route */}
        <Route path="/book/:username/:eventSlug" element={<PublicBooking />} />
      </Routes>
    </BrowserRouter>
  );
}