import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Calendar as CalendarIcon, ArrowLeft, User, AlignLeft, Globe } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://13.61.190.254:8080/api';

export default function PublicBooking() {
  const { username, eventSlug } = useParams();
  const navigate = useNavigate();

  const [eventType, setEventType] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<{ start: Date, end: Date }[]>([]);

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

        const availRes = await axios.get(`${API_URL}/availability/0d28a3c2-0715-4116-ab27-12398df3c2aa`);
        const targetSchedule = availRes.data.find((a: any) => a.id === foundEvent?.availabilityId)
          || availRes.data.find((a: any) => a.isDefault)
          || availRes.data[0];

        setAvailability(targetSchedule);
      } catch (error) {
        console.error("Error fetching", error);
      }
    };
    fetchData();
  }, [eventSlug]);

  useEffect(() => {
    if (selectedDate && eventType) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

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
    const bufferInMs = 1 * 60000;
    const now = new Date();

    while (currentSlot.getTime() + durationInMs <= endTime.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + durationInMs);
      const isOverlapping = busySlots.some((busy: { start: Date, end: Date }) =>
        (currentSlot < busy.end && slotEnd > busy.start)
      );
      if (currentSlot > now) {
        slots.push({
          timeStr: currentSlot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isAvailable: !isOverlapping
        });
      }
      currentSlot = new Date(slotEnd.getTime() + bufferInMs);
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

  if (!eventType || !availability) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#101010' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6d28d9', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (step === 'success' && confirmedBooking) {
    const bookingDate = new Date(confirmedBooking.startTime);
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#101010' }}>
        <div
          className="w-full max-w-md rounded-2xl border overflow-hidden"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          {/* Green header */}
          <div className="flex flex-col items-center py-8 px-6" style={{ borderBottom: '1px solid #2a2a2a' }}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}
            >
              <CheckCircle2 className="w-6 h-6" style={{ color: '#34d399' }} />
            </div>
            <h1 className="text-lg font-semibold text-center" style={{ color: '#f3f4f6' }}>This meeting is scheduled</h1>
            <p className="text-xs mt-1 text-center" style={{ color: '#6b7280' }}>
              We sent an email with a calendar invitation with the details to everyone.
            </p>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
            <DetailRow label="What" icon={<CalendarIcon size={13} />}>
              <span style={{ color: '#f3f4f6' }}>{eventType.title} between @{username} and {confirmedBooking.bookerName}</span>
            </DetailRow>
            <DetailRow label="When" icon={<Clock size={13} />}>
              <span style={{ color: '#f3f4f6' }}>
                {bookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                <br />
                {bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} –{' '}
                {new Date(bookingDate.getTime() + eventType.duration * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </DetailRow>
            <DetailRow label="Who" icon={<User size={13} />}>
              <div className="space-y-1.5">
                <div>
                  <span style={{ color: '#f3f4f6' }}>@{username}</span>
                  <span
                    className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: '#1e1b4b', color: '#a78bfa', border: '1px solid #3730a3' }}
                  >
                    Host
                  </span>
                </div>
                <div>
                  <span style={{ color: '#f3f4f6' }}>{confirmedBooking.bookerName}</span>
                  <br />
                  <span className="text-xs" style={{ color: '#6b7280' }}>{confirmedBooking.bookerEmail}</span>
                </div>
              </div>
            </DetailRow>
            {confirmedBooking.notes && (
              <DetailRow label="Notes" icon={<AlignLeft size={13} />}>
                <span className="italic text-sm" style={{ color: '#9ca3af' }}>"{confirmedBooking.notes}"</span>
              </DetailRow>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 flex flex-col gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 rounded-md text-sm font-medium transition-all"
              style={{ backgroundColor: '#6d28d9', color: '#fff' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5b21b6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 rounded-md text-sm font-medium border transition-all"
              style={{ backgroundColor: 'transparent', borderColor: '#2a2a2a', color: '#9ca3af' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3f3f46'; e.currentTarget.style.color = '#f3f4f6'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#9ca3af'; }}
            >
              Book another slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#101010' }}
    >
      <div
        className={`w-full max-w-4xl rounded-2xl border flex flex-col md:flex-row overflow-hidden transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      >
        {/* Left sidebar */}
        <div
          className="w-full md:w-72 flex-shrink-0 p-6 border-b md:border-b-0 md:border-r"
          style={{ backgroundColor: '#141414', borderColor: '#2a2a2a' }}
        >
          {step === 'form' && (
            <button
              onClick={() => setStep('calendar')}
              className="flex items-center gap-1.5 text-xs mb-5 transition"
              style={{ color: '#6b7280' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {/* Avatar placeholder */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mb-3 text-sm font-bold"
            style={{ backgroundColor: '#6d28d9', color: '#fff' }}
          >
            {username?.[0]?.toUpperCase() || 'U'}
          </div>

          <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{username}</p>
          <h1 className="text-xl font-bold mb-4" style={{ color: '#f3f4f6' }}>{eventType.title}</h1>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#9ca3af' }}>
              <Clock size={14} style={{ color: '#6b7280' }} />
              {eventType.duration} min
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#9ca3af' }}>
              <Globe size={14} style={{ color: '#6b7280' }} />
              {availability.timeZone}
            </div>
            {selectedDate && selectedTime && (
              <div
                className="flex items-start gap-2 text-xs mt-3 px-3 py-2.5 rounded-lg"
                style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#9ca3af' }}
              >
                <CalendarIcon size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#6d28d9' }} />
                <span>
                  {selectedTime},{' '}
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 p-6 min-w-0">
          {step === 'calendar' && (
            <div className="flex flex-col md:flex-row gap-6 h-full">
              {/* Calendar */}
              <div className="flex-1">
                <h2 className="text-sm font-semibold mb-5" style={{ color: '#f3f4f6' }}>
                  {today.toLocaleString('default', { month: 'long' })} {today.getFullYear()}
                  <span className="ml-2 text-xs font-normal" style={{ color: '#6b7280' }}>
                    — Select a Date
                  </span>
                </h2>

                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                    <div key={d} className="text-[10px] font-semibold pb-3" style={{ color: '#4b5563' }}>{d}</div>
                  ))}
                  {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
                  {[...Array(daysInMonth)].map((_, i) => {
                    const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const isSelected = selectedDate?.getDate() === i + 1;
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                    const isAvailableDay = availability?.days.find((d: any) => d.day === dayName)?.active;
                    const isToday = date.toDateString() === today.toDateString();
                    const disabled = isPast || !isAvailableDay;

                    return (
                      <button
                        key={i}
                        disabled={disabled}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className="aspect-square flex items-center justify-center rounded-full text-xs font-medium transition-all mx-auto w-8 h-8"
                        style={{
                          backgroundColor: isSelected ? '#6d28d9' : 'transparent',
                          color: isSelected ? '#fff' : disabled ? '#2a2a2a' : isToday ? '#a78bfa' : '#d1d5db',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          outline: isToday && !isSelected ? '1px solid #3730a3' : 'none',
                        }}
                        onMouseEnter={e => { if (!disabled && !isSelected) e.currentTarget.style.backgroundColor = '#2a2a2a'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div
                  className="w-full md:w-44 border-t md:border-t-0 md:border-l pt-5 md:pt-0 md:pl-5 flex flex-col"
                  style={{ borderColor: '#2a2a2a' }}
                >
                  <h3 className="text-xs font-semibold mb-3" style={{ color: '#9ca3af' }}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: '380px' }}>
                    {timeSlots.length > 0 ? (
                      timeSlots.map((slot: any) => (
                        <div key={slot.timeStr} className="flex gap-1.5">
                          <button
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedTime(slot.timeStr)}
                            className="flex-1 py-2.5 rounded-md border text-xs font-medium transition-all"
                            style={{
                              backgroundColor: selectedTime === slot.timeStr ? '#6d28d9' : 'transparent',
                              borderColor: selectedTime === slot.timeStr ? '#6d28d9' : '#2a2a2a',
                              color: !slot.isAvailable
                                ? '#2a2a2a'
                                : selectedTime === slot.timeStr
                                ? '#fff'
                                : '#d1d5db',
                              textDecoration: !slot.isAvailable ? 'line-through' : 'none',
                              cursor: !slot.isAvailable ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={e => { if (slot.isAvailable && selectedTime !== slot.timeStr) { e.currentTarget.style.borderColor = '#6d28d9'; e.currentTarget.style.color = '#f3f4f6'; } }}
                            onMouseLeave={e => { if (slot.isAvailable && selectedTime !== slot.timeStr) { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#d1d5db'; } }}
                          >
                            {slot.timeStr}
                          </button>
                          {selectedTime === slot.timeStr && slot.isAvailable && (
                            <button
                              onClick={() => setStep('form')}
                              className="px-2.5 rounded-md text-xs font-medium transition-all"
                              style={{ backgroundColor: '#6d28d9', color: '#fff' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5b21b6')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
                            >
                              →
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs" style={{ color: '#4b5563' }}>No times available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'form' && (
            <div className="max-w-md">
              <h2 className="text-sm font-semibold mb-5" style={{ color: '#f3f4f6' }}>Enter Details</h2>
              <form onSubmit={handleBook} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>Your name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm border outline-none transition"
                    style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>Email address *</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm border outline-none transition"
                    style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#9ca3af' }}>Additional notes</label>
                  <textarea
                    rows={3}
                    placeholder="Please share anything that will help prepare for our meeting."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm border outline-none transition resize-none"
                    style={{ backgroundColor: '#111111', borderColor: '#2a2a2a', color: '#f3f4f6' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#6d28d9')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                  />
                </div>

                {/* Add guests hint */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs transition"
                  style={{ color: '#6b7280' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                >
                  <User size={12} /> + Add guests
                </button>

                <p className="text-xs pt-1" style={{ color: '#4b5563' }}>
                  By proceeding, you agree to our{' '}
                  <span style={{ color: '#6b7280', textDecoration: 'underline', cursor: 'pointer' }}>Terms</span>{' '}
                  and{' '}
                  <span style={{ color: '#6b7280', textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('calendar')}
                    className="px-4 py-2 rounded-md text-sm font-medium border transition-all"
                    style={{ backgroundColor: 'transparent', borderColor: '#2a2a2a', color: '#9ca3af' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3f3f46'; e.currentTarget.style.color = '#f3f4f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#9ca3af'; }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                    style={{ backgroundColor: '#6d28d9', color: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5b21b6')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6d28d9')}
                  >
                    {loading ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Cal.com watermark */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <p className="text-xs" style={{ color: '#2a2a2a' }}>Cal.clone</p>
      </div>
    </div>
  );
}

function DetailRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-sm">
      <div className="w-16 flex-shrink-0 flex items-start gap-1.5 pt-0.5" style={{ color: '#6b7280' }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex-1 text-sm" style={{ color: '#9ca3af' }}>{children}</div>
    </div>
  );
}