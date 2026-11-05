
import React from 'react';
import { Calendar, Plus, Clock, Trash2 } from 'lucide-react';
import { Holiday } from '../../types';

interface Props {
  holidays: Holiday[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const OrgHolidays: React.FC<Props> = ({ holidays, onAdd, onEdit, onDelete }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in zoom-in duration-500">
       <div className="p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3"><Calendar size={20} /><h3 className="text-sm font-semibold uppercase tracking-wider">Holiday Calendar</h3></div>
          <button onClick={onAdd} className="p-2 bg-white/10 rounded-lg hover:bg-white/20"><Plus size={18} /></button>
       </div>
       <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holidays.sort((a,b) => a.date.localeCompare(b.date)).map((h, i) => (
             <div key={h.id || i} className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex justify-between items-start group hover:bg-white dark:hover:bg-slate-800 transition-all">
                <div>
                   <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-widest mb-1">{h.date}</p>
                   <h4 className="font-bold text-slate-900 dark:text-white">{h.name}</h4>
                   <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md mt-2 inline-block">{h.type}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => onEdit(i)} title="Edit Holiday" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer"><Clock size={14}/></button>
                   <button onClick={() => onDelete(i)} title="Delete Holiday" className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"><Trash2 size={14}/></button>
                </div>
             </div>
          ))}
          {holidays.length === 0 && <p className="col-span-full text-center text-slate-400 py-10 font-bold uppercase text-xs">No holidays configured.</p>}
       </div>
    </div>
  );
};
