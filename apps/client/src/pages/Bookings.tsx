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

  // RESCHEDULE STATE
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
      const availRes = await axios.get(`${API_URL}/availability/default-admin-id`);
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

  // OPEN MODAL (Resetting the state)
  const openRescheduleModal = (booking: any) => {
    setBookingToEdit(booking);
    setRescheduleDateStr('');
    setRescheduleDate(null);
    setAvailableSlots([]);
    setNewTime('');
    setRescheduleModalOpen(true);
  };

  // WHEN A NEW DATE IS PICKED, GENERATE THE STRICT SLOTS
  useEffect(() => {
    if (!rescheduleDate || !bookingToEdit || !availability) return;

    const fetchAndGenerateSlots = async () => {
      const startOfDay = new Date(rescheduleDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(rescheduleDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch busy slots for this date
      const res = await axios.get(`${API_URL}/bookings/busy?userId=${bookingToEdit.userId}&start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`);
      
      const fetchedBusy = res.data.map((b: any) => ({
        start: new Date(b.startTime),
        end: new Date(b.endTime)
      }));

      const dayName = rescheduleDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dayConfig = availability.days.find((d: any) => d.day === dayName);

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

      // Calculate the duration of the meeting we are editing
      const oldStart = new Date(bookingToEdit.startTime).getTime();
      const oldEnd = new Date(bookingToEdit.endTime).getTime();
      const durationInMs = oldEnd - oldStart;
      const now = new Date();

      while (currentSlot.getTime() + durationInMs <= endTime.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + durationInMs);
        
        // Check for overlaps (ignoring the exact slot of the booking we are currently editing!)
        const isOverlapping = fetchedBusy.some((busy: { start: Date, end: Date }) => {
          if (busy.start.getTime() === oldStart && busy.end.getTime() === oldEnd) return false;
          return (currentSlot < busy.end && slotEnd > busy.start);
        });

        if (currentSlot > now && !isOverlapping) {
          slots.push(currentSlot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }
        currentSlot = slotEnd;
      }
      setAvailableSlots(slots);
    };

    fetchAndGenerateSlots();
  }, [rescheduleDate, bookingToEdit, availability]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRescheduleDateStr(val);
    setNewTime(''); // Clear the time dropdown

    if (val) {
      // Safely parse the date ignoring timezone drift
      const [year, month, day] = val.split('-').map(Number);
      setRescheduleDate(new Date(year, month - 1, day));
    } else {
      setRescheduleDate(null);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingToEdit || !rescheduleDate || !newTime) return;

    // 1. Calculate the duration
    const oldStart = new Date(bookingToEdit.startTime).getTime();
    const oldEnd = new Date(bookingToEdit.endTime).getTime();
    const durationMins = (oldEnd - oldStart) / 60000;

    // 2. Safely parse the exact time from the dropdown
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
    <div className="min-h-screen flex bg-[#f9fafb]">
      <aside className="w-64 bg-white border-r border-gray-200 p-6 hidden md:block">
        <div className="flex items-center gap-2 mb-10 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Calendar className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-black">Cal.clone</span>
        </div>
        <nav className="space-y-1">
          <NavItem icon={<LinkIcon size={18} />} label="Event Types" onClick={() => navigate('/dashboard')} />
          <NavItem icon={<Calendar size={18} />} label="Bookings" active onClick={() => navigate('/bookings')} />
          <NavItem icon={<Clock size={18} />} label="Availability" onClick={() => navigate('/availability')} />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>
      </aside>

      <main className="flex-1 p-10 max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-black">Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">See upcoming and past events booked through your links.</p>
        </header>

        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button onClick={() => setActiveTab('upcoming')} className={`pb-3 font-medium text-sm transition ${activeTab === 'upcoming' ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'}`}>Upcoming</button>
          <button onClick={() => setActiveTab('past')} className={`pb-3 font-medium text-sm transition ${activeTab === 'past' ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'}`}>Past</button>
          <button onClick={() => setActiveTab('cancelled')} className={`pb-3 font-medium text-sm transition ${activeTab === 'cancelled' ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-black'}`}>Cancelled</button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading bookings...</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {filteredBookings.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No {activeTab} bookings found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredBookings.map((booking: any) => {
                  const startDate = new Date(booking.startTime);
                  const endDate = new Date(booking.endTime);
                  const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

                  return (
                    <div key={booking.id} className="p-6 hover:bg-gray-50 transition flex flex-col md:flex-row gap-6">
                      <div className="w-48 shrink-0">
                        <p className="text-sm font-semibold text-black uppercase tracking-wider mb-1">
                          {startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className={`text-sm flex items-center gap-2 ${activeTab === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                          {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex-1">
                        <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${activeTab === 'cancelled' ? 'text-gray-400' : 'text-black'}`}>
                          <User size={18} className="text-gray-400" /> {booking.bookerName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1 font-medium bg-gray-100 px-2 py-1 rounded text-gray-700">
                            <Clock size={14} /> {durationMins} mins
                          </span>
                          <span>{booking.bookerEmail}</span>
                        </div>
                        {booking.notes && (
                          <div className={`bg-gray-50 p-3 rounded-md text-sm border flex gap-2 items-start mt-2 ${activeTab === 'cancelled' ? 'text-gray-400 border-gray-50' : 'text-gray-600 border-gray-100'}`}>
                            <AlignLeft size={16} className="text-gray-400 shrink-0 mt-0.5" />
                            <span className="italic">"{booking.notes}"</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="shrink-0 pt-1 flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${booking.status === 'CONFIRMED' ? (activeTab === 'past' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700') : 'bg-red-50 text-red-600'}`}>
                          {booking.status}
                        </span>
                        
                        {activeTab === 'upcoming' && (
                          <div className="flex gap-3 mt-2">
                            <button onClick={() => openRescheduleModal(booking)} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition">
                              <RefreshCw size={14} /> Reschedule
                            </button>
                            <button onClick={() => handleCancel(booking.id)} className="text-xs font-medium text-gray-500 hover:text-red-600 flex items-center gap-1 transition">
                              <XCircle size={14} /> Cancel
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
        )}

        {/* RESCHEDULE MODAL */}
        {rescheduleModalOpen && bookingToEdit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-black">Reschedule Booking</h2>
                <X className="cursor-pointer text-gray-400 hover:text-black" onClick={() => setRescheduleModalOpen(false)} />
              </div>
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md mb-4 border border-gray-100">
                  <p className="text-sm font-medium text-gray-700">Moving meeting with:</p>
                  <p className="text-black font-bold">{bookingToEdit.bookerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select New Date</label>
                  <input type="date" required min={new Date().toISOString().split('T')[0]} value={rescheduleDateStr} onChange={handleDateChange}
                    className="w-full border border-gray-300 rounded-md p-2 text-black focus:ring-black focus:border-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select New Time</label>
                  <select 
                    required 
                    value={newTime} 
                    onChange={e => setNewTime(e.target.value)}
                    disabled={!rescheduleDateStr || availableSlots.length === 0}
                    className="w-full border border-gray-300 rounded-md p-2 text-black focus:ring-black focus:border-black disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="" disabled>
                      {!rescheduleDateStr ? 'Select a date first' : (availableSlots.length === 0 ? 'No slots available' : 'Choose a valid time')}
                    </option>
                    {availableSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit" 
                  disabled={!newTime}
                  className="w-full bg-black text-white py-2 rounded-md font-medium hover:bg-gray-800 transition mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Confirm Reschedule
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