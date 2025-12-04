import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SystemStats } from '../types';

interface NetworkGraphProps {
  data: SystemStats[];
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ data }) => {
  // Format data for chart
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    in: d.networkIn,
    out: d.networkOut,
    cpu: d.cpuLoad
  }));

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            tick={{fontSize: 10}}
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis stroke="#64748b" tick={{fontSize: 10}} width={30} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Area 
            type="monotone" 
            dataKey="in" 
            stroke="#22d3ee" 
            fillOpacity={1} 
            fill="url(#colorIn)" 
            name="Net RX (Mbps)"
            isAnimationActive={false} // Disable internal animation for smoother 'live' feeling updates
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="out" 
            stroke="#d946ef" 
            fillOpacity={1} 
            fill="url(#colorOut)" 
            name="Net TX (Mbps)"
            isAnimationActive={false}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NetworkGraph;
