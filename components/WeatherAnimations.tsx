
import React from 'react';
import { motion } from 'framer-motion';
import { WeatherCondition } from '../types';

interface AnimationProps {
  isEink: boolean;
}

const RainAnimation: React.FC<AnimationProps> = ({ isEink }) => {
  const drops = Array.from({ length: 30 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {drops.map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, x: `${Math.random() * 100}%` }}
          animate={{ y: '110vh' }}
          transition={{
            duration: 1.5 + Math.random() * 1,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2,
          }}
          className={`absolute w-[1px] h-12 ${isEink ? 'bg-black' : 'bg-white'}`}
        />
      ))}
    </div>
  );
};

const CloudyAnimation: React.FC<AnimationProps> = ({ isEink }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            x: ['-20%', '120%'],
            y: [Math.random() * 10, Math.random() * -10, Math.random() * 10],
          }}
          transition={{
            duration: 40 + i * 10,
            repeat: Infinity,
            ease: "linear",
            delay: i * -15,
          }}
          style={{
            width: '600px',
            height: '400px',
            filter: 'blur(100px)',
            borderRadius: '100%',
            top: `${20 + i * 20}%`,
          }}
          className={`absolute ${isEink ? 'bg-stone-200' : 'bg-white/40'}`}
        />
      ))}
    </div>
  );
};

const NightAnimation: React.FC<AnimationProps> = ({ isEink }) => {
  const stars = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: Math.random(),
            scale: Math.random() * 0.5 + 0.5,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`
          }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 2 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
          className={`absolute w-1 h-1 rounded-full ${isEink ? 'bg-black' : 'bg-white/60'}`}
        />
      ))}
    </div>
  );
};

const HazyAnimation: React.FC<AnimationProps> = ({ isEink }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
      <motion.div
        animate={{
          x: ['-5%', '5%', '-5%'],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ filter: 'blur(80px)' }}
        className={`absolute inset-0 ${isEink ? 'bg-stone-100' : 'bg-white/20'}`}
      />
    </div>
  );
};

const WeatherAnimations: React.FC<{ condition: WeatherCondition; isEink: boolean }> = ({ condition, isEink }) => {
  // Clear has no specific animation for ultra-minimalism, or just subtle light
  if (condition === 'clear') return null;

  return (
    <div className="fixed inset-0 z-0">
      {condition === 'rainy' && <RainAnimation isEink={isEink} />}
      {condition === 'cloudy' && <CloudyAnimation isEink={isEink} />}
      {condition === 'night' && <NightAnimation isEink={isEink} />}
      {condition === 'hazy' && <HazyAnimation isEink={isEink} />}
    </div>
  );
};

export default WeatherAnimations;
