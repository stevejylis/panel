import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
}

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black/90 border border-slate-700 rounded-lg p-0 flex flex-col h-full font-mono text-xs shadow-inner">
      <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800 rounded-t-lg">
        <span className="text-gray-500">root@neon-server:~# tail -f /var/log/syslog</span>
        <div className="flex space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
          <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 scroll-smooth"
      >
        {logs.map((log) => (
          <div key={log.id} className="flex space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-slate-500 whitespace-nowrap">[{log.timestamp}]</span>
            <span className={`${
              log.level === 'ERROR' ? 'text-red-500 font-bold' :
              log.level === 'WARN' ? 'text-yellow-400' :
              log.level === 'SYSTEM' ? 'text-cyan-400' :
              'text-green-400'
            } w-12 shrink-0`}>
              {log.level}
            </span>
            <span className="text-slate-300 break-all">{log.message}</span>
          </div>
        ))}
        <div className="animate-pulse text-cyan-500 font-bold">_</div>
      </div>
    </div>
  );
};

export default Terminal;
