import React, { useState, useEffect, useCallback } from 'react';
import { fetchSystemStats, fetchSystemLogs, fetchSystemInfo, checkHealth } from './services/apiService';
import { SystemStats, LogEntry, AIAnalysis, SystemInfo } from './types';
import StatCard from './components/StatCard';
import Terminal from './components/Terminal';
import NetworkGraph from './components/NetworkGraph';
import AIAnalyst from './components/AIAnalyst';

// Icons
const CpuIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>;
const RamIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const DiskIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;
const ServerIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>;

const App: React.FC = () => {
  const [stats, setStats] = useState<SystemStats[]>([]);
  const [latest, setLatest] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis>({ status: 'idle', content: '' });
  const [appStarted, setAppStarted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initial connection check and system info fetch
  useEffect(() => {
    if (!appStarted) return;

    const init = async () => {
      setConnectionStatus('connecting');

      const isHealthy = await checkHealth();
      if (!isHealthy) {
        setConnectionStatus('error');
        setErrorMessage('Cannot connect to server. Check if backend is running.');
        return;
      }

      try {
        const info = await fetchSystemInfo();
        setSystemInfo(info);
        setConnectionStatus('connected');
      } catch (err) {
        setConnectionStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
      }
    };

    init();
  }, [appStarted]);

  // Stats polling loop
  useEffect(() => {
    if (!appStarted || connectionStatus !== 'connected') return;

    const fetchData = async () => {
      try {
        const nextData = await fetchSystemStats();
        setLatest(nextData);
        setStats(prev => [...prev, nextData].slice(-30));
        setConnectionStatus('connected');
      } catch (err) {
        console.warn("Stats fetch failed:", err);
        setConnectionStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Connection lost');
      }
    };

    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [appStarted, connectionStatus]);

  // Logs polling loop
  useEffect(() => {
    if (!appStarted || connectionStatus !== 'connected') return;

    const fetchLogs = async () => {
      try {
        const { logs: newLogs } = await fetchSystemLogs(30);
        setLogs(newLogs);
      } catch (err) {
        console.warn("Logs fetch failed:", err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [appStarted, connectionStatus]);

  // AI Analysis Handler
  const handleAnalyze = useCallback(async () => {
    if (!latest || !systemInfo) return;
    setAiAnalysis({ status: 'analyzing', content: '' });

    // Generate analysis locally (no external API needed)
    const analysis = generateLocalAnalysis(latest, systemInfo);

    setTimeout(() => {
      setAiAnalysis({ status: 'complete', content: analysis });
    }, 1500);
  }, [latest, systemInfo]);

  // Retry connection
  const handleRetry = () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    setAppStarted(false);
    setTimeout(() => setAppStarted(true), 100);
  };

  // Start Screen
  if (!appStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="z-10 text-center space-y-8">
          <h1 className="text-6xl md:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 animate-pulse">
            NEON<span className="text-white">PULSE</span>
          </h1>
          <p className="text-cyan-500/70 font-mono tracking-[0.3em] uppercase text-sm">Server Monitoring System</p>

          <button
            onClick={() => setAppStarted(true)}
            className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-none border border-cyan-500/50 hover:border-cyan-400 transition-colors"
          >
            <div className="absolute inset-0 w-0 bg-cyan-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
            <span className="relative text-cyan-400 group-hover:text-cyan-300 font-display font-bold tracking-widest text-lg">
              CONNECT TO SERVER
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Connection Error Screen
  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
        <div className="z-10 text-center space-y-6 max-w-md px-4">
          <div className="text-red-500 text-6xl animate-pulse">!</div>
          <h1 className="text-2xl font-display font-bold text-red-500">CONNECTION FAILED</h1>
          <p className="text-slate-400 font-mono text-sm">{errorMessage}</p>
          <div className="text-xs text-slate-600 font-mono space-y-1">
            <p>Possible causes:</p>
            <p>- Backend server not running</p>
            <p>- Your IP is not whitelisted</p>
            <p>- Network firewall blocking connection</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-6 py-3 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors font-mono"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-cyan-500 font-mono text-sm animate-pulse">ESTABLISHING CONNECTION...</p>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-2 md:p-6 overflow-hidden flex flex-col relative">
      {/* Header */}
      <header className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center">
            <ServerIcon />
            <span className="ml-3">{systemInfo?.hostname || 'SERVER'}:
              <span className="ml-2 text-green-500 neon-text text-sm">LIVE</span>
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
            {systemInfo?.distro} {systemInfo?.release} | {systemInfo?.cpu.brand} | Uptime: {systemInfo?.uptimeFormatted}
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="px-3 py-1 text-xs border border-green-700 text-green-400 rounded uppercase tracking-widest font-bold">
            CONNECTED
          </div>
          <div className="text-[10px] text-slate-600 font-mono">{new Date().toLocaleDateString()}</div>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 flex-1">

        {/* Row 1: Key Stats (Top) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="CPU LOAD"
              value={latest ? `${latest.cpuLoad}%` : '--'}
              percent={latest?.cpuLoad}
              color={latest && latest.cpuLoad > 85 ? 'red' : 'cyan'}
              icon={<CpuIcon />}
            />
            <StatCard
              title="RAM USAGE"
              value={latest ? `${latest.ramUsage.toFixed(1)}` : '--'}
              unit={`/ ${latest?.ramTotal} GB`}
              percent={latest ? (latest.ramUsage / latest.ramTotal) * 100 : 0}
              color="fuchsia"
              icon={<RamIcon />}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="DISK USAGE"
              value={latest ? `${latest.diskUsage}%` : '--'}
              percent={latest?.diskUsage}
              color="green"
              icon={<DiskIcon />}
            />
            <StatCard
              title="TEMP"
              value={latest ? `${latest.temperature}°C` : '--'}
              percent={latest?.temperature ? Math.min((latest.temperature / 100) * 100, 100) : 0}
              color={latest && latest.temperature > 80 ? 'red' : 'yellow'}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
          </div>
        </div>

        {/* Row 1: Graph (Middle) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 h-[280px] md:h-auto bg-slate-900/50 rounded-xl border border-slate-700/50 p-4 relative overflow-hidden backdrop-blur-sm">
          <h3 className="absolute top-4 left-4 text-xs font-bold text-slate-400 z-10 font-display">
            NETWORK TRAFFIC ({latest?.networkInterface || 'ETH0'})
          </h3>
          <div className="absolute top-4 right-4 flex space-x-4 text-xs font-mono z-10">
            <span className="text-cyan-400">RX: {latest?.networkIn.toFixed(2) || '0.00'} Mbps</span>
            <span className="text-fuchsia-400">TX: {latest?.networkOut.toFixed(2) || '0.00'} Mbps</span>
          </div>
          <NetworkGraph data={stats} />
        </div>

        {/* Row 1: AI (Right) */}
        <div className="col-span-1 md:col-span-4 lg:col-span-2 h-[200px] lg:h-auto">
          <AIAnalyst analysis={aiAnalysis} onAnalyze={handleAnalyze} />
        </div>

        {/* Row 2: Terminal (Bottom Full Width) */}
        <div className="col-span-1 md:col-span-4 lg:col-span-6 h-[250px] md:h-[300px]">
          <Terminal logs={logs} />
        </div>
      </div>
    </div>
  );
};

// Local analysis function (no external API needed)
function generateLocalAnalysis(stats: SystemStats, info: SystemInfo): string {
  const issues: string[] = [];
  const good: string[] = [];

  // CPU Analysis
  if (stats.cpuLoad > 90) {
    issues.push(`CRITICAL: CPU at ${stats.cpuLoad}% - consider scaling or optimizing`);
  } else if (stats.cpuLoad > 70) {
    issues.push(`WARNING: CPU load elevated at ${stats.cpuLoad}%`);
  } else {
    good.push(`CPU healthy at ${stats.cpuLoad}%`);
  }

  // RAM Analysis
  const ramPercent = (stats.ramUsage / stats.ramTotal) * 100;
  if (ramPercent > 90) {
    issues.push(`CRITICAL: RAM at ${ramPercent.toFixed(0)}% - risk of OOM`);
  } else if (ramPercent > 75) {
    issues.push(`WARNING: RAM usage at ${ramPercent.toFixed(0)}%`);
  } else {
    good.push(`RAM adequate at ${ramPercent.toFixed(0)}%`);
  }

  // Disk Analysis
  if (stats.diskUsage > 90) {
    issues.push(`CRITICAL: Disk at ${stats.diskUsage}% - cleanup needed`);
  } else if (stats.diskUsage > 80) {
    issues.push(`WARNING: Disk usage at ${stats.diskUsage}%`);
  } else {
    good.push(`Disk space OK at ${stats.diskUsage}%`);
  }

  // Temperature Analysis
  if (stats.temperature > 85) {
    issues.push(`CRITICAL: Temperature at ${stats.temperature}°C - check cooling`);
  } else if (stats.temperature > 70) {
    issues.push(`WARNING: Temperature elevated at ${stats.temperature}°C`);
  } else if (stats.temperature > 0) {
    good.push(`Temperature normal at ${stats.temperature}°C`);
  }

  // Build report
  let report = `SYSTEM ANALYSIS - ${info.hostname}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `Platform: ${info.distro} ${info.release}\n`;
  report += `Uptime: ${info.uptimeFormatted}\n\n`;

  if (issues.length > 0) {
    report += `ISSUES DETECTED:\n`;
    issues.forEach(i => report += `  • ${i}\n`);
    report += `\n`;
  }

  if (good.length > 0) {
    report += `HEALTHY METRICS:\n`;
    good.forEach(g => report += `  ✓ ${g}\n`);
  }

  report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += issues.length === 0 ? `STATUS: ALL SYSTEMS NOMINAL` : `STATUS: ${issues.length} ISSUE(S) REQUIRE ATTENTION`;

  return report;
}

export default App;
