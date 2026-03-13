import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Link as LinkIcon, Settings, Copy, Plus, Save } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export default function Availability() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<any>({ name: 'Working hours', timeZone: 'Asia/Kolkata', days: [] });

  useEffect(() => {
    // Fetching for the default admin user
    axios.get(`${API_URL}/availability/0d28a3c2-0715-4116-ab27-12398df3c2aa`).then(res => {
      setSchedule(res.data);
    });
  }, []);

  const handleToggleDay = (index: number) => {
    const newDays = [...schedule.days];
    newDays[index].active = !newDays[index].active;
    setSchedule({ ...schedule, days: newDays });
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const newDays = [...schedule.days];
    newDays[index][field] = value;
    setSchedule({ ...schedule, days: newDays });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/availability`, {
        userId: "default-admin-id",
        name: schedule.name,
        days: schedule.days,
        timeZone: schedule.timeZone
      });
      alert("Availability saved successfully!");
    } catch (error) {
      alert("Failed to save.");
    } finally {
      setLoading(false);
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
          <NavItem icon={<LinkIcon size={18} />} label="Event Types" onClick={() => navigate('/dashboard')} />
          <NavItem icon={<Calendar size={18} />} label="Bookings" />
          <NavItem icon={<Clock size={18} />} label="Availability" active />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 max-w-5xl">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black">Availability</h1>
            <p className="text-gray-500 text-sm mt-1">Configure times when you are available for bookings.</p>
          </div>
        </header>

        {/* The Editor View (Matches your 2nd screenshot) */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Top Bar */}
          <div className="border-b border-gray-200 p-5 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="font-semibold text-black flex items-center gap-2">
                {schedule.name}
              </h2>
            </div>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
            >
              {loading ? "Saving..." : <><Save size={16}/> Save</>}
            </button>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Days List */}
            <div className="flex-1 p-6 space-y-6">
              {schedule.days?.map((day: any, index: number) => (
                <div key={day.day} className="flex items-center gap-4">
                  
                  {/* Toggle & Day Label */}
                  <div className="w-32 flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleDay(index)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${day.active ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${day.active ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${day.active ? 'text-black' : 'text-gray-400'}`}>
                      {day.day}
                    </span>
                  </div>

                  {/* Time Inputs */}
                  {day.active ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        value={day.start}
                        onChange={(e) => handleTimeChange(index, 'start', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-black focus:border-black"
                      />
                      <span className="text-gray-400">-</span>
                      <input 
                        type="time" 
                        value={day.end}
                        onChange={(e) => handleTimeChange(index, 'end', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-black focus:border-black"
                      />
                      <button className="p-2 text-gray-400 hover:text-black transition ml-2"><Plus size={16} /></button>
                      <button className="p-2 text-gray-400 hover:text-black transition"><Copy size={16} /></button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Unavailable</div>
                  )}
                </div>
              ))}
            </div>

            {/* Right Sidebar (Timezone) */}
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-200 p-6 bg-gray-50/50">
              <label className="block text-sm font-semibold text-black mb-2">Timezone</label>
              <select 
                value={schedule.timeZone}
                onChange={(e) => setSchedule({...schedule, timeZone: e.target.value})}
                className="w-full border border-gray-300 rounded-md p-2 text-sm text-black focus:ring-black focus:border-black"
              >
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>
        </div>
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