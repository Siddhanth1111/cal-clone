import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PublicBooking from './pages/PublicBooking';
import Availability from './pages/Availability';
import Bookings from './pages/Bookings'; // <-- 1. Add this import

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/availability" element={<Availability />} />
        
        {/* <-- 2. Add this route --> */}
        <Route path="/bookings" element={<Bookings />} />
        
        <Route path="/book/:username/:eventSlug" element={<PublicBooking />} />
      </Routes>
    </BrowserRouter>
  );
}