
import React from 'react';
import { Network, Briefcase, Plus, Edit3, Trash2 } from 'lucide-react';

interface Props {
  departments: string[];
  designations: string[];
  onAdd: (type: 'DEPT' | 'DESIG') => void;
  onEdit: (type: 'DEPT' | 'DESIG', index: number) => void;
  onDelete: (type: 'DEPT' | 'DESIG', index: number) => void;
}

export const OrgStructure: React.FC<Props> = ({ departments, designations, onAdd, onEdit, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3"><Network size={20} /><h3 className="text-xs md:text-sm font-semibold uppercase tracking-wider">Departments</h3></div>
          <button onClick={() => onAdd('DEPT')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
        </div>
        <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
          {departments.map((dept, i) => (
            <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 transition-all">
              <span className="font-bold text-slate-800 dark:text-slate-100 break-words max-w-[70%]">{dept}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                <button onClick={() => onEdit('DEPT', i)} title="Edit Department" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer"><Edit3 size={16} /></button>
                <button onClick={() => onDelete('DEPT', i)} title="Delete Department" className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3"><Briefcase size={20} /><h3 className="text-xs md:text-sm font-semibold uppercase tracking-wider">Designations</h3></div>
          <button onClick={() => onAdd('DESIG')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
        </div>
        <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
          {designations.map((des, i) => (
            <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 transition-all">
              <span className="font-bold text-slate-800 dark:text-slate-100 break-words max-w-[70%]">{des}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                <button onClick={() => onEdit('DESIG', i)} title="Edit Designation" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer"><Edit3 size={16} /></button>
                <button onClick={() => onDelete('DESIG', i)} title="Delete Designation" className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
