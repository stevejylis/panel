import React from 'react';
import { AIAnalysis } from '../types';

interface AIAnalystProps {
  analysis: AIAnalysis;
  onAnalyze: () => void;
}

const AIAnalyst: React.FC<AIAnalystProps> = ({ analysis, onAnalyze }) => {
  return (
    <div className="relative bg-black/60 border border-slate-700 rounded-xl p-4 flex flex-col h-full overflow-hidden">
        {/* Background Grid Animation Effect */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4 z-10">
        <div className="flex items-center space-x-2">
           <div className={`w-3 h-3 rounded-full ${analysis.status === 'analyzing' ? 'animate-ping bg-indigo-400' : 'bg-indigo-500'}`}></div>
           <h3 className="text-indigo-400 font-display tracking-wider">C.O.R.E. AI ANALYTICS</h3>
        </div>
        <button 
          onClick={onAnalyze}
          disabled={analysis.status === 'analyzing'}
          className={`px-4 py-1 text-xs font-bold uppercase tracking-widest rounded border transition-all duration-300
            ${analysis.status === 'analyzing' 
                ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-900/40 border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
            }`}
        >
          {analysis.status === 'analyzing' ? 'PROCESSING...' : 'RUN DIAGNOSTIC'}
        </button>
      </div>

      <div className="flex-1 bg-slate-900/50 rounded-lg p-4 border border-slate-800/50 overflow-y-auto z-10 font-mono text-sm leading-relaxed relative">
        {analysis.content ? (
            <p className="text-slate-300 type-writer-effect">
                <span className="text-indigo-500 mr-2">{'>'}</span>
                {analysis.content}
            </p>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                <p>Awaiting Diagnostics Request</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalyst;
