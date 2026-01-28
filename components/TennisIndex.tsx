
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
    if (precipitation > 0) return { status: "COURTS WET", score: 20, color: 'bg-red-400', label: 'Poor' };
    if (windSpeed > 25) return { status: "TOO WINDY", score: 40, color: 'bg-amber-400', label: 'Fair' };
    if (temp < 10 || temp > 35) return { status: "EXTREME TEMP", score: 50, color: 'bg-amber-400', label: 'Okay' };
    if (temp >= 18 && temp <= 24 && windSpeed < 10) return { status: "ELITE PLAY", score: 100, color: 'bg-emerald-400', label: 'Perfect' };
    return { status: "GOOD PLAY", score: 80, color: 'bg-emerald-300', label: 'Solid' };
  };

  const data = getTennisData();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 md:p-8 rounded-[2rem] transition-all duration-700
        ${isEink ? 'bg-white border-black text-black border-2' : 'bg-stone-800/5'}`}
    >
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[9px] uppercase tracking-[0.4em] font-bold opacity-30">Tennis Playability</span>
        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isEink ? '' : 'opacity-40'}`}>
          {data.status}
        </span>
      </div>

      <div className="h-[1.5px] w-full bg-current/10 relative mb-6">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${data.score}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={`absolute inset-y-0 left-0 ${isEink ? 'bg-black' : 'bg-[#2FD1A6]'}`}
        />
      </div>

      <div className="flex justify-between items-baseline">
        <p className={`text-3xl md:text-4xl ${isEink ? 'font-serif font-black italic' : 'font-[300]'} tracking-tight`}>
          {data.label}
        </p>
        <div className="text-right">
          <span className="text-[9px] opacity-40 uppercase tracking-[0.3em] font-bold">Sync {data.score}%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TennisIndex;
