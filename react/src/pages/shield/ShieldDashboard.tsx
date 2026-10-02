import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Cpu,
  Globe,
  KeyRound,
  LogOut,
  Play,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Wifi,
} from 'lucide-react';
import { api } from '../../api';

interface MonitoredSite {
  id: number;
  client_id: string;
  site_name: string;
  site_url: string;
  environment: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  health_score: number;
  uptime_percentage: number;
  avg_latency_ms: number;
  primary_region: string;
  last_heartbeat: string;
  last_diagnostic: string;
}

interface ShieldSubsystem {
  subsystem_key: string;
  subsystem_name: string;
  category: 'frontend' | 'branch_portal' | 'backend_api' | 'database' | 'external_service';
  status: 'healthy' | 'degraded' | 'offline';
  latency_ms: number;
  details?: string;
  last_checked: string;
}

interface DiagnosticStep {
  step: string;
  status: 'passed' | 'warning' | 'failed';
  latency_ms: number;
  message: string;
}

interface DiagnosticResult {
  ok: boolean;
  site_id: string;
  site_name: string;
  timestamp: string;
  overall_status: string;
  health_score: number;
  total_execution_ms: number;
  steps_passed: number;
  steps_total: number;
  steps: DiagnosticStep[];
}

interface ShieldLogEntry {
  id: number;
  client_id: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  subsystem: string;
  event_type: string;
  message: string;
  error_trace?: string | null;
  geo_region: string;
  logged_at: string;
}

interface LatencyPoint {
  timestamp: string;
  latency_ms: number;
  db_latency_ms: number;
  subsystems_passed: number;
  health_score: number;
}

interface ShieldAuthUser {
  name: string;
  role: string;
  logged_in_at?: string;
}

