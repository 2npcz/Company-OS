
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import HelpButton from '../onboarding/HelpButton';

interface Props {
  currentTime: Date;
  onBack: () => void;
}

export const AttendanceHeader: React.FC<Props> = ({ currentTime, onBack }) => {
  return (
    <div className="px-6 pt-10 pb-2 flex flex-col items-center relative">
      <button
        onClick={onBack}
        className="absolute left-6 top-8 w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 shadow-lg text-slate-400 dark:text-slate-200 rounded-xl active:scale-90 border border-slate-100 dark:border-slate-700"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="absolute right-6 top-8">
        <HelpButton helpPointId="attendance.clockin" size={20} />
      </div>
      <div className="text-center">
         <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
           {currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
         </p>
         <p className="text-4xl font-semibold text-slate-900 dark:text-white tabular-nums tracking-tighter">
           {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
         </p>
      </div>
    </div>
  );
};
