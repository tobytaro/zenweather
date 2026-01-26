
import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { WeatherData } from '../types';

interface TennisIndexProps {
  weather: WeatherData;
  isEink: boolean;
}

const TennisIndex: React.FC<TennisIndexProps> = ({ weather, isEink }) => {
  const getTennisVerdict = () => {
    const { windSpeed, temp, precipitation } = weather;
    
    if (precipitation > 0) {
      return {
        status: "Courts likely wet",
        advice: "Avoid play. Risk of injury and ball damage.",
        score: "Poor"
      };
    }
    
    if (windSpeed > 20) {
      return {
        status: "High winds detected",
        advice: "Focus on slice and footwork. Keep the margins big.",
        score: "Challenging"
      };
    }

    if (temp >= 15 && temp <= 25 && windSpeed < 10) {
      return {
        status: "Perfect Conditions",
        advice: "Great for baseline rallies and precise placement.",
        score: "Elite"
      };
    }

    if (temp > 30) {
      return {
        status: "High Heat",
        advice: "Hydrate well. Shorten the points with serve and volley.",
        score: "Fair"
      };
    }

    return {
      status: "Playable",
      advice: "Solid conditions for a casual hit.",
      score: "Good"
    };
  };

  const verdict = getTennisVerdict();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-700
        ${isEink 
          ? 'bg-white border-black text-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
          : 'bg-white/10 border-white/20 text-current'
        }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} strokeWidth={1} />
        <span className={`text-xs uppercase tracking-[0.2em] font-light ${isEink ? 'font-bold' : ''}`}>
          Tennis Playability
        </span>
      </div>
      
      <div className="mb-2">
        <h3 className={`text-2xl font-light mb-1 ${isEink ? 'font-serif italic font-bold' : ''}`}>
          {verdict.status}
        </h3>
        <p className="text-sm opacity-80 leading-relaxed font-light">
          {verdict.advice}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-current/10 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest opacity-60">Verdict Score</span>
        <span className={`text-sm ${isEink ? 'font-bold underline' : 'font-medium'}`}>{verdict.score}</span>
      </div>
    </motion.div>
  );
};

export default TennisIndex;
