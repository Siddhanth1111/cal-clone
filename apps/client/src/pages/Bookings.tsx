import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Link as LinkIcon, Settings, User, AlignLeft, XCircle, RefreshCw, X } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [availability, setAvailability] = useState<any>(null);

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<any>(null);
  const [rescheduleDateStr, setRescheduleDateStr] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    fetchBookings();
    fetchAvailability();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_URL}/bookings`);
      setBookings(res.data);
    } catch (error) {
      console.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const availRes = await axios.get(`${API_URL}/availability/0d28a3c2-0715-4116-ab27-12398df3c2aa`);
      setAvailability(availRes.data);
    } catch (error) {
      console.error("Failed to fetch availability");
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        await axios.put(`${API_URL}/bookings/${id}/cancel`);
        fetchBookings();
      } catch (error) {
        alert("Failed to cancel booking.");
      }
    }
  };

  const openRescheduleModal = (booking: any) => {
    setBookingToEdit(booking);
    setRescheduleDateStr('');
    setRescheduleDate(null);
    setAvailableSlots([]);
    setNewTime('');
    setRescheduleModalOpen(true);
  };

  useEffect(() => {
    if (!rescheduleDate || !bookingToEdit || !availability) return;

    const fetchAndGenerateSlots = async () => {
      const startOfDay = new Date(rescheduleDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(rescheduleDate);
      endOfDay.setHours(23, 59, 59, 999);

      const res = await axios.get(`${API_URL}/bookings/busy?userId=${bookingToEdit.userId}&start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`);

      const fetchedBusy = res.data.map((b: any) => ({
        start: new Date(b.startTime),
        end: new Date(b.endTime)
      }));

      const eventsRes = await axios.get(`${API_URL}/events`);
      const linkedEvent = eventsRes.data.find((e: any) => e.id === bookingToEdit.eventTypeId);

      const targetSchedule = availability.find((a: any) => a.id === linkedEvent?.availabilityId)
        || availability.find((a: any) => a.isDefault)
        || availability[0];

      const dayName = rescheduleDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dayConfig = targetSchedule.days.find((d: any) => d.day === dayName);

      if (!dayConfig || !dayConfig.active) {
        setAvailableSlots([]);
        return;
      }

      const slots = [];
      const [startHour, startMin] = dayConfig.start.split(':').map(Number);
      const [endHour, endMin] = dayConfig.end.split(':').map(Number);

      let currentSlot = new Date(rescheduleDate);
      currentSlot.setHours(startHour, startMin, 0, 0);

      const endTime = new Date(rescheduleDate);
      endTime.setHours(endHour, endMin, 0, 0);

      const oldStart = new Date(bookingToEdit.startTime).getTime();
      const oldEnd = new Date(bookingToEdit.endTime).getTime();
      const durationInMs = oldEnd - oldStart;
      const bufferInMs = 1 * 60000;
      const now = new Date();

      while (currentSlot.getTime() + durationInMs <= endTime.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + durationInMs);

        const isOverlapping = fetchedBusy.some((busy: { start: Date, end: Date }) => {
          if (busy.start.getTime() === oldStart && busy.end.getTime() === oldEnd) return false;
          return (currentSlot < busy.end && slotEnd > busy.start);
        });

        if (currentSlot > now && !isOverlapping) {
          slots.push(currentSlot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }

        currentSlot = new Date(slotEnd.getTime() + bufferInMs);
      }
      setAvailableSlots(slots);
    };

    fetchAndGenerateSlots();
  }, [rescheduleDate, bookingToEdit, availability]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRescheduleDateStr(val);
    setNewTime('');
    if (val) {
      const [year, month, day] = val.split('-').map(Number);
      setRescheduleDate(new Date(year, month - 1, day));
    } else {
      setRescheduleDate(null);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingToEdit || !rescheduleDate || !newTime) return;

    const oldStart = new Date(bookingToEdit.startTime).getTime();
    const oldEnd = new Date(bookingToEdit.endTime).getTime();
    const durationMins = (oldEnd - oldStart) / 60000;

    const timeMatch = newTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return;

    let [_, hoursStr, minutesStr, modifier] = timeMatch;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const newStartDateTime = new Date(rescheduleDate);
    newStartDateTime.setHours(hours, minutes, 0, 0);
    const newEndDateTime = new Date(newStartDateTime.getTime() + durationMins * 60000);

    try {
      await axios.put(`${API_URL}/bookings/${bookingToEdit.id}`, {
        startTime: newStartDateTime.toISOString(),
        endTime: newEndDateTime.toISOString()
      });
      setRescheduleModalOpen(false);
      fetchBookings();
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        alert(error.response.data.error);
      } else {
        alert("Failed to reschedule booking.");
      }
    }
  };

  const now = new Date();
  const filteredBookings = bookings.filter((b: any) => {
    const start = new Date(b.startTime);
    if (activeTab === 'cancelled') return b.status === 'CANCELLED';
    if (activeTab === 'upcoming') return b.status === 'CONFIRMED' && start > now;
    if (activeTab === 'past') return b.status === 'CONFIRMED' && start <= now;
    return false;
  });

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
          <NavItem icon={<Calendar size={15} />} label="Bookings" active onClick={() => navigate('/bookings')} />
          <NavItem icon={<Clock size={15} />} label="Availability" onClick={() => navigate('/availability')} />
          <NavItem icon={<Settings size={15} />} label="Settings" />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}
        >
          <div>
            <h1 className="text-lg font-semibold" style={{ color: '#f3f4f6' }}>Bookings</h1>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>See upcoming and past events booked through your links.</p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-0 border-b px-6"
          style={{ borderColor: '#2a2a2a', backgroundColor: '#141414' }}
        >
          {(['upcoming', 'past', 'cancelled'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-3 text-xs font-medium capitalize transition-all border-b-2"
              style={{
                borderColor: activeTab === tab ? '#6d28d9' : 'transparent',
                color: activeTab === tab ? '#f3f4f6' : '#6b7280',
              }}
              onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = '#d1d5db'; }}
              onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = '#6b7280'; }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32" style={{ color: '#6b7280' }}>
              <p className="text-sm">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48" style={{ color: '#6b7280' }}>
              <Calendar size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No {activeTab} bookings found.</p>
            </div>
          ) : (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}
            >
              {filteredBookings.map((booking: any, idx: number) => {
                const startDate = new Date(booking.startTime);
                const endDate = new Date(booking.endTime);
                const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                const isCancelled = booking.status === 'CANCELLED';
                const isPast = activeTab === 'past';

                return (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row gap-4 px-5 py-4 transition-all"
                    style={{
                      borderTop: idx !== 0 ? '1px solid #2a2a2a' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e1e1e')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Date column */}
                    <div className="w-40 flex-shrink-0 pt-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                        {startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: isCancelled ? '#4b5563' : '#6b7280', textDecoration: isCancelled ? 'line-through' : 'none' }}
                      >
                        {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} –{' '}
                        {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Details column */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm font-semibold flex items-center gap-2"
                        style={{ color: isCancelled ? '#4b5563' : '#f3f4f6' }}
                      >
                        <User size={14} style={{ color: '#6b7280' }} />
                        {booking.bookerName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span
                          className="text-xs flex items-center gap-1 px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#111111', color: '#9ca3af', border: '1px solid #2a2a2a' }}
                        >
                          <Clock size={11} /> {durationMins} mins
                        </span>
                        <span className="text-xs" style={{ color: '#6b7280' }}>{booking.bookerEmail}</span>
                      </div>
                      {booking.notes && (
                        <div
                          className="flex gap-2 items-start mt-2 px-3 py-2 rounded-md text-xs"
                          style={{
                            backgroundColor: '#111111',
                            border: '1px solid #2a2a2a',
                            color: isCancelled ? '#4b5563' : '#9ca3af',
                          }}
                        >
                          <AlignLeft size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#4b5563' }} />
                          <span className="italic">"{booking.notes}"</span>
                        </div>
                      )}
                    </div>

                    {/* Status + actions */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={
                          isCancelled
                            ? { backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }
                            : isPast
                            ? { backgroundColor: '#1e1e1e', color: '#6b7280', border: '1px solid #2a2a2a' }
                            : { backgroundColor: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
                        }
                      >
                        {booking.status}
                      </span>

                      {activeTab === 'upcoming' && (
                        <div className="flex gap-3 mt-1">
                          <button
                            onClick={() => openRescheduleModal(booking)}
                            className="text-xs font-medium flex items-center gap-1 transition"
                            style={{ color: '#818cf8' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#818cf8')}
                          >
                            <RefreshCw size={12} /> Reschedule
                          </button>
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="text-xs font-medium flex items-center gap-1 transition"
                            style={{ color: '#6b7280' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                          >
                            <XCircle size={12} /> Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Reschedule Modal */}
      {rescheduleModalOpen && bookingToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-sm rounded-xl shadow-2xl border"
            style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-base font-semibold" style={{ color: '#f3f4f6' }}>Reschedule Booking</h2>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="p-1 rounded-md transition"
                style={{ color: '#6b7280' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="px-6 py-5 space-y-4">
              {/* Info banner */}
              <div
                className="px-3 py-2.5 rounded-md text-xs"
                style={{ backgroundColor: '#111111', border: '1px solid #2a2a2a', color: '#9ca3af' }}
              >
                <span style={{ color: '#6b7280' }}>Moving meeting with </span>
                <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{bookingToEdit.bookerName}</span>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>Select New Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleDateStr}
                  onChange={handleDateChange}
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none transition"
                  style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6', colorScheme: 'dark' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>Select New Time</label>
                <select
                  required
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  disabled={!rescheduleDateStr || availableSlots.length === 0}
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none transition disabled:opacity-40"
                  style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                >
                  <option value="" disabled>
                    {!rescheduleDateStr ? 'Select a date first' : availableSlots.length === 0 ? 'No slots available' : 'Choose a time'}
                  </option>
                  {availableSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!newTime}
                className="w-full py-2 rounded-md text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                style={{ backgroundColor: '#6d28d9', color: '#fff' }}
                onMouseEnter={e => { if (newTime) e.currentTarget.style.backgroundColor = '#5b21b6'; }}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
              >
                Confirm Reschedule
              </button>
            </form>
          </div>
        </div>
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