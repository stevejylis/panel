export interface SystemStats {
  timestamp: number;
  cpuLoad: number;
  cpuCores?: number;
  ramUsage: number;
  ramTotal: number;
  ramPercent?: number;
  gpuLoad: number;
  temperature: number;
  temperatureMax?: number;
  networkIn: number; // Mbps
  networkOut: number; // Mbps
  networkInterface?: string;
  diskUsage: number;
  diskUsed?: number;
  diskTotal?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SYSTEM' | 'DEBUG' | 'CRIT' | 'ALERT' | 'EMERG' | 'NOTICE';
  message: string;
  unit?: string;
}

export interface AIAnalysis {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  content: string;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  distro: string;
  release: string;
  kernel: string;
  arch: string;
  uptime: number;
  uptimeFormatted: string;
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speed: number;
    speedMax: number;
  };
  system: {
    manufacturer: string;
    model: string;
    virtual: boolean;
  };
  memory: Array<{
    size: number;
    type: string;
    clockSpeed: number;
  }>;
  disks: Array<{
    name: string;
    type: string;
    size: number;
  }>;
}
