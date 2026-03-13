import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Link as LinkIcon, Settings, Plus, X, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [eventTypes, setEventTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State to track if we are editing an existing event or creating a new one
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', duration: 30, urlSlug: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_URL}/events`);
      setEventTypes(res.data);
    } catch (error) {
      console.error("Failed to fetch events");
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNewEvent({ title: '', description: '', duration: 30, urlSlug: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, event: any) => {
    e.stopPropagation(); // Prevents the card click (routing) from triggering
    setEditingId(event.id);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      duration: event.duration,
      urlSlug: event.urlSlug
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevents the card click
    
    if (window.confirm("Are you sure you want to delete this event type? This will not delete past bookings.")) {
      try {
        await axios.delete(`${API_URL}/events/${id}`);
        fetchEvents(); // Refresh the list
      } catch (error) {
        alert("Failed to delete event.");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update existing event
        await axios.put(`${API_URL}/events/${editingId}`, newEvent);
      } else {
        // Create new event
        await axios.post(`${API_URL}/events`, {
          ...newEvent,
          userId: "default-admin-id" 
        });
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      alert("Failed to save event type.");
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f9fafb]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 hidden md:block">
        <div className="flex items-center gap-2 mb-10 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Calendar className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-black">Cal.clone</span>
        </div>
        <nav className="space-y-1">
          <NavItem icon={<LinkIcon size={18} />} label="Event Types" active onClick={() => navigate('/dashboard')} />
          <NavItem icon={<Calendar size={18} />} label="Bookings" onClick={() => navigate('/bookings')} />
          <NavItem icon={<Clock size={18} />} label="Availability" onClick={() => navigate('/availability')} />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 max-w-5xl">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black">Event Types</h1>
            <p className="text-gray-500 text-sm mt-1">Create events to share for booking.</p>
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition"
          >
            <Plus size={16} /> New
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTypes.map((event: any) => (
            <div 
              key={event.id} 
              onClick={() => navigate(`/book/siddhanth/${event.urlSlug}`)} 
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-black transition cursor-pointer shadow-sm relative group"
            >
              <h3 className="font-semibold text-black pr-12">{event.title}</h3>
              {event.description && <p className="text-gray-500 text-sm mt-1 truncate">{event.description}</p>}
              <p className="text-gray-500 text-sm flex items-center gap-1 mt-3 font-medium">
                <Clock size={14} /> {event.duration} mins
              </p>

              {/* Hover Actions (Edit & Delete) */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => openEditModal(e, event)}
                  className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-md transition"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => handleDelete(e, event.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {eventTypes.length === 0 && (
             <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-xl">
               <p className="text-gray-500">No event types created yet.</p>
             </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-black">{editingId ? 'Edit Event Type' : 'New Event Type'}</h2>
                <X className="cursor-pointer text-gray-400 hover:text-black" onClick={() => setIsModalOpen(false)} />
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input type="text" required className="w-full border border-gray-300 rounded-md p-2 mt-1 text-black focus:ring-black focus:border-black" 
                    value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                  <input type="text" required className="w-full border border-gray-300 rounded-md p-2 mt-1 text-black focus:ring-black focus:border-black" 
                    value={newEvent.urlSlug} onChange={e => setNewEvent({...newEvent, urlSlug: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea className="w-full border border-gray-300 rounded-md p-2 mt-1 text-black focus:ring-black focus:border-black" rows={2}
                    value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                  <input type="number" required min="15" step="15" className="w-full border border-gray-300 rounded-md p-2 mt-1 text-black focus:ring-black focus:border-black" 
                    value={newEvent.duration} onChange={e => setNewEvent({...newEvent, duration: parseInt(e.target.value)})} />
                </div>
                <button type="submit" className="w-full bg-black text-white py-2 rounded-md font-medium hover:bg-gray-800 transition">
                  {editingId ? 'Save Changes' : 'Create Event'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition ${active ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
      {icon} {label}
    </div>
  );
}