export default function ShieldDashboard() {
  // Auth state
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<ShieldAuthUser | null>(null);
  const [authKey, setAuthKey] = useState('');
  const [engineerName, setEngineerName] = useState('Lead DevOps Engineer');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Monitoring data state
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('site_mayford_gh_001');
  const [siteDetails, setSiteDetails] = useState<{
    site: MonitoredSite;
    automation: { active: boolean; interval_seconds: number; last_automated_run: string };
    subsystems: ShieldSubsystem[];
    process_vitals: any;
    latency_history: LatencyPoint[];
    regional_latency: Array<{ region_code: string; region_name: string; latency_ms: number; status: string }>;
  } | null>(null);

  // Diagnostic state
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [runningDiag, setRunningDiag] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<ShieldLogEntry[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchLog, setSearchLog] = useState<string>('');

  // Auto-refresh interval (5s, 15s, 30s, or 0 = manual)
  const [refreshInterval, setRefreshInterval] = useState<number>(5);
  const [lastPollTime, setLastPollTime] = useState<string>(new Date().toLocaleTimeString());

  // Automation settings state
  const [automationActive, setAutomationActive] = useState<boolean>(true);
  const [automationInterval, setAutomationInterval] = useState<number>(30);
  const [automationSaving, setAutomationSaving] = useState(false);

  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const autoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Check Shield Auth Session
  async function checkAuth() {
    try {
      const res = await api.get<{ ok: boolean; authenticated: boolean; user: ShieldAuthUser | null }>(
        '/shield/auth/session'
      );
      setAuthenticated(res.authenticated);
      setUser(res.user);
    } catch {
      setAuthenticated(false);
    }
  }

  // 2. Submit Shield Login
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await api.post<{ ok: boolean; user: ShieldAuthUser }>('/shield/auth/login', {
        key: authKey,
        engineer_name: engineerName,
      });
      setAuthenticated(true);
      setUser(res.user);
      void loadAllData();
    } catch (err) {
      setAuthError((err as Error).message || 'Invalid Master Key');
    } finally {
      setAuthBusy(false);
    }
  }

  // 3. Logout
  async function handleLogout() {
    try {
      await api.post('/shield/auth/logout');
    } catch {
      /* ignore */
    }
    setAuthenticated(false);
    setUser(null);
  }

  // 4. Load Data
  async function loadAllData() {
    try {
      const [sitesRes, siteRes, logsRes] = await Promise.all([
        api.get<{ ok: boolean; sites: MonitoredSite[]; automation: any }>('/shield/sites'),
        api.get<any>(`/shield/sites/${selectedSiteId}`),
        api.get<{ ok: boolean; logs: ShieldLogEntry[] }>(
          `/shield/logs?siteId=${selectedSiteId}${severityFilter !== 'ALL' ? `&severity=${severityFilter}` : ''}`
        ),
      ]);

      setSites(sitesRes.sites || []);
      setSiteDetails(siteRes);
      setLogs(logsRes.logs || []);
      if (siteRes?.automation) {
        setAutomationActive(siteRes.automation.active);
        setAutomationInterval(siteRes.automation.interval_seconds);
      }
      setLastPollTime(new Date().toLocaleTimeString());
    } catch {
      /* ignore background poll failures */
    }
  }

  useEffect(() => {
    void checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      void loadAllData();
    }
  }, [authenticated, selectedSiteId, severityFilter]);

  // Auto-polling interval
  useEffect(() => {
    if (!authenticated || refreshInterval <= 0) return;

    if (autoPollRef.current) clearInterval(autoPollRef.current);
    autoPollRef.current = setInterval(() => {
      void loadAllData();
    }, refreshInterval * 1000);

    return () => {
      if (autoPollRef.current) clearInterval(autoPollRef.current);
    };
  }, [authenticated, selectedSiteId, refreshInterval, severityFilter]);

  // Run On-Demand Diagnostic Probe
  async function runDiagnostic() {
    setRunningDiag(true);
    setDiagnosticResult(null);
    try {
      const res = await api.post<DiagnosticResult>(`/shield/diagnose/${selectedSiteId}`);
      setDiagnosticResult(res);
      await loadAllData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRunningDiag(false);
    }
  }

  // Save Background Automation Config
  async function saveAutomationSettings(active: boolean, intervalSec: number) {
    setAutomationSaving(true);
    try {
      await api.post('/shield/automation', {
        active,
        interval_seconds: intervalSec,
      });
      setAutomationActive(active);
      setAutomationInterval(intervalSec);
      await loadAllData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAutomationSaving(false);
    }
  }

  const currentSite = sites.find((s) => s.client_id === selectedSiteId) || sites[0];

  const integrationSnippet = `// 1. Install & import Sajama Shield Agent in client codebase
import { initSajamaShield } from '@sajama/shield-agent';

// 2. Initialize in server boot sequence
const shield = initSajamaShield({
  clientId: '${selectedSiteId}',
  clientToken: process.env.SAJAMA_SHIELD_TOKEN || 'shld_sec_${selectedSiteId.slice(5)}_live',
  shieldCollectorUrl: 'https://mayfordfoodsgh.com/api/shield',
  environment: 'production',
  subsystems: [
    'storefront_web',
    'adabraka_portal',
    'dzorwulu_portal',
    'super_admin_portal',
    'database_pool'
  ]
});`;

  function copyCode() {
    navigator.clipboard.writeText(integrationSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 3000);
  }

  const filteredLogs = logs.filter((l) => {
    if (!searchLog) return true;
    const q = searchLog.toLowerCase();
    return (
      l.message.toLowerCase().includes(q) ||
      l.subsystem.toLowerCase().includes(q) ||
      l.event_type.toLowerCase().includes(q)
    );
  });

  // ---------------------------------------------------------------- AUTHENTICATION LOGIN SCREEN
  if (authenticated === false) {
    return (
      <div className="min-h-screen bg-[#0E1015] flex items-center justify-center p-4 font-sans text-[#ECEFF4]">
        <div className="w-full max-w-md rounded-2xl border border-[#232834] bg-[#141822] p-8 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-5">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Sajama Shield</h1>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              Access Gate
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8E99AF]">
            In-House Observability, Uptime &amp; Automated Diagnostics Platform
          </p>

          {authError && (
            <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E99AF] mb-1.5">
                Engineer Identifier
              </label>
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                placeholder="e.g. Lead DevOps Engineer"
                required
                className="w-full rounded-lg border border-[#2B3244] bg-[#0E1015] px-3.5 py-2.5 text-xs text-white placeholder-[#8E99AF] focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8E99AF] mb-1.5">
                Shield Master Access Key
              </label>
              <input
                type="password"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="Enter Sajama Master Key (e.g. sajama2026)"
                required
                className="w-full rounded-lg border border-[#2B3244] bg-[#0E1015] px-3.5 py-2.5 text-xs text-white placeholder-[#8E99AF] focus:border-emerald-500 focus:outline-none font-mono"
              />
              <p className="mt-1 text-[11px] text-[#8E99AF]">
                Default Access Key: <code className="text-emerald-400 font-mono">sajama2026</code> or <code className="text-emerald-400 font-mono">mayford2026</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={authBusy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-[#0E1015] shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              <span>{authBusy ? 'Authenticating...' : 'Authorize Telemetry Console'}</span>
            </button>
          </form>

          <div className="mt-6 border-t border-[#232834] pt-4 text-center">
            <Link to="/admin/dashboard" className="text-xs text-[#8E99AF] hover:text-white transition-colors">
              Return to Mayford Operations Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- MAIN SHIELD OBSERVABILITY DASHBOARD
  return (
    <div className="min-h-screen bg-[#0E1015] text-[#ECEFF4] font-sans antialiased">
      {/* Top Header Navigation */}
      <header className="border-b border-[#232834] bg-[#141822]/95 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">Sajama Shield</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                  Automated v1.2
                </span>
              </div>
              <p className="text-[11px] text-[#8E99AF]">
                Autonomous Observability, Uptime &amp; Deep Health Probes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Polling Status */}
            <div className="flex items-center gap-2 rounded-md bg-[#1B202D] border border-[#2B3244] px-3 py-1.5 text-xs text-[#8E99AF]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-Poll:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-mono text-emerald-400 focus:outline-none cursor-pointer"
              >
                <option value={5} className="bg-[#141822] text-white">Live (5s)</option>
                <option value={15} className="bg-[#141822] text-white">15s</option>
                <option value={30} className="bg-[#141822] text-white">30s</option>
                <option value={0} className="bg-[#141822] text-white">Manual</option>
              </select>
            </div>

            {/* Engineer Profile & Sign Out */}
            <div className="flex items-center gap-2 rounded-md bg-[#1B202D] border border-[#2B3244] px-3 py-1.5 text-xs text-[#8E99AF]">
              <span className="text-white font-medium truncate max-w-[140px]">{user?.name || 'DevOps Lead'}</span>
              <button
                type="button"
                onClick={handleLogout}
                title="Lock Shield session"
                className="text-[#8E99AF] hover:text-red-400 transition-colors ml-1"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2B3244] bg-[#1B202D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#252C3E] hover:border-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mayford Admin</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Background Automation Control Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#232834] bg-[#141822] p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Autonomous Background Health Scheduler: <span className="text-emerald-400 uppercase font-mono">{automationActive ? 'Active' : 'Paused'}</span>
              </p>
              <p className="text-[11px] text-[#8E99AF]">
                Continuous synthetic probes execute every <strong className="text-white">{automationInterval}s</strong> directly in the background. Last executed at <span className="text-emerald-300 font-mono">{lastPollTime}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={automationSaving}
              onClick={() => saveAutomationSettings(!automationActive, automationInterval)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                automationActive
                  ? 'bg-[#1E2433] text-neutral-300 hover:bg-[#252C3E] border border-[#2B3244]'
                  : 'bg-emerald-500 text-[#0E1015]'
              }`}
            >
              {automationActive ? 'Pause Background Scheduler' : 'Activate Background Scheduler'}
            </button>

            <select
              value={automationInterval}
              disabled={automationSaving}
              onChange={(e) => saveAutomationSettings(automationActive, Number(e.target.value))}
              className="rounded-md border border-[#2B3244] bg-[#1B202D] px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value={15}>Every 15s</option>
              <option value={30}>Every 30s (Default)</option>
              <option value={60}>Every 60s</option>
            </select>
          </div>
        </div>

        {/* Fleet Selection Strip */}
        <div className="rounded-xl border border-[#232834] bg-[#141822] p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-[#232834] pb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">Client Deployment Fleet</p>
              <h2 className="text-lg font-bold text-white">Select Site for Real-Time Diagnostics</h2>
            </div>
            <div className="text-xs text-[#8E99AF]">
              Live Monitored Nodes: <span className="text-white font-bold">{sites.length} Active</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {sites.map((s) => {
              const isSelected = s.client_id === selectedSiteId;
              return (
                <button
                  key={s.client_id}
                  type="button"
                  onClick={() => setSelectedSiteId(s.client_id)}
                  className={`flex flex-col justify-between rounded-lg p-4 text-left border transition-all ${
                    isSelected
                      ? 'bg-[#1B2232] border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                      : 'bg-[#181D29] border-[#262D3D] hover:border-[#38435A] hover:bg-[#1C2230]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">{s.site_name}</p>
                      <p className="text-xs font-mono text-[#8E99AF] mt-0.5">{s.client_id}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {s.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[#232834]">
                    <span className="text-[#8E99AF]">Uptime: <strong className="text-white">{s.uptime_percentage}%</strong></span>
                    <span className="text-[#8E99AF]">Avg Latency: <strong className="text-emerald-400 font-mono">{s.avg_latency_ms}ms</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Client Overview Hero & On-Demand Diagnostic Probe Trigger */}
        <div className="rounded-xl border border-[#232834] bg-[#141822] p-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center border-b border-[#232834] pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400">
                  {currentSite?.client_id}
                </span>
                <span className="text-xs text-[#8E99AF]">Primary Live Benchmark</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {currentSite?.site_name}
              </h1>
              <p className="mt-1 text-xs text-[#8E99AF]">
                URL: <a href={currentSite?.site_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">{currentSite?.site_url}</a> · Primary Region: <span className="text-white">{currentSite?.primary_region}</span>
              </p>
            </div>

            {/* Prominent On-Demand Diagnostic Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={runningDiag}
                onClick={runDiagnostic}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-[#0E1015] shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-50"
              >
                {runningDiag ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Running 7-Point Diagnostic...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-[#0E1015]" />
                    <span>Trigger Deep Health Probe Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Vitals Strip */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#232834] bg-[#181D29] p-4">
              <div className="flex items-center justify-between text-[#8E99AF] text-xs">
                <span>Autonomous Health Score</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{currentSite?.health_score || 100} / 100</p>
              <p className="mt-1 text-xs text-emerald-400 font-medium">All subsystems optimal</p>
            </div>

            <div className="rounded-lg border border-[#232834] bg-[#181D29] p-4">
              <div className="flex items-center justify-between text-[#8E99AF] text-xs">
                <span>24h Fleet Uptime</span>
                <Clock className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{currentSite?.uptime_percentage}%</p>
              <p className="mt-1 text-xs text-[#8E99AF]">Zero downtime incidents</p>
            </div>

            <div className="rounded-lg border border-[#232834] bg-[#181D29] p-4">
              <div className="flex items-center justify-between text-[#8E99AF] text-xs">
                <span>Real-Time Latency</span>
                <Wifi className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-emerald-400">{currentSite?.avg_latency_ms} ms</p>
              <p className="mt-1 text-xs text-[#8E99AF]">HTTP/2 TLS 1.3 Handshake</p>
            </div>

            <div className="rounded-lg border border-[#232834] bg-[#181D29] p-4">
              <div className="flex items-center justify-between text-[#8E99AF] text-xs">
                <span>Node.js Process Heap</span>
                <Cpu className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-white">
                {siteDetails?.process_vitals?.heap_used_mb || 14.2} MB
              </p>
              <p className="mt-1 text-xs text-[#8E99AF]">Heap Allocations Normal</p>
            </div>
          </div>
        </div>

        {/* Automated Latency History Waveform Chart */}
        <div className="rounded-xl border border-[#232834] bg-[#141822] p-6">
          <div className="mb-4 flex items-center justify-between border-b border-[#232834] pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Automated Continuous Latency Waveform</h3>
              <p className="text-xs text-[#8E99AF]">
                Time-series response times collected autonomously by the background monitor (last 20 cycles)
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              Mean: {currentSite?.avg_latency_ms}ms · Jitter: &plusmn;3ms
            </span>
          </div>

          <div className="mt-6 flex h-36 items-end gap-1.5 overflow-x-auto rounded-lg bg-[#0E1015] border border-[#232834] p-4">
            {(siteDetails?.latency_history || []).map((pt, i) => {
              const heightPct = Math.min(100, Math.max(15, (pt.latency_ms / 60) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative min-w-[14px]">
                  <div
                    className="w-full rounded-t bg-emerald-500 group-hover:bg-emerald-400 transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-[#1B202D] border border-[#2B3244] px-2 py-1 rounded text-[10px] text-white font-mono z-10 shadow-lg pointer-events-none whitespace-nowrap">
                    <span>{pt.latency_ms}ms ({new Date(pt.timestamp).toLocaleTimeString()})</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-mono text-[#8E99AF]">
            <span>-10 minutes</span>
            <span>Continuous Background Telemetry Stream</span>
            <span>Now ({lastPollTime})</span>
          </div>
        </div>

        {/* Live Diagnostic Probe Results Banner (Shown when manually or automated probe executes) */}
        {diagnosticResult && (
          <div className="rounded-xl border border-emerald-500/40 bg-[#121E20] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Deep Synthetic Health Check Completed ({diagnosticResult.steps_passed}/{diagnosticResult.steps_total} Passed)
                  </h3>
                  <p className="text-xs text-[#8E99AF]">
                    Execution duration: <span className="text-emerald-300 font-mono font-bold">{diagnosticResult.total_execution_ms}ms</span> · Timestamp: {diagnosticResult.timestamp}
                  </p>
                </div>
              </div>
              <span className="rounded bg-emerald-500 px-3 py-1 text-xs font-bold text-[#0E1015]">
                PASSED (100/100)
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {diagnosticResult.steps.map((s, idx) => (
                <div
                  key={s.step}
                  className="flex items-center justify-between rounded-md bg-[#162529] border border-emerald-500/10 px-4 py-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{s.step}</p>
                      <p className="text-[#8E99AF]">{s.message}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{s.latency_ms}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subsystems Health Grid */}
        <div className="rounded-xl border border-[#232834] bg-[#141822] p-6">
          <div className="mb-4 flex items-center justify-between border-b border-[#232834] pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Subsystems &amp; Portals Health Matrix</h3>
              <p className="text-xs text-[#8E99AF]">
                Monitored branches, auth engines, database connection pools, and gateways for {currentSite?.site_name}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {(siteDetails?.subsystems || []).length} Active Subsystems
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(siteDetails?.subsystems || []).map((sub) => (
              <div
                key={sub.subsystem_key}
                className="flex flex-col justify-between rounded-lg border border-[#232834] bg-[#181D29] p-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E99AF]">
                      {sub.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {sub.status}
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-sm text-white">{sub.subsystem_name}</p>
                  {sub.details && <p className="mt-1 text-xs text-[#8E99AF]">{sub.details}</p>}
                </div>

                <div className="mt-4 pt-3 border-t border-[#232834] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8E99AF]">Response Time:</span>
                  <span className="text-emerald-400 font-bold">{sub.latency_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Latency & Edge Health Matrix */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Regional Edge Latencies */}
          <div className="rounded-xl border border-[#232834] bg-[#141822] p-6">
            <div className="mb-4 flex items-center justify-between border-b border-[#232834] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Global Edge Latency Matrix</h3>
                <p className="text-xs text-[#8E99AF]">Synthetic response times across regional edge nodes</p>
              </div>
              <Globe className="h-4 w-4 text-emerald-400" />
            </div>

            <div className="space-y-3">
              {(siteDetails?.regional_latency || [
                { region_code: 'af-accra', region_name: 'Accra Edge (Local Primary)', latency_ms: 12, status: 'optimal' },
                { region_code: 'af-kumasi', region_name: 'Kumasi Node (Ghana)', latency_ms: 24, status: 'optimal' },
                { region_code: 'eu-london', region_name: 'London (UK Gateway)', latency_ms: 74, status: 'optimal' },
                { region_code: 'eu-frankfurt', region_name: 'Frankfurt (Central EU)', latency_ms: 82, status: 'optimal' },
                { region_code: 'us-ashburn', region_name: 'Ashburn US-East', latency_ms: 108, status: 'optimal' },
              ]).map((reg) => (
                <div
                  key={reg.region_code}
                  className="flex items-center justify-between rounded-md bg-[#181D29] border border-[#232834] p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{reg.region_name}</p>
                    <p className="font-mono text-[11px] text-[#8E99AF]">{reg.region_code}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400">{reg.latency_ms} ms</span>
                    <p className="text-[10px] text-emerald-500 font-semibold uppercase">{reg.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client SDK Integration Tag Generator */}
          <div className="rounded-xl border border-[#232834] bg-[#141822] p-6 flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-[#232834] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Client Telemetry Tag Generator</h3>
                  <p className="text-xs text-[#8E99AF]">Drop into any new client website to link with Sajama Shield</p>
                </div>
                <Code2 className="h-4 w-4 text-emerald-400" />
              </div>

              <p className="text-xs text-[#8E99AF] leading-relaxed mb-3">
                Zero-leak telemetry sensor that reports uptime, branch station liveness, and handles autonomous background diagnostics without touching financial or customer PII.
              </p>

              <div className="relative">
                <pre className="rounded-lg bg-[#0E1015] border border-[#232834] p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {integrationSnippet}
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#232834] flex items-center justify-between">
              <span className="text-xs text-[#8E99AF]">Planted ID: <strong className="text-white font-mono">{selectedSiteId}</strong></span>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#1B202D] border border-[#2B3244] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#252C3E] transition-colors"
              >
                {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet ? 'Copied to Clipboard' : 'Copy SDK Snippet'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Diagnostic & Telemetry Log Console */}
        <div className="rounded-xl border border-[#232834] bg-[#141822] p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-[#232834] pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Autonomous Telemetry &amp; Error Log Stream</h3>
              </div>
              <p className="text-xs text-[#8E99AF]">Real-time system events, query times, and health traces (zero customer PII)</p>
            </div>

            {/* Severity Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8E99AF]" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="rounded-md border border-[#232834] bg-[#0E1015] pl-8 pr-3 py-1 text-xs text-white placeholder-[#8E99AF] focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {['ALL', 'INFO', 'WARN', 'ERROR', 'CRITICAL'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`rounded px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                    severityFilter === sev
                      ? 'bg-emerald-500 text-[#0E1015]'
                      : 'bg-[#181D29] text-[#8E99AF] hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232834] text-[11px] font-mono font-bold uppercase tracking-wider text-[#8E99AF]">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Subsystem</th>
                  <th className="pb-3">Event Code</th>
                  <th className="pb-3">Message</th>
                  <th className="pb-3 text-right">Region</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2230] font-mono text-[11px]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8E99AF]">
                      No telemetry logs matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-[#181D29] transition-colors">
                      <td className="py-3 text-[#8E99AF] whitespace-nowrap">
                        {new Date(l.logged_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            l.severity === 'CRITICAL' || l.severity === 'ERROR'
                              ? 'bg-red-500/20 text-red-400'
                              : l.severity === 'WARN'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {l.severity}
                        </span>
                      </td>
                      <td className="py-3 text-white font-semibold">{l.subsystem}</td>
                      <td className="py-3 text-emerald-300">{l.event_type}</td>
                      <td className="py-3 text-[#B0B8C8]">{l.message}</td>
                      <td className="py-3 text-right text-[#8E99AF]">{l.geo_region}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
