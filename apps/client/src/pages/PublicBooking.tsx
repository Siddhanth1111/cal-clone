import React from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';

export default function PublicBooking() {
  const { username, eventSlug } = useParams();

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm max-w-4xl w-full flex flex-col md:flex-row overflow-hidden">
        {/* Event Details */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200 w-full md:w-1/3">
          <p className="text-gray-500 font-medium mb-1">{username}</p>
          <h1 className="text-2xl font-bold text-black mb-4">{eventSlug?.replace('-', ' ')}</h1>
          <div className="flex items-center gap-2 text-gray-600 font-medium">
            <Clock size={18} /> 30 Min Meeting
          </div>
        </div>
        
        {/* Calendar Placeholder */}
        <div className="p-8 flex-1 text-center">
          <h2 className="text-lg font-bold text-black mb-6">Select a Date & Time</h2>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(31)].map((_, i) => (
              <div key={i} className="aspect-square flex items-center justify-center rounded-full hover:bg-black hover:text-white cursor-pointer text-sm border border-gray-100">
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}