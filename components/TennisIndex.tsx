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
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 md:p-6 rounded-3xl border transition-all duration-700
        ${isEink ? 'bg-white border-black border-[1px] text-black' : 'bg-white/5 border-white/5'}`}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] uppercase tracking-[0.4em] font-bold opacity-30">Tennis Playability</span>
        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isEink ? '' : 'opacity-60'}`}>
          {data.status}
        </span>
      </div>

      <div className="space-y-3">
        <div className="h-[2px] w-full bg-current/10 relative overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data.score}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className={`absolute inset-y-0 left-0 ${isEink ? 'bg-black' : data.color}`}
          />
        </div>
        <div className="flex justify-between items-end">
          <p className={`text-2xl md:text-3xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-tight`}>
            {data.label}
          </p>
          <span className="text-[8px] opacity-40 uppercase tracking-[0.2em]">Sync {data.score}%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TennisIndex;