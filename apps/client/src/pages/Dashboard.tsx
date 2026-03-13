import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Link as LinkIcon, Settings, Plus, X, Edit2, Trash2, Search } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://13.62.127.1:8080/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [eventTypes, setEventTypes] = useState([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', duration: 30, urlSlug: '', availabilityId: '' });

  useEffect(() => {
    fetchEvents();
    fetchSchedules();
  }, []);

  const fetchEvents = async () => {
    const res = await axios.get(`${API_URL}/events`);
    setEventTypes(res.data);
  };

  const fetchSchedules = async () => {
    const res = await axios.get(`${API_URL}/availability/0d28a3c2-0715-4116-ab27-12398df3c2aa`);
    setSchedules(res.data);
  };

  const openCreateModal = () => {
    setEditingId(null);
    const defaultSchedule = schedules.find(s => s.isDefault)?.id || (schedules.length > 0 ? schedules[0].id : '');
    setNewEvent({ title: '', description: '', duration: 30, urlSlug: '', availabilityId: defaultSchedule });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, event: any) => {
    e.stopPropagation();
    setEditingId(event.id);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      duration: event.duration,
      urlSlug: event.urlSlug,
      availabilityId: event.availabilityId || (schedules.find(s => s.isDefault)?.id || '')
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this event type? This will not delete past bookings.")) {
      await axios.delete(`${API_URL}/events/${id}`);
      fetchEvents();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/events/${editingId}`, newEvent);
      } else {
        await axios.post(`${API_URL}/events`, { ...newEvent, userId: "0d28a3c2-0715-4116-ab27-12398df3c2aa" });
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      alert("Failed to save event type.");
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#101010', color: '#f3f4f6', fontFamily: "'Cal Sans', system-ui, -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 flex-shrink-0 border-r"
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', padding: '20px 0' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer px-4 mb-8"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: '#6d28d9' }}>
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: '#f3f4f6' }}>Cal.clone</span>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          <NavItem icon={<LinkIcon size={15} />} label="Event Types" active onClick={() => navigate('/dashboard')} />
          <NavItem icon={<Calendar size={15} />} label="Bookings" onClick={() => navigate('/bookings')} />
          <NavItem icon={<Clock size={15} />} label="Availability" onClick={() => navigate('/availability')} />
          <NavItem icon={<Settings size={15} />} label="Settings" />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-wrap gap-3"
          style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}
        >
          <div>
            <h1 className="text-lg font-semibold" style={{ color: '#f3f4f6' }}>Event Types</h1>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Configure different events for people to book on your calendar.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-md border outline-none"
                style={{
                  backgroundColor: '#111111',
                  borderColor: '#2a2a2a',
                  color: '#f3f4f6',
                  width: '180px',
                }}
              />
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ backgroundColor: '#6d28d9', color: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5b21b6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
            >
              <Plus size={13} /> New
            </button>
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 px-4 sm:px-6 py-6">
          {eventTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48" style={{ color: '#6b7280' }}>
              <LinkIcon size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No event types yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventTypes.map((event: any) => {
                const scheduleName = schedules.find(s => s.id === event.availabilityId)?.name || 'Default Schedule';
                return (
                  <EventRow
                    key={event.id}
                    event={event}
                    scheduleName={scheduleName}
                    onEdit={(e) => openEditModal(e, event)}
                    onDelete={(e) => handleDelete(e, event.id)}
                    onClick={() => navigate(`/book/0d28a3c2-0715-4116-ab27-12398df3c2aa/${event.urlSlug}`)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md rounded-xl shadow-2xl border"
            style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-base font-semibold" style={{ color: '#f3f4f6' }}>
                {editingId ? 'Edit Event Type' : 'New Event Type'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md transition"
                style={{ color: '#6b7280' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <FormField label="Title">
                <input
                  type="text"
                  required
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none transition"
                  style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                />
              </FormField>

              <FormField label="URL Slug">
                <input
                  type="text"
                  required
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none transition"
                  style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                  value={newEvent.urlSlug}
                  onChange={e => setNewEvent({ ...newEvent, urlSlug: e.target.value })}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  rows={2}
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none transition resize-none"
                  style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Duration (min)">
                  <input
                    type="number"
                    required
                    min="15"
                    step="15"
                    className="w-full rounded-md px-3 py-2 text-sm border outline-none transition"
                    style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                    value={newEvent.duration}
                    onChange={e => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) })}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                  />
                </FormField>

                <FormField label="Schedule">
                  <select
                    required
                    value={newEvent.availabilityId}
                    onChange={e => setNewEvent({ ...newEvent, availabilityId: e.target.value })}
                    className="w-full rounded-md px-3 py-2 text-sm border outline-none transition"
                    style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                  >
                    {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </FormField>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-md text-sm font-medium transition-all mt-2"
                style={{ backgroundColor: '#6d28d9', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5b21b6')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
              >
                {editingId ? 'Save Changes' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, scheduleName, onEdit, onDelete, onClick }: {
  event: any;
  scheduleName: string;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center justify-between rounded-lg px-4 py-3.5 border cursor-pointer transition-all"
      style={{
        backgroundColor: hovered ? '#222222' : '#1a1a1a',
        borderColor: hovered ? '#3f3f46' : '#2a2a2a',
      }}
    >
      {/* Left: color dot + info */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: '#6d28d9' }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm" style={{ color: '#f3f4f6' }}>{event.title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#111111', color: '#9ca3af', border: '1px solid #2a2a2a' }}>
              /{event.urlSlug}
            </span>
          </div>
          {event.description && (
            <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#6b7280' }}>{event.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs flex items-center gap-1" style={{ color: '#9ca3af' }}>
              <Clock size={11} /> {event.duration}m
            </span>
            <span className="text-xs" style={{ color: '#6b7280' }}>{scheduleName}</span>
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div
        className="flex items-center gap-1 flex-shrink-0 transition-opacity"
        style={{ opacity: hovered ? 1 : 0 }}
        onClick={e => e.stopPropagation()}
      >
        <ActionButton onClick={onEdit} title="Edit">
          <Edit2 size={14} />
        </ActionButton>
        <ActionButton onClick={onDelete} title="Delete" danger>
          <Trash2 size={14} />
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({ onClick, children, title, danger = false }: {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  title: string;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-1.5 rounded-md transition-all"
      style={{
        color: hovered ? (danger ? '#f87171' : '#f3f4f6') : '#6b7280',
        backgroundColor: hovered ? (danger ? 'rgba(248,113,113,0.1)' : '#2a2a2a') : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function NavItem({ icon, label, active = false, onClick }: {
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium cursor-pointer transition-all"
      style={{
        backgroundColor: active ? '#2a2a2a' : hovered ? '#222222' : 'transparent',
        color: active ? '#f3f4f6' : hovered ? '#d1d5db' : '#6b7280',
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>{label}</label>
      {children}
    </div>
  );
}