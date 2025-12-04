import express from 'express';
import cors from 'cors';
import si from 'systeminformation';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// IP WHITELIST MIDDLEWARE
// ============================================
const ALLOWED_IPS = (process.env.ALLOWED_IPS || '127.0.0.1,::1,::ffff:127.0.0.1')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

const ipWhitelist = (req, res, next) => {
  // Get client IP (handle proxies)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || req.ip;

  // Normalize IPv6 localhost
  const normalizedIp = clientIp?.replace('::ffff:', '');

  // Check if IP is allowed
  const isAllowed = ALLOWED_IPS.some(allowedIp => {
    const normalizedAllowed = allowedIp.replace('::ffff:', '');
    // Support CIDR notation (e.g., 192.168.1.0/24)
    if (allowedIp.includes('/')) {
      return isIpInCidr(normalizedIp, allowedIp);
    }
    // Support wildcards (e.g., 192.168.1.*)
    if (allowedIp.includes('*')) {
      const regex = new RegExp('^' + allowedIp.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return regex.test(normalizedIp);
    }
    return normalizedIp === normalizedAllowed || clientIp === allowedIp;
  });

  if (!isAllowed) {
    console.warn(`[BLOCKED] Access denied for IP: ${clientIp}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP is not whitelisted',
      yourIp: clientIp
    });
  }

  next();
};

// CIDR check helper
function isIpInCidr(ip, cidr) {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
  const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
  return (ipNum & mask) === (rangeNum & mask);
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET'],
}));

app.use(express.json());

// Health check BEFORE IP whitelist (for Docker healthcheck)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Apply IP whitelist only to /api routes
app.use('/api', ipWhitelist);

// Request logging
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${ip}`);
  next();
});

// ============================================
// API ENDPOINTS
// ============================================

// System stats (CPU, RAM, disk, network, temperature)
app.get('/api/stats', async (req, res) => {
  try {
    const [cpu, mem, net, fsData, temp, load] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.fsSize(),
      si.cpuTemperature(),
      si.fullLoad()
    ]);

    // Find main network interface (active one)
    const mainNet = net.find(i => i.operstate === 'up' && i.iface !== 'lo') || net[0];

    // Find main disk (root partition or largest)
    const rootDisk = fsData.find(d => d.mount === '/') || fsData[0];

    res.json({
      timestamp: Date.now(),
      cpuLoad: Math.round(cpu.currentLoad * 10) / 10,
      cpuCores: cpu.cpus?.length || 0,
      ramUsage: parseFloat((mem.active / 1024 / 1024 / 1024).toFixed(1)),
      ramTotal: Math.round(mem.total / 1024 / 1024 / 1024),
      ramPercent: Math.round((mem.active / mem.total) * 100),
      gpuLoad: 0, // GPU needs specific drivers
      temperature: temp.main || temp.max || 0,
      temperatureMax: temp.max || 0,
      networkIn: parseFloat(((mainNet?.rx_sec || 0) / 125000).toFixed(2)),
      networkOut: parseFloat(((mainNet?.tx_sec || 0) / 125000).toFixed(2)),
      networkInterface: mainNet?.iface || 'unknown',
      diskUsage: Math.round(rootDisk?.use || 0),
      diskUsed: parseFloat(((rootDisk?.used || 0) / 1024 / 1024 / 1024).toFixed(1)),
      diskTotal: parseFloat(((rootDisk?.size || 0) / 1024 / 1024 / 1024).toFixed(1)),
    });
  } catch (error) {
    console.error('Error collecting stats:', error);
    res.status(500).json({ error: 'Failed to collect metrics', details: error.message });
  }
});

// System information (hostname, OS, uptime)
app.get('/api/info', async (req, res) => {
  try {
    const [osInfo, system, time, cpu, memLayout, diskLayout] = await Promise.all([
      si.osInfo(),
      si.system(),
      si.time(),
      si.cpu(),
      si.memLayout(),
      si.diskLayout()
    ]);

    res.json({
      hostname: osInfo.hostname,
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      uptime: time.uptime,
      uptimeFormatted: formatUptime(time.uptime),
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed,
        speedMax: cpu.speedMax,
      },
      system: {
        manufacturer: system.manufacturer,
        model: system.model,
        virtual: system.virtual,
      },
      memory: memLayout.map(m => ({
        size: Math.round((m.size || 0) / 1024 / 1024 / 1024),
        type: m.type,
        clockSpeed: m.clockSpeed,
      })),
      disks: diskLayout.map(d => ({
        name: d.name,
        type: d.type,
        size: Math.round((d.size || 0) / 1024 / 1024 / 1024),
      })),
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ error: 'Failed to get system info', details: error.message });
  }
});

// System logs (journalctl or dmesg)
app.get('/api/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const type = req.query.type || 'system'; // system, kernel, docker

    let logs = [];

    // Try different log sources based on availability
    if (type === 'kernel') {
      logs = await getKernelLogs(limit);
    } else if (type === 'docker') {
      logs = await getDockerLogs(limit);
    } else {
      logs = await getSystemLogs(limit);
    }

    res.json({
      logs,
      count: logs.length,
      type,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Failed to get logs', details: error.message });
  }
});

