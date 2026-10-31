import React, { useState } from 'react';
import { X, FolderPlus, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { Project, ProjectPriority, ProjectStatus } from '../../types';
import { workService } from '../../services/work.service';

interface Props {
  mode: 'create' | 'edit';
  project?: Project | null;
  employees: { id: string; name: string; avatar?: string }[];
  onClose: () => void;
  onSaved: () => void;
}

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PROJECT_PRIORITIES: { value: ProjectPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export const ProjectModal: React.FC<Props> = ({ mode, project, employees, onClose, onSaved }) => {
  const [name, setName] = useState(project?.name || '');
  const [code, setCode] = useState(project?.code || '');
  const [description, setDescription] = useState(project?.description || '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status || 'ACTIVE');
  const [priority, setPriority] = useState<ProjectPriority>(project?.priority || 'MEDIUM');
  const [ownerId, setOwnerId] = useState(project?.ownerId || '');
  const [startDate, setStartDate] = useState(project?.startDate || '');
  const [targetDate, setTargetDate] = useState(project?.targetDate || '');
  const [budget, setBudget] = useState(project?.budget ? String(project.budget) : '0');
  const [tagsInput, setTagsInput] = useState((project?.tags || []).join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      if (mode === 'create') {
        await workService.createProject({
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          status,
          priority,
          ownerId: ownerId || undefined,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
          budget: Number(budget) || 0,
          tags,
        });
      } else if (project?.id) {
        await workService.updateProject(project.id, {
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          status,
          priority,
          ownerId: ownerId || undefined,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
          budget: Number(budget) || 0,
          tags,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              {mode === 'create' ? <FolderPlus size={20} /> : <Edit3 size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {mode === 'create' ? 'Create New Project' : 'Edit Project'}
              </h2>
              <p className="text-xs text-slate-500">
                EcoGlobal Trading BD Work Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Export Shipment Automation"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Project Code
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. EXP-2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white uppercase transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Outline project objectives, deliverables, and scope..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                {PROJECT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as ProjectPriority)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                {PROJECT_PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Project Lead / Owner
              </label>
              <select
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Target Completion
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Budget (BDT)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. Logistics, Customs, High Impact"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              <span>{mode === 'create' ? 'Create Project' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
