import React, { useState } from 'react';
import {
  Users,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { TaskWorkloadSummary } from '../../types';

interface Props {
  workload: TaskWorkloadSummary[];
  onSelectEmployeeTasks: (employeeId: string) => void;
}

export const WorkloadView: React.FC<Props> = ({ workload, onSelectEmployeeTasks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const departments = Array.from(
    new Set(workload.map(w => w.department).filter(Boolean))
  ) as string[];

  const filtered = workload.filter(item => {
    if (departmentFilter && item.department !== departmentFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = item.employeeName.toLowerCase().includes(term);
      const matchDept = item.department?.toLowerCase().includes(term);
      if (!matchName && !matchDept) return false;
    }
    return true;
  });

  // Flow pacing / balance categories:
  // 0 WIP: Flow Available
  // 1-3 WIP: Healthy Flow Pacing
  // 4+ WIP: Flow Bottleneck Risk (Prevent overloading)
  const getCapacityStatus = (wip: number, blocked: number) => {
    if (blocked > 0) {
      return {
        label: `${blocked} Blocked`,
        color: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
      };
    }
    if (wip >= 4) {
      return {
        label: 'High WIP (Bottleneck Risk)',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (wip === 0) {
      return {
        label: 'Capacity Available',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      };
    }
    return {
      label: 'Optimal Pacing',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    };
  };

  const totalOpenTasks = workload.reduce((sum, w) => sum + (w.totalTasks - w.completedTasks), 0);
  const totalWipTasks = workload.reduce((sum, w) => sum + w.wipTasks, 0);
  const totalBlocked = workload.reduce((sum, w) => sum + w.blockedTasks, 0);

  return (
    <div className="space-y-6">
      {/* Principle Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="text-indigo-400" size={18} />
              <span>Team Flow & Workload Distribution</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Work-In-Progress (WIP) tracking is designed for workflow pacing and bottleneck prevention,
              not surveillance. It protects team members from context switching and excessive active load.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-sm">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-300 block">Active WIP</span>
              <span className="text-lg font-bold text-white">{totalWipTasks}</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-300 block">Total Open</span>
              <span className="text-lg font-bold text-white">{totalOpenTasks}</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-300 block">Blocked</span>
              <span className="text-lg font-bold text-amber-400">{totalBlocked}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by team member or department..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {departments.length > 0 && (
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Workload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(item => {
          const status = getCapacityStatus(item.wipTasks, item.blockedTasks);
          const openTasks = Math.max(0, item.totalTasks - item.completedTasks);

          return (
            <div
              key={item.employeeId}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all space-y-4"
            >
              {/* Member Profile */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.employeeAvatar ? (
                    <img
                      src={item.employeeAvatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {item.employeeName ? item.employeeName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {item.employeeName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.department || 'General Team'}
                    </p>
                  </div>
                </div>

                {/* Capacity badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  <span>{status.label}</span>
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                    Active WIP
                  </span>
                  <span className="text-base font-bold text-indigo-700 mt-0.5 block">
                    {item.wipTasks}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                    Open Tasks
                  </span>
                  <span className="text-base font-bold text-slate-800 mt-0.5 block">
                    {openTasks}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                    Overdue
                  </span>
                  <span
                    className={`text-base font-bold mt-0.5 block ${
                      item.overdueTasks > 0 ? 'text-red-600' : 'text-slate-400'
                    }`}
                  >
                    {item.overdueTasks}
                  </span>
                </div>
              </div>

              {/* Hours Logged & Completed */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  <span>
                    Est: {item.estimatedHoursTotal}h / <strong>{item.actualHoursTotal}h logged</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 size={13} />
                  <span>{item.completedTasks} done</span>
                </div>
              </div>

              {/* View Tasks Link */}
              <button
                onClick={() => onSelectEmployeeTasks(item.employeeId)}
                className="w-full py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View Assigned Tasks</span>
                <ExternalLink size={12} />
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
            No team members found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};
