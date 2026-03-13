import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Link as LinkIcon, Settings, Plus, Save, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://13.62.127.1:8080/api';

export default function Availability() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get(`${API_URL}/availability/0d28a3c2-0715-4116-ab27-12398df3c2aa`);
      setSchedules(res.data);
      if (!selectedId && res.data.length > 0) {
        setSelectedId(res.data[0].id);
      }
      if (res.data.length > schedules.length && schedules.length > 0) {
        setSelectedId(res.data[res.data.length - 1].id);
      }
    } catch (error) {
      console.error("Failed to fetch schedules");
    }
  };

  const selectedSchedule = schedules.find(s => s.id === selectedId);

  const openCreateModal = () => {
    setNewScheduleName('');
    setIsCreateModalOpen(true);
  };

  const submitNewSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName.trim()) return;
    try {
      await axios.post(`${API_URL}/availability`, {
        userId: "0d28a3c2-0715-4116-ab27-12398df3c2aa",
        name: newScheduleName,
        timeZone: "Asia/Kolkata"
      });
      setIsCreateModalOpen(false);
      fetchSchedules();
    } catch (error) {
      alert("Failed to create new schedule.");
    }
  };

  const handleDelete = async (id: string) => {
    if (schedules.length === 1) return alert("You must have at least one availability schedule.");
    if (window.confirm("Delete this schedule?")) {
      await axios.delete(`${API_URL}/availability/${id}`);
      if (selectedId === id) {
        setSelectedId(schedules.find(s => s.id !== id)?.id || null);
      }
      fetchSchedules();
    }
  };

  const handleSetDefault = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    await axios.put(`${API_URL}/availability/${id}`, { ...schedule, isDefault: true });
    fetchSchedules();
  };

  const handleSave = async () => {
    if (!selectedSchedule) return;
    setLoading(true);
    try {
      await axios.put(`${API_URL}/availability/${selectedId}`, {
        name: selectedSchedule.name,
        days: selectedSchedule.days,
        timeZone: selectedSchedule.timeZone,
        isDefault: selectedSchedule.isDefault
      });
      alert("Schedule saved successfully!");
      fetchSchedules();
    } catch (error) {
      alert("Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const updateScheduleState = (updates: any) => {
    setSchedules(schedules.map(s => s.id === selectedId ? { ...s, ...updates } : s));
  };

  const handleToggleDay = (index: number) => {
    const newDays = [...selectedSchedule.days];
    newDays[index].active = !newDays[index].active;
    updateScheduleState({ days: newDays });
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const newDays = [...selectedSchedule.days];
    newDays[index][field] = value;
    updateScheduleState({ days: newDays });
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#101010', color: '#f3f4f6', fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 flex-shrink-0 border-r"
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', padding: '20px 0' }}
      >
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
          <NavItem icon={<LinkIcon size={15} />} label="Event Types" onClick={() => navigate('/dashboard')} />
          <NavItem icon={<Calendar size={15} />} label="Bookings" onClick={() => navigate('/bookings')} />
          <NavItem icon={<Clock size={15} />} label="Availability" active />
          <NavItem icon={<Settings size={15} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-wrap gap-3"
          style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}
        >
          <div>
            <h1 className="text-lg font-semibold" style={{ color: '#f3f4f6' }}>Availability</h1>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Configure multiple schedules for different event types.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{ backgroundColor: '#6d28d9', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5b21b6')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
          >
            <Plus size={13} /> New Schedule
          </button>
        </div>

        {/* Body: two-column layout */}
        <div className="flex flex-1 gap-0 min-h-0 overflow-hidden">
          {/* LEFT: Schedule list */}
          <div
            className="w-64 flex-shrink-0 border-r overflow-y-auto p-4 space-y-2"
            style={{ borderColor: '#2a2a2a', backgroundColor: '#141414' }}
          >
            {schedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                isSelected={selectedId === schedule.id}
                onSelect={() => setSelectedId(schedule.id)}
                onSetDefault={(e) => { e.stopPropagation(); handleSetDefault(schedule.id); }}
                onDelete={(e) => { e.stopPropagation(); handleDelete(schedule.id); }}
              />
            ))}
          </div>

          {/* RIGHT: Editor */}
          {selectedSchedule ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor header */}
              <div
                className="flex items-center justify-between px-6 py-3 border-b flex-wrap gap-3 flex-shrink-0"
                style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}
              >
                <input
                  type="text"
                  value={selectedSchedule.name}
                  onChange={(e) => updateScheduleState({ name: e.target.value })}
                  className="font-semibold text-sm bg-transparent border-none outline-none rounded px-2 py-1 -ml-2 transition"
                  style={{ color: '#f3f4f6' }}
                  onFocus={e => (e.currentTarget.style.backgroundColor = '#2a2a2a')}
                  onBlur={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                />
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#6d28d9', color: '#fff' }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#5b21b6')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
                >
                  <Save size={13} />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* Editor body */}
              <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#101010' }}>
                {/* Timezone */}
                <div className="mb-8 max-w-xs">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>Timezone</label>
                  <select
                    value={selectedSchedule.timeZone}
                    onChange={(e) => updateScheduleState({ timeZone: e.target.value })}
                    className="w-full rounded-md px-3 py-2 text-sm border outline-none transition"
                    style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>

                {/* Days */}
                <div className="space-y-1">
                  <p className="text-xs font-medium mb-3" style={{ color: '#9ca3af' }}>Weekly Hours</p>
                  {selectedSchedule.days?.map((day: any, index: number) => (
                    <DayRow
                      key={day.day}
                      day={day}
                      index={index}
                      onToggle={() => handleToggleDay(index)}
                      onTimeChange={handleTimeChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: '#6b7280' }}>
              <p className="text-sm">Select a schedule to edit</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-sm rounded-xl shadow-2xl border"
            style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-base font-semibold" style={{ color: '#f3f4f6' }}>New Schedule</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-md transition"
                style={{ color: '#6b7280' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitNewSchedule} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>Schedule Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g., Presentation Hours"
                  value={newScheduleName}
                  onChange={e => setNewScheduleName(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none transition"
                  style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-md text-sm font-medium transition-all"
                style={{ backgroundColor: '#6d28d9', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5b21b6')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
              >
                Create Schedule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleCard({ schedule, isSelected, onSelect, onSetDefault, onDelete }: {
  schedule: any;
  isSelected: boolean;
  onSelect: () => void;
  onSetDefault: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg px-3 py-3 border cursor-pointer transition-all"
      style={{
        backgroundColor: isSelected ? '#222222' : hovered ? '#1e1e1e' : 'transparent',
        borderColor: isSelected ? '#6d28d9' : hovered ? '#3f3f46' : '#2a2a2a',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate" style={{ color: '#f3f4f6' }}>{schedule.name}</span>
        {schedule.isDefault && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-2 flex-shrink-0"
            style={{ backgroundColor: '#1e1b4b', color: '#a78bfa', border: '1px solid #3730a3' }}
          >
            Default
          </span>
        )}
      </div>
      <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>{schedule.timeZone}</p>

      {isSelected && (
        <div className="mt-3 pt-2.5 border-t flex gap-3" style={{ borderColor: '#2a2a2a' }}>
          {!schedule.isDefault && (
            <button
              onClick={onSetDefault}
              className="text-xs font-medium transition"
              style={{ color: '#9ca3af' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >
              Set as Default
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-xs font-medium ml-auto transition"
            style={{ color: '#f87171' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fca5a5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#f87171')}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DayRow({ day, index, onToggle, onTimeChange }: {
  day: any;
  index: number;
  onToggle: () => void;
  onTimeChange: (index: number, field: 'start' | 'end', value: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg border transition-all flex-wrap"
      style={{
        borderColor: day.active ? '#2a2a2a' : '#1e1e1e',
        backgroundColor: day.active ? '#1a1a1a' : 'transparent',
      }}
    >
      {/* Toggle + Day */}
      <div className="flex items-center gap-3 w-36 flex-shrink-0">
        <button
          onClick={onToggle}
          className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
          style={{ backgroundColor: day.active ? '#6d28d9' : '#2a2a2a' }}
        >
          <div
            className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform"
            style={{ transform: day.active ? 'translateX(18px)' : 'translateX(2px)' }}
          />
        </button>
        <span className="text-sm font-medium" style={{ color: day.active ? '#f3f4f6' : '#4b5563' }}>
          {day.day}
        </span>
      </div>

      {/* Time inputs or unavailable */}
      {day.active ? (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={day.start}
            onChange={(e) => onTimeChange(index, 'start', e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-xs border outline-none transition"
            style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          />
          <span className="text-xs" style={{ color: '#4b5563' }}>—</span>
          <input
            type="time"
            value={day.end}
            onChange={(e) => onTimeChange(index, 'end', e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-xs border outline-none transition"
            style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
          />
        </div>
      ) : (
        <span className="text-xs" style={{ color: '#4b5563' }}>Unavailable</span>
      )}
    </div>
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