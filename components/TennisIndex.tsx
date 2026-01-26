import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { WeatherData } from '../types';

interface TennisIndexProps {
  weather: WeatherData;
  isEink: boolean;
}

const TennisIndex: React.FC<TennisIndexProps> = ({ weather, isEink }) => {
  const getTennisData = () => {
    const { windSpeed, temp, precipitation } = weather;
    if (precipitation > 0) return { status: "Courts Wet", score: 20, color: 'bg-red-400' };
    if (windSpeed > 25) return { status: "Too Windy", score: 40, color: 'bg-amber-400' };
    if (temp < 10 || temp > 35) return { status: "Extreme Temp", score: 50, color: 'bg-amber-400' };
    if (temp >= 18 && temp <= 24 && windSpeed < 10) return { status: "Elite Play", score: 100, color: 'bg-emerald-400' };
    return { status: "Good Play", score: 80, color: 'bg-emerald-300' };
  };

  const data = getTennisData();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-8 rounded-[2.5rem] border transition-all duration-700
        ${isEink ? 'bg-white border-black text-black border-2' : 'bg-white/5 border-white/5'}`}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Target size={16} strokeWidth={1} className="opacity-40" />
          <span className="text-[9px] uppercase tracking-[0.4em] font-medium opacity-40">Tennis Index</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isEink ? '' : 'opacity-60'}`}>
          {data.status}
        </span>
      </div>

      <div className="space-y-4">
        <div className="h-[2px] w-full bg-current/10 relative overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data.score}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className={`absolute inset-y-0 left-0 ${isEink ? 'bg-black' : data.color}`}
          />
        </div>
        <div className="flex justify-between items-end">
          <p className={`text-3xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-tight`}>
            {data.score === 100 ? 'Perfect' : data.score >= 80 ? 'Solid' : 'Poor'}
          </p>
          <span className="text-[10px] opacity-30 uppercase tracking-widest pb-1">Court Sync 100%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TennisIndex;