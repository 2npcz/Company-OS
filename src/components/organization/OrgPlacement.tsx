
import React from 'react';
import { MapPin, Plus, Building2, Trash2 } from 'lucide-react';
import { OfficeLocation } from '../../types';

interface Props {
  locations: OfficeLocation[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const OrgPlacement: React.FC<Props> = ({ locations, onAdd, onEdit, onDelete }) => {
  return (
    <div className="space-y-6 animate-in zoom-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 bg-primary text-white flex justify-between items-center">
           <div className="flex items-center gap-3"><MapPin size={20} /><h3 className="text-sm font-semibold uppercase tracking-wider">Office Geofences</h3></div>
           <button onClick={onAdd} className="p-2 bg-white/10 rounded-lg hover:bg-white/20"><Plus size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {locations.map((loc, i) => (
             <div key={i} className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-[2rem] relative group hover:bg-white dark:hover:bg-slate-800 transition-all">
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-slate-900 dark:text-white">{loc.name}</h4>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(i)} title="Edit Location" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer"><Building2 size={14}/></button>
                      <button onClick={() => onDelete(i)} title="Delete Location" className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"><Trash2 size={14}/></button>
                   </div>
                </div>
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                <p className="text-[10px] font-bold text-primary dark:text-cyan-400 mt-1 uppercase tracking-wider">{loc.radius}m Radius</p>
             </div>
           ))}
           {locations.length === 0 && <p className="col-span-full text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-10">No dynamic locations. Using system defaults.</p>}
        </div>
      </div>
    </div>
  );
};
