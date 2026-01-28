
import React from 'react';
import { motion } from 'framer-motion';
import { WeatherCondition } from '../types';

const WeatherAnimations: React.FC<{ condition: WeatherCondition; isEink: boolean }> = ({ condition, isEink }) => {
  if (condition === 'clear') return null;
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {condition === 'rainy' && (
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -100, x: `${Math.random() * 100}%` }}
              animate={{ y: '110vh' }}
              transition={{ duration: 1.5 + Math.random(), repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
              className={`absolute w-[1px] h-12 ${isEink ? 'bg-black' : 'bg-white'}`}
            />
          ))}
        </div>
      )}
      {condition === 'night' && (
        <div className="absolute inset-0">
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: Math.random(), scale: Math.random() * 0.5 + 0.5, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + Math.random() * 4, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 5 }}
              className={`absolute w-[2px] h-[2px] rounded-full ${isEink ? 'bg-black' : 'bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WeatherAnimations;
