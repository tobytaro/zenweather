import React from 'react';
import { motion } from 'framer-motion';
import { WeatherData } from '../types';

interface TennisIndexProps {
  weather: WeatherData;
  isEink: boolean;
}

const TennisIndex: React.FC<TennisIndexProps> = ({ weather, isEink }) => {
  const getTennisData = () => {
    const { windSpeed, temp, precipitation } = weather;
    if (precipitation > 0) return { status: "Courts Wet", score: 20, color: 'bg-red-400', label: 'Poor' };
    if (windSpeed > 25) return { status: "Too Windy", score: 40, color: 'bg-amber-400', label: 'Fair' };
    if (temp < 10 || temp > 35) return { status: "Extreme Temp", score: 50, color: 'bg-amber-400', label: 'Okay' };
    if (temp >= 18 && temp <= 24 && windSpeed < 10) return { status: "Elite Play", score: 100, color: 'bg-emerald-400', label: 'Perfect' };
    return { status: "Good Play", score: 80, color: 'bg-emerald-300', label: 'Solid' };
  };

  const data = getTennisData();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-10 rounded-[3rem] border transition-all duration-700
        ${isEink ? 'bg-white border-black text-black border-2' : 'bg-white/5 border-white/5'}`}
    >
      <div className="flex justify-between items-center mb-8">
        <span className="text-[11px] uppercase tracking-[0.5em] font-bold opacity-30">Tennis Index</span>
        <span className={`text-[11px] font-bold uppercase tracking-[0.3em] ${isEink ? '' : 'opacity-60'}`}>
          {data.status}
        </span>
      </div>

      <div className="space-y-6">
        <div className="h-[2px] w-full bg-current/10 relative overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data.score}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className={`absolute inset-y-0 left-0 ${isEink ? 'bg-black' : data.color}`}
          />
        </div>
        <div className="flex justify-between items-end">
          <p className={`text-4xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-tight`}>
            {data.label}
          </p>
          <span className="text-[10px] opacity-30 uppercase tracking-[0.3em] pb-1">Court Sync 100%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TennisIndex;