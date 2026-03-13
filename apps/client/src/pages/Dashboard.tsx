import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Link as LinkIcon, Settings, Plus, X } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export default function Dashboard() {
  const [eventTypes, setEventTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBot, setNewBot] = useState({ title: '', duration: 30, urlSlug: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const res = await axios.get(`${API_URL}/events`);
    setEventTypes(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post(`${API_URL}/events`, {
      ...newBot,
      userId: "default-admin-id" // In a real app, get this from auth context
    });
    setIsModalOpen(false);
    fetchEvents();
  };

  return (
    <div className="min-h-screen flex bg-[#f9fafb]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 hidden md:block">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Calendar className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-black">Cal.clone</span>
        </div>
        <nav className="space-y-1">
          <NavItem icon={<LinkIcon size={18} />} label="Event Types" active />
          <NavItem icon={<Calendar size={18} />} label="Bookings" />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black">Event Types</h1>
            <p className="text-gray-500 text-sm">Create events to share for booking.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition"
          >
            <Plus size={16} /> New
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTypes.map((event: any) => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-black transition cursor-pointer">
              <h3 className="font-semibold text-black">{event.title}</h3>
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-2">
                <Clock size={14} /> {event.duration} mins
              </p>
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-black">New Event Type</h2>
                <X className="cursor-pointer" onClick={() => setIsModalOpen(false)} />
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input 
                    type="text" required
                    className="w-full border border-gray-300 rounded-md p-2 mt-1 text-black" 
                    onChange={e => setNewBot({...newBot, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                  <input 
                    type="text" required
                    className="w-full border border-gray-300 rounded-md p-2 mt-1 text-black" 
                    onChange={e => setNewBot({...newBot, urlSlug: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-black text-white py-2 rounded-md font-medium">Create</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${active ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
      {icon}
      {label}
    </div>
  );
}