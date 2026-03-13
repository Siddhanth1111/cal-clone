import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Calendar as CalendarIcon, ArrowLeft, User, AlignLeft } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export default function PublicBooking() {
  const { username, eventSlug } = useParams();
  const navigate = useNavigate();
  
  const [eventType, setEventType] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<{start: Date, end: Date}[]>([]); // NEW STATE
  
  const [step, setStep] = useState<'calendar' | 'form' | 'success'>('calendar');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsRes = await axios.get(`${API_URL}/events`);
        const foundEvent = eventsRes.data.find((e: any) => e.urlSlug === eventSlug);
        setEventType(foundEvent);

        const availRes = await axios.get(`${API_URL}/availability/default-admin-id`);
        setAvailability(availRes.data);
      } catch (error) {
        console.error("Error fetching", error);
      }
    };
    fetchData();
  }, [eventSlug]);


  // NEW: Fetch busy times filtering by USER, not Event Type
  useEffect(() => {
    if (selectedDate && eventType) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // CHANGE: We now pass userId=${eventType.userId} instead of eventTypeId
      axios.get(`${API_URL}/bookings/busy?userId=${eventType.userId}&start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`)
        .then(res => {
          setBusySlots(res.data.map((b: any) => ({
            start: new Date(b.startTime),
            end: new Date(b.endTime)
          })));
        });
    }
  }, [selectedDate, eventType]);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const generateTimeSlots = () => {
    if (!selectedDate || !availability || !eventType) return [];
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayConfig = availability.days.find((d: any) => d.day === dayName);

    if (!dayConfig || !dayConfig.active) return [];

    const slots = [];
    const [startHour, startMin] = dayConfig.start.split(':').map(Number);
    const [endHour, endMin] = dayConfig.end.split(':').map(Number);

    let currentSlot = new Date(selectedDate);
    currentSlot.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, endMin, 0, 0);

    const durationInMs = eventType.duration * 60000;
    const now = new Date(); 

    while (currentSlot.getTime() + durationInMs <= endTime.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + durationInMs);
      
      // ALGORITHM: Does this slot overlap with ANY busy slot in the database?
      const isOverlapping = busySlots.some(busy => 
        (currentSlot < busy.end && slotEnd > busy.start)
      );

      if (currentSlot > now) {
        slots.push({
          timeStr: currentSlot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isAvailable: !isOverlapping // If overlapping, it's NOT available
        });
      }
      currentSlot = slotEnd;
    }
    return slots;
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!selectedDate || !selectedTime || !eventType) return;

    const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return;
    
    let [_, hoursStr, minutesStr, modifier] = timeMatch;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    
    const startDateTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + eventType.duration * 60000);

    try {
      const res = await axios.post(`${API_URL}/bookings`, {
        bookerName: formData.name, bookerEmail: formData.email, notes: formData.notes,
        startTime: startDateTime, endTime: endDateTime, eventTypeId: eventType.id, userId: eventType.userId
      });
      setConfirmedBooking(res.data);
      setStep('success');
    } catch (error) {
      alert("Something went wrong. It might have just been booked!");
    } finally {
      setLoading(false);
    }
  };

  if (!eventType || !availability) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (step === 'success' && confirmedBooking) {
    const bookingDate = new Date(confirmedBooking.startTime);
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-lg w-full border border-gray-200">
          <div className="text-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-black">Booking Confirmed!</h1>
          </div>
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4 mb-8">
            <h3 className="font-semibold text-black border-b border-gray-200 pb-2">Meeting Details</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-500 flex items-center gap-2"><User size={14}/> Host</span>
              <span className="col-span-2 font-medium text-black">@{username}</span>
              <span className="text-gray-500 flex items-center gap-2"><CalendarIcon size={14}/> When</span>
              <span className="col-span-2 font-medium text-black">
                {bookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-gray-500 flex items-center gap-2 mt-2"><User size={14}/> Booker</span>
              <span className="col-span-2 font-medium text-black mt-2">{confirmedBooking.bookerName} <br/><span className="text-gray-400 font-normal">{confirmedBooking.bookerEmail}</span></span>
              {confirmedBooking.notes && (
                <>
                  <span className="text-gray-500 flex items-center gap-2 mt-2"><AlignLeft size={14}/> Notes</span>
                  <span className="col-span-2 font-medium text-black mt-2 italic">"{confirmedBooking.notes}"</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {/* Dashboard Redirect Button */}
            <button onClick={() => navigate('/dashboard')} className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition">
              Go to Dashboard
            </button>
            <button onClick={() => window.location.reload()} className="w-full bg-white text-black border border-gray-300 py-3 rounded-md font-medium hover:bg-gray-50 transition">
              Book another slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4">
      <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-4xl flex flex-col md:flex-row overflow-hidden transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Left Sidebar */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200 w-full md:w-1/3 bg-white">
          {step === 'form' && (
             <button onClick={() => setStep('calendar')} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-black transition"><ArrowLeft size={16} /> Back</button>
          )}
          <p className="text-gray-500 font-medium mb-1">@{username}</p>
          <h1 className="text-2xl font-bold text-black mb-2 uppercase tracking-tight">{eventType.title}</h1>
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-3 text-gray-600 font-medium"><Clock size={18} className="text-gray-400" /> {eventType.duration} Min Meeting</div>
            {selectedDate && selectedTime && (
              <div className="flex items-center gap-3 text-gray-600 font-medium text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 mt-4">
                <CalendarIcon size={18} className="text-gray-400" />
                {selectedTime}, {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Content */}
        <div className="p-8 flex-1 bg-white">
          {step === 'calendar' && (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-black mb-6 flex items-center justify-between">{today.toLocaleString('default', { month: 'long' })} {today.getFullYear()}</h2>
                <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => <div key={d} className="text-[11px] font-bold text-gray-400 mb-2">{d}</div>)}
                  {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
                  {[...Array(daysInMonth)].map((_, i) => {
                    const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
                    const isPast = date < new Date(new Date().setHours(0,0,0,0));
                    const isSelected = selectedDate?.getDate() === i + 1;
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                    const isAvailableDay = availability?.days.find((d: any) => d.day === dayName)?.active;
                    const disabled = isPast || !isAvailableDay;

                    return (
                      <button key={i} disabled={disabled} onClick={() => setSelectedDate(date)}
                        className={`aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all ${disabled ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'} ${isSelected ? 'bg-black text-white hover:bg-black' : ''}`}>
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedDate && (
                <div className="w-full md:w-48 h-[400px] overflow-y-auto pr-2 custom-scrollbar border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-6 md:pt-0">
                  <h3 className="text-sm font-bold text-black mb-4">Available Times</h3>
                  <div className="space-y-2">
                    {generateTimeSlots().length > 0 ? (
                      generateTimeSlots().map((slot: any) => (
                        <div key={slot.timeStr} className="flex gap-2">
                          <button 
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedTime(slot.timeStr)}
                            // UPDATED STYLING: Strike-through if booked!
                            className={`flex-1 py-3 px-4 rounded-md border text-sm font-medium transition-all 
                              ${!slot.isAvailable ? 'bg-gray-50 border-gray-100 text-gray-400 line-through cursor-not-allowed' : 
                              selectedTime === slot.timeStr ? 'bg-black text-white border-black' : 'border-gray-200 text-black hover:border-black'}`}
                          >
                            {slot.timeStr}
                          </button>
                          {selectedTime === slot.timeStr && slot.isAvailable && (
                            <button onClick={() => setStep('form')} className="bg-black text-white px-4 rounded-md text-sm font-medium hover:bg-gray-800">
                              Next
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No times available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'form' && (
            <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-black mb-6">Enter Details</h2>
              <form onSubmit={handleBook} className="space-y-4">
                <input type="text" required placeholder="Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded-md p-3 text-black focus:ring-black focus:border-black" />
                <input type="email" required placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded-md p-3 text-black focus:ring-black focus:border-black" />
                <textarea rows={3} placeholder="Additional Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded-md p-3 text-black focus:ring-black focus:border-black" />
                <button type="submit" className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 mt-4">Confirm Booking</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}