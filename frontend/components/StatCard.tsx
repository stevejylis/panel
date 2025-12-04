import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  percent?: number;
  color: 'cyan' | 'fuchsia' | 'green' | 'red' | 'yellow';
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, percent, color, icon }) => {
  const getColorClasses = (c: string) => {
    switch (c) {
      case 'fuchsia': return 'border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.2)] text-fuchsia-400';
      case 'green': return 'border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.2)] text-green-400';
      case 'red': return 'border-red-500/50 shadow-[0_0_10px_rgba(248,113,113,0.2)] text-red-400';
      case 'yellow': return 'border-yellow-500/50 shadow-[0_0_10px_rgba(250,204,21,0.2)] text-yellow-400';
      case 'cyan':
      default: return 'border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)] text-cyan-400';
    }
  };

  const colorClass = getColorClasses(color);
  
  // Progress bar color
  const getProgressColor = (c: string) => {
    switch (c) {
      case 'fuchsia': return 'bg-fuchsia-500';
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'cyan': default: return 'bg-cyan-500';
    }
  };

  return (
    <div className={`relative bg-slate-900/80 backdrop-blur-md border rounded-xl p-4 flex flex-col justify-between overflow-hidden group hover:bg-slate-800/80 transition-all duration-300 ${colorClass}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-gray-400 text-sm font-display tracking-widest uppercase">{title}</h3>
        {icon && <div className={`opacity-80 group-hover:opacity-100 transition-opacity`}>{icon}</div>}
      </div>
      
      <div className="flex items-end space-x-2">
        <span className="text-3xl font-bold font-mono text-white leading-none">{value}</span>
        {unit && <span className="text-sm text-gray-500 mb-1">{unit}</span>}
      </div>

      {percent !== undefined && (
        <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor(color)}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
      
      {/* Decorative corners */}
      <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l opacity-50 ${colorClass.split(' ')[0]}`}></div>
      <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r opacity-50 ${colorClass.split(' ')[0]}`}></div>
    </div>
  );
};

export default StatCard;
