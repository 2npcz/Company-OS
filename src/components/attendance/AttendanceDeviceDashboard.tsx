import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Fingerprint,
  ScanFace,
  CreditCard,
  Key,
  Shield,
  Loader2,
  ExternalLink,
  Sliders,
  Send,
  Zap,
} from 'lucide-react';
import {
  AttendanceDevice,
  DeviceUserMapping,
  AttendanceRawEvent,
  AttendanceSyncLog,
  Employee,
  BiometricVerificationMethod,
  AttendanceEventType,
} from '../../types';
import { deviceService } from '../../services/device.service';
import { useToast } from '../../context/ToastContext';

type SubTab = 'DEVICES' | 'MAPPINGS' | 'RAW_EVENTS' | 'SYNC_LOGS';

interface AttendanceDeviceDashboardProps {
  employees: Employee[];
  canWrite: boolean;
  onRefreshParentAttendance?: () => void;
}

export const AttendanceDeviceDashboard: React.FC<AttendanceDeviceDashboardProps> = ({
  employees,
  canWrite,
  onRefreshParentAttendance,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SubTab>('DEVICES');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Core Data
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [mappings, setMappings] = useState<DeviceUserMapping[]>([]);
  const [rawEvents, setRawEvents] = useState<AttendanceRawEvent[]>([]);
  const [syncLogs, setSyncLogs] = useState<AttendanceSyncLog[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeviceId, setFilterDeviceId] = useState<string>('ALL');

  // Modals
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AttendanceDevice | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    deviceType: 'ZKTECO_MB460',
    model: 'MB460',
    serialNumber: '',
    locationName: 'Head Office',
    ipAddress: '192.168.1.201',
    port: 4370,
    commKey: '0',
    timezone: 'UTC',
  });

  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    deviceId: '',
    deviceUserId: '',
    employeeId: '',
    cardNumber: '',
    privilege: 'USER' as 'USER' | 'ADMIN',
  });

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulateForm, setSimulateForm] = useState({
    deviceId: '',
    deviceUserId: '',
    verificationMethod: 'FACE' as BiometricVerificationMethod,
    eventType: 'CHECK_IN' as AttendanceEventType,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [devs, maps, events, logs] = await Promise.all([
        deviceService.getDevices(),
        deviceService.getMappings(),
        deviceService.getRawEvents({ limit: 150 }),
        deviceService.getSyncLogs(),
      ]);
      setDevices(devs);
      setMappings(maps);
      setRawEvents(events);
      setSyncLogs(logs);
    } catch (err: any) {
      console.error('Failed to load attendance devices data:', err);
      showToast('Could not load device data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Handlers: Devices ---
  const handleOpenDeviceModal = (device?: AttendanceDevice) => {
    if (device) {
      setEditingDevice(device);
      setDeviceForm({
        name: device.name,
        deviceType: device.deviceType,
        model: device.model,
        serialNumber: device.serialNumber || '',
        locationName: device.locationName,
        ipAddress: device.ipAddress,
        port: device.port,
        commKey: device.commKey || '0',
        timezone: device.timezone || 'UTC',
      });
    } else {
      setEditingDevice(null);
      setDeviceForm({
        name: `MB460 Terminal ${devices.length + 1}`,
        deviceType: 'ZKTECO_MB460',
        model: 'MB460',
        serialNumber: '',
        locationName: 'Head Office',
        ipAddress: '192.168.1.201',
        port: 4370,
        commKey: '0',
        timezone: 'UTC',
      });
    }
    setShowDeviceModal(true);
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setIsProcessing(true);
    try {
      if (editingDevice) {
        await deviceService.updateDevice(editingDevice.id, deviceForm);
        showToast('Device configuration updated', 'success');
      } else {
        await deviceService.createDevice(deviceForm);
        showToast('Attendance device registered', 'success');
      }
      setShowDeviceModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save device', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDevice = async (device: AttendanceDevice) => {
    if (!canWrite || !confirm(`Remove attendance device "${device.name}"?`)) return;
    try {
      await deviceService.deleteDevice(device.id);
      showToast('Device removed', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete device', 'error');
    }
  };

  const handleTestHeartbeat = async (device: AttendanceDevice) => {
    try {
      await deviceService.recordHeartbeat(device.id, 'ONLINE');
      showToast(`Heartbeat confirmed for ${device.name}`, 'success');
      await loadData();
    } catch (err: any) {
      showToast('Failed to record heartbeat', 'error');
    }
  };

  // --- Handlers: Mappings ---
  const handleOpenMappingModal = () => {
    setMappingForm({
      deviceId: devices[0]?.id || '',
      deviceUserId: '',
      employeeId: employees[0]?.id || '',
      cardNumber: '',
      privilege: 'USER',
    });
    setShowMappingModal(true);
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!mappingForm.deviceId || !mappingForm.deviceUserId.trim() || !mappingForm.employeeId) {
      showToast('Device, Terminal User ID and Employee are required', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      await deviceService.createMapping(mappingForm);
      showToast('Biometric User ID mapped to Employee Profile', 'success');
      setShowMappingModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create mapping', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMapping = async (mapping: DeviceUserMapping) => {
    if (!canWrite || !confirm('Delete biometric mapping?')) return;
    try {
      await deviceService.deleteMapping(mapping.id);
      showToast('Mapping deleted', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete mapping', 'error');
    }
  };

  // --- Handlers: Process & Calculation Engine ---
  const handleRunProcessing = async () => {
    setIsProcessing(true);
    try {
      const res = await deviceService.processRawEvents();
      if (res.processedCount > 0) {
        showToast(
          `Processed ${res.processedCount} raw events (${res.sessionsCreated} attendance session rows calculated)`,
          'success'
        );
      } else {
        showToast('All raw events are already calculated and up to date', 'info');
      }
      await loadData();
      if (onRefreshParentAttendance) {
        onRefreshParentAttendance();
      }
    } catch (err: any) {
      showToast(err.message || 'Error running calculation engine', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers: Simulate Punch ---
  const handleSimulatePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setIsProcessing(true);
    try {
      const dev = devices.find((d) => d.id === simulateForm.deviceId) || devices[0];
      await deviceService.ingestRawEvents([
        {
          deviceId: dev?.id,
          deviceUserId: simulateForm.deviceUserId,
          eventTimestamp: new Date().toISOString(),
          eventType: simulateForm.eventType,
          verificationMethod: simulateForm.verificationMethod,
          source: 'DEVICE',
        },
      ]);
      showToast('Simulated biometric punch ingested', 'success');
      setShowSimulateModal(false);
      // Auto-trigger calculation
      await deviceService.processRawEvents();
      await loadData();
      if (onRefreshParentAttendance) onRefreshParentAttendance();
    } catch (err: any) {
      showToast(err.message || 'Failed to ingest simulated punch', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Statistics
  const onlineCount = devices.filter((d) => d.connectionStatus === 'ONLINE').length;
  const offlineCount = devices.filter((d) => d.connectionStatus === 'OFFLINE').length;
  const pendingEventsCount = rawEvents.filter((e) => !e.processed).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Biometric Hardware Network
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              ZKTeco Attendance Terminals
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Real-time LAN terminal synchronization, employee PIN enrollments, raw biometric audit events, and daily attendance calculations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setSimulateForm({
                  deviceId: devices[0]?.id || '',
                  deviceUserId: mappings[0]?.deviceUserId || '1',
                  verificationMethod: 'FACE',
                  eventType: 'CHECK_IN',
                });
                setShowSimulateModal(true);
              }}
              disabled={!canWrite || devices.length === 0}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
              title="Test punch injection for diagnostic testing"
            >
              <Zap size={14} className="text-amber-500" /> Simulate Punch
            </button>

            <button
              onClick={handleRunProcessing}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Calculate Sessions
            </button>

            <button
              onClick={() => handleOpenDeviceModal()}
              disabled={!canWrite}
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus size={16} /> Add Terminal
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Hardware Terminals</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <Cpu size={18} className="text-primary dark:text-cyan-400" /> {devices.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Configured on Network</div>
          </div>

          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Terminal Status</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <Wifi size={18} className="text-emerald-500" /> {onlineCount}{' '}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/ {offlineCount} offline</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Active Connectivity</div>
          </div>

          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Biometric Mappings</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <Fingerprint size={18} className="text-sky-500" /> {mappings.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">PIN to Staff Linked</div>
          </div>

          <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Raw Ingested Punches</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <Activity size={18} className="text-amber-500" /> {rawEvents.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {pendingEventsCount > 0 ? `${pendingEventsCount} pending calculation` : 'All sessions synced'}
            </div>
          </div>
        </div>

        {/* Sub-tabs selector */}
        <div className="mt-6 flex flex-wrap gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-fit">
          {[
            { id: 'DEVICES', label: 'Hardware Terminals', icon: Cpu, count: devices.length },
            { id: 'MAPPINGS', label: 'Employee PIN Mappings', icon: Fingerprint, count: mappings.length },
            { id: 'RAW_EVENTS', label: 'Raw Event Log', icon: Activity, count: rawEvents.length },
            { id: 'SYNC_LOGS', label: 'Sync & Connector Logs', icon: Clock, count: syncLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCur = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SubTab)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
                  isCur 
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon size={14} className={isCur ? 'text-primary dark:text-cyan-400' : ''} />
                {tab.label}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isCur ? 'bg-primary/10 text-primary dark:bg-cyan-950 dark:text-cyan-300' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading Biometric Hardware Data...</p>
        </div>
      ) : (
        <div>
          {/* ========================================================================= */}
          {/* SUB-TAB 1: DEVICES */}
          {/* ========================================================================= */}
          {activeTab === 'DEVICES' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search terminal name, IP or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-cyan-500/20"
                  />
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Default Port: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">4370</span> &bull; Protocol:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">TCP / ZK Protocol</span>
                </div>
              </div>

              {devices.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm">
                  <Cpu size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">No attendance terminals registered</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Add your ZKTeco MB460 or network biometric terminal to begin streaming raw punches into Company OS.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenDeviceModal()}
                    disabled={!canWrite}
                    className="px-5 py-2.5 bg-primary dark:bg-cyan-600 text-white text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-primary/90 dark:hover:bg-cyan-500 transition-all inline-flex items-center gap-2"
                  >
                    <Plus size={16} /> Register First Terminal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices
                    .filter((d) => {
                      const q = searchQuery.toLowerCase();
                      return (
                        d.name.toLowerCase().includes(q) ||
                        d.ipAddress.toLowerCase().includes(q) ||
                        d.locationName.toLowerCase().includes(q)
                      );
                    })
                    .map((device) => {
                      const isOnline = device.connectionStatus === 'ONLINE';
                      return (
                        <div
                          key={device.id}
                          className="p-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase">
                                  {device.locationName}
                                </span>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1">{device.name}</h3>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase border border-transparent ${
                                  isOnline
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 dark:border-emerald-900/50'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 dark:border-rose-900/50'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                                  }`}
                                />
                                {device.connectionStatus}
                              </span>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl space-y-1 font-mono text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between">
                                <span className="text-slate-400 dark:text-slate-500">IP:</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{device.ipAddress}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 dark:text-slate-500">Port:</span>
                                <span>{device.port}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 dark:text-slate-500">Model:</span>
                                <span>{device.model} ({device.deviceType})</span>
                              </div>
                              {device.serialNumber && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400 dark:text-slate-500">S/N:</span>
                                  <span>{device.serialNumber}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-400 dark:text-slate-500 space-y-0.5">
                              <div>
                                Last Heartbeat:{' '}
                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                  {device.lastHeartbeatAt ? new Date(device.lastHeartbeatAt).toLocaleTimeString() : 'Never'}
                                </span>
                              </div>
                              <div>
                                Last Sync:{' '}
                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                  {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleTimeString() : 'Never'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <button
                              onClick={() => handleTestHeartbeat(device)}
                              className="text-xs font-semibold text-primary dark:text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              <Activity size={14} /> Ping Heartbeat
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenDeviceModal(device)}
                                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                title="Edit Configuration"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteDevice(device)}
                                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"
                                title="Delete Terminal"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 2: EMPLOYEE MAPPINGS */}
          {/* ========================================================================= */}
          {activeTab === 'MAPPINGS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search staff name or terminal PIN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-cyan-500/20"
                  />
                </div>

                <button
                  onClick={handleOpenMappingModal}
                  disabled={!canWrite || devices.length === 0}
                  className="w-full sm:w-auto px-4 py-2.5 bg-primary dark:bg-cyan-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-primary-hover dark:hover:bg-cyan-500 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus size={16} /> Link Staff to Terminal PIN
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Device</th>
                        <th className="py-3 px-4">Terminal PIN</th>
                        <th className="py-3 px-4">Employee Profile</th>
                        <th className="py-3 px-4">Terminal Privilege</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {mappings
                        .filter((m) => {
                          const q = searchQuery.toLowerCase();
                          return (
                            m.deviceUserId.toLowerCase().includes(q) ||
                            (m.employeeName && m.employeeName.toLowerCase().includes(q))
                          );
                        })
                        .map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                              {m.deviceName || 'General MB460'}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              PIN #{m.deviceUserId}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 dark:text-white">{m.employeeName || 'Unassigned'}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">{m.employeeDesignation}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {m.privilege}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteMapping(m)}
                                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer"
                                title="Remove mapping"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {mappings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                            No biometric mappings created yet. Click &quot;Link Staff to Terminal PIN&quot; to associate device enrollment numbers with company profiles.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 3: RAW EVENTS */}
          {/* ========================================================================= */}
          {activeTab === 'RAW_EVENTS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={filterDeviceId}
                    onChange={(e) => setFilterDeviceId(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="ALL">All Hardware Devices</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.ipAddress})
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Showing latest <span className="font-bold text-slate-800 dark:text-white">{rawEvents.length}</span> punches
                  </div>
                </div>

                <button
                  onClick={handleRunProcessing}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Run Attendance Ingestion Engine
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Device</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Punch Type</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {rawEvents
                        .filter((ev) => filterDeviceId === 'ALL' || ev.deviceId === filterDeviceId)
                        .map((ev) => {
                          const MethodIcon =
                            ev.verificationMethod === 'FACE'
                              ? ScanFace
                              : ev.verificationMethod === 'FINGERPRINT'
                              ? Fingerprint
                              : ev.verificationMethod === 'CARD'
                              ? CreditCard
                              : Key;

                          return (
                            <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                {new Date(ev.eventTimestamp).toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {ev.employeeName || (
                                    <span className="text-amber-600 dark:text-amber-400 font-normal">
                                      Unmapped PIN #{ev.deviceUserId}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{ev.deviceName || 'Terminal'}</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                  <MethodIcon size={12} className="text-primary dark:text-cyan-400" />
                                  {ev.verificationMethod}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{ev.eventType}</span>
                              </td>
                              <td className="py-3 px-4">
                                {ev.processed ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-transparent dark:border-emerald-900/50">
                                    Calculated into Session
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-bold border border-transparent dark:border-amber-900/50">
                                    Queued
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {rawEvents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                            No biometric punches recorded yet. Run the connector or use &quot;Simulate Punch&quot; to test.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 4: SYNC LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'SYNC_LOGS' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4">Terminal</th>
                        <th className="py-3 px-4">Operation</th>
                        <th className="py-3 px-4">Punches Ingested</th>
                        <th className="py-3 px-4">Duplicates Discarded</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {syncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {new Date(log.startedAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">
                            {log.deviceName || 'Connector'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{log.syncType}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{log.eventsIngested}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 dark:text-slate-500">{log.eventsDuplicate}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-transparent ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 dark:border-emerald-900/50'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 dark:border-rose-900/50'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {syncLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                            No connector synchronization logs recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER / EDIT DEVICE */}
      {/* ========================================================================= */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingDevice ? 'Edit Terminal Configuration' : 'Register Attendance Terminal'}
            </h3>

            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Head Office Main Entrance"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-cyan-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Device Model
                  </label>
                  <input
                    type="text"
                    value={deviceForm.model}
                    onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Head Office, Factory A"
                    value={deviceForm.locationName}
                    onChange={(e) => setDeviceForm({ ...deviceForm, locationName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    LAN IP Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192.168.68.104"
                    value={deviceForm.ipAddress}
                    onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Port (Default 4370) *
                  </label>
                  <input
                    type="number"
                    required
                    value={deviceForm.port}
                    onChange={(e) => setDeviceForm({ ...deviceForm, port: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Comm Password / Key
                  </label>
                  <input
                    type="text"
                    value={deviceForm.commKey}
                    onChange={(e) => setDeviceForm({ ...deviceForm, commKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Serial Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MB46099182"
                    value={deviceForm.serialNumber}
                    onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-primary dark:bg-cyan-600 hover:bg-primary-hover dark:hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isProcessing && <Loader2 size={14} className="animate-spin" />}
                  {editingDevice ? 'Update Terminal' : 'Register Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MAPPING FORM */}
      {/* ========================================================================= */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Link Staff to Biometric PIN</h3>

            <form onSubmit={handleSaveMapping} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Terminal Device *
                </label>
                <select
                  value={mappingForm.deviceId}
                  onChange={(e) => setMappingForm({ ...mappingForm, deviceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.locationName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Device Enrollment User ID / PIN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1, 101, 1024"
                  value={mappingForm.deviceUserId}
                  onChange={(e) => setMappingForm({ ...mappingForm, deviceUserId: e.target.value.trim() })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">The numeric user ID enrolled on the MB460 screen.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Company Employee *
                </label>
                <select
                  value={mappingForm.employeeId}
                  onChange={(e) => setMappingForm({ ...mappingForm, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} &bull; {emp.designation || 'Staff'} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-primary dark:bg-cyan-600 hover:bg-primary-hover dark:hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isProcessing && <Loader2 size={14} className="animate-spin" />}
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMULATE PUNCH (DEVELOPMENT & DEMO HELPER) */}
      {/* ========================================================================= */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <Zap size={18} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Simulate Biometric Punch</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Injects a live hardware punch into the raw events pipeline and executes session calculation.
            </p>

            <form onSubmit={handleSimulatePunch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Terminal
                </label>
                <select
                  value={simulateForm.deviceId}
                  onChange={(e) => setSimulateForm({ ...simulateForm, deviceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Terminal Enrollment PIN
                </label>
                <input
                  type="text"
                  required
                  value={simulateForm.deviceUserId}
                  onChange={(e) => setSimulateForm({ ...simulateForm, deviceUserId: e.target.value.trim() })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  placeholder="e.g. 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Verification Method
                  </label>
                  <select
                    value={simulateForm.verificationMethod}
                    onChange={(e) =>
                      setSimulateForm({
                        ...simulateForm,
                        verificationMethod: e.target.value as BiometricVerificationMethod,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="FACE">Facial Recognition</option>
                    <option value="FINGERPRINT">Fingerprint</option>
                    <option value="CARD">RFID Card</option>
                    <option value="PASSWORD">Passcode</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Event Type
                  </label>
                  <select
                    value={simulateForm.eventType}
                    onChange={(e) =>
                      setSimulateForm({ ...simulateForm, eventType: e.target.value as AttendanceEventType })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="CHECK_IN">Check In</option>
                    <option value="CHECK_OUT">Check Out</option>
                    <option value="BREAK_OUT">Break Out</option>
                    <option value="BREAK_IN">Break In</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isProcessing && <Loader2 size={14} className="animate-spin" />}
                  Inject Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