// Processes (top consumers)
app.get('/api/processes', async (req, res) => {
  try {
    const processes = await si.processes();

    // Sort by CPU usage and get top 10
    const topCpu = processes.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 10)
      .map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: Math.round(p.cpu * 10) / 10,
        mem: Math.round(p.mem * 10) / 10,
        user: p.user,
        state: p.state,
      }));

    // Sort by memory and get top 10
    const topMem = processes.list
      .sort((a, b) => b.mem - a.mem)
      .slice(0, 10)
      .map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: Math.round(p.cpu * 10) / 10,
        mem: Math.round(p.mem * 10) / 10,
        user: p.user,
        state: p.state,
      }));

    res.json({
      total: processes.all,
      running: processes.running,
      blocked: processes.blocked,
      sleeping: processes.sleeping,
      topCpu,
      topMem,
    });
  } catch (error) {
    console.error('Error getting processes:', error);
    res.status(500).json({ error: 'Failed to get processes', details: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

async function getSystemLogs(limit) {
  try {
    // Try journalctl first (systemd)
    const output = execSync(
      `journalctl -n ${limit} --no-pager -o json 2>/dev/null || journalctl -n ${limit} --no-pager 2>/dev/null`,
      { encoding: 'utf-8', timeout: 5000 }
    );

    return parseJournalLogs(output, limit);
  } catch {
    // Fallback to /var/log/syslog or messages
    return getLogFromFile('/var/log/syslog', limit) ||
           getLogFromFile('/var/log/messages', limit) ||
           [{ id: '0', timestamp: new Date().toISOString(), level: 'INFO', message: 'No logs available' }];
  }
}

async function getKernelLogs(limit) {
  try {
    const output = execSync(`dmesg --time-format iso | tail -n ${limit}`, {
      encoding: 'utf-8',
      timeout: 5000
    });

    return output.trim().split('\n').map((line, i) => {
      const match = line.match(/^(\S+)\s+(.*)$/);
      return {
        id: `dmesg-${i}`,
        timestamp: match?.[1] || new Date().toISOString(),
        level: detectLogLevel(line),
        message: match?.[2] || line,
      };
    });
  } catch {
    return [{ id: '0', timestamp: new Date().toISOString(), level: 'WARN', message: 'dmesg not available' }];
  }
}

async function getDockerLogs(limit) {
  try {
    const output = execSync(
      `docker ps --format "{{.Names}}" | head -5 | xargs -I {} sh -c 'docker logs --tail 10 {} 2>&1 | head -${Math.floor(limit/5)}'`,
      { encoding: 'utf-8', timeout: 10000 }
    );

    return output.trim().split('\n').map((line, i) => ({
      id: `docker-${i}`,
      timestamp: new Date().toISOString().split('T')[1].split('.')[0],
      level: detectLogLevel(line),
      message: line,
    }));
  } catch {
    return [{ id: '0', timestamp: new Date().toISOString(), level: 'WARN', message: 'Docker logs not available' }];
  }
}

function parseJournalLogs(output, limit) {
  const lines = output.trim().split('\n').slice(-limit);

  return lines.map((line, i) => {
    try {
      // Try JSON format first
      const json = JSON.parse(line);
      return {
        id: `journal-${i}`,
        timestamp: new Date(parseInt(json.__REALTIME_TIMESTAMP) / 1000).toISOString().split('T')[1].split('.')[0],
        level: priorityToLevel(json.PRIORITY),
        message: json.MESSAGE || '',
        unit: json._SYSTEMD_UNIT || '',
      };
    } catch {
      // Plain text format
      const match = line.match(/^(\w+\s+\d+\s+[\d:]+)\s+(\S+)\s+(\S+):\s*(.*)$/);
      return {
        id: `journal-${i}`,
        timestamp: match?.[1] || new Date().toISOString().split('T')[1].split('.')[0],
        level: detectLogLevel(line),
        message: match?.[4] || line,
        unit: match?.[3] || '',
      };
    }
  });
}

function getLogFromFile(filepath, limit) {
  try {
    if (fs.existsSync(filepath)) {
      const output = execSync(`tail -n ${limit} ${filepath}`, { encoding: 'utf-8' });
      return output.trim().split('\n').map((line, i) => ({
        id: `file-${i}`,
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: detectLogLevel(line),
        message: line,
      }));
    }
  } catch {}
  return null;
}

function priorityToLevel(priority) {
  const levels = ['EMERG', 'ALERT', 'CRIT', 'ERROR', 'WARN', 'NOTICE', 'INFO', 'DEBUG'];
  return levels[parseInt(priority)] || 'INFO';
}

function detectLogLevel(text) {
  const upper = text.toUpperCase();
  if (upper.includes('ERROR') || upper.includes('FAIL') || upper.includes('CRIT')) return 'ERROR';
  if (upper.includes('WARN')) return 'WARN';
  if (upper.includes('DEBUG')) return 'DEBUG';
  return 'INFO';
}

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⚡ NEONPULSE SERVER MONITOR - BACKEND                   ║
║                                                           ║
║   Status:  ONLINE                                         ║
║   Port:    ${PORT}                                            ║
║   Time:    ${new Date().toISOString()}            ║
║                                                           ║
║   Allowed IPs: ${ALLOWED_IPS.slice(0, 3).join(', ')}${ALLOWED_IPS.length > 3 ? '...' : ''}
║                                                           ║
║   Endpoints:                                              ║
║     GET /api/stats     - System metrics                   ║
║     GET /api/info      - System information               ║
║     GET /api/logs      - System logs                      ║
║     GET /api/processes - Running processes                ║
║     GET /health        - Health check                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
