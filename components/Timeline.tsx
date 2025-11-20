import React, { useState } from 'react';
import { TripSummary } from '../types';
import { Plane, Hotel, Utensils, MapPin, Calendar, X, Download, FileJson, CalendarRange, Check } from 'lucide-react';

interface TimelineProps {
  summary: TripSummary;
  isOpen: boolean;
  onClose: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ summary, isOpen, onClose }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success'>('idle');

  const getIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane size={16} className="text-blue-500" />;
      case 'hotel': return <Hotel size={16} className="text-indigo-500" />;
      case 'food': return <Utensils size={16} className="text-orange-500" />;
      case 'activity': return <MapPin size={16} className="text-travel-600" />;
      default: return <Calendar size={16} className="text-slate-400" />;
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      // Handle YYYY-MM-DD from schema
      const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone shifts
      if (isNaN(date.getTime())) return dateStr;
      
      return new Intl.DateTimeFormat('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setDownloadStatus('success');
    setTimeout(() => setDownloadStatus('idle'), 2000);
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(summary, null, 2);
    downloadFile(jsonContent, `trip-${summary.destination.replace(/\s+/g, '-')}.json`, 'application/json');
  };

  const handleExportICS = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WanderLust AI//Trip Itinerary//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n');

    summary.events.forEach(event => {
      try {
        // Clean date/time for ICS format YYYYMMDDTHHMMSS
        const dateStr = event.date.replace(/-/g, '');
        const timeStr = event.time.replace(/:/g, '');
        const startDateTime = `${dateStr}T${timeStr}00`;
        
        // Assume 1 hour duration for events
        // Simple calculation for end time (just parsing hour and adding 1)
        let endHour = parseInt(event.time.split(':')[0]) + 1;
        let endHourStr = endHour < 10 ? `0${endHour}` : `${endHour}`;
        // Handle overflow roughly (24 -> 00 not handled perfectly but ok for simple export)
        if (endHour >= 24) { endHourStr = "23"; } 
        
        const endDateTime = `${dateStr}T${endHourStr}${event.time.split(':')[1]}00`;

        icsContent += '\r\n' + [
          'BEGIN:VEVENT',
          `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@wanderlust.ai`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART:${startDateTime}`,
          `DTEND:${endDateTime}`,
          `SUMMARY:${event.activity}`,
          `DESCRIPTION:${event.type.toUpperCase()} - ${event.activity}`,
          event.location ? `LOCATION:${event.location}` : '',
          'END:VEVENT'
        ].filter(Boolean).join('\r\n');
      } catch (e) {
        console.warn("Skipping event for ICS due to parse error", event);
      }
    });

    icsContent += '\r\nEND:VCALENDAR';
    downloadFile(icsContent, `trip-${summary.destination.replace(/\s+/g, '-')}.ics`, 'text/calendar');
  };

  return (
    <div 
      className={`
        fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-30
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        border-l border-slate-200 flex flex-col
      `}
    >
      <div className="p-6 bg-travel-50 border-b border-travel-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-travel-900">{summary.title}</h2>
            <p className="text-sm text-travel-600 flex items-center gap-1 mt-1">
              <MapPin size={14} />
              {summary.destination}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono">{summary.dates}</p>
          </div>
          <div className="flex gap-1">
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors text-travel-700"
                title="Export Itinerary"
              >
                {downloadStatus === 'success' ? <Check size={20} className="text-green-600" /> : <Download size={20} />}
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
                  <button 
                    onClick={handleExportJSON}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm flex items-center gap-2 text-slate-700"
                  >
                    <FileJson size={16} /> Export as JSON
                  </button>
                  <button 
                    onClick={handleExportICS}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm flex items-center gap-2 text-slate-700 border-t border-slate-100"
                  >
                    <CalendarRange size={16} /> Export to Calendar
                  </button>
                </div>
              )}
            </div>

            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Trip Timeline</h3>
        
        <div className="space-y-6">
          {summary.events.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-10">
              No specific events extracted. Ask the chat to find details!
            </p>
          ) : (
            summary.events.map((event, idx) => (
              <div key={idx} className="relative pl-8 border-l-2 border-travel-100 last:border-l-0 pb-2">
                {/* Dot */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-travel-200 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 rounded-full bg-travel-400"></div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-travel-700 bg-travel-100 px-2 py-0.5 rounded">
                       {formatDisplayDate(event.date)}
                     </span>
                     <span className="text-xs font-mono text-slate-400">{event.time}</span>
                  </div>
                  
                  <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm mt-1 hover:border-travel-300 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-slate-50 group-hover:bg-travel-50 rounded-md transition-colors">
                        {getIcon(event.type)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm leading-tight">{event.activity}</p>
                        {event.location && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin size={10} />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Overlay to close menu when clicking outside */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
};