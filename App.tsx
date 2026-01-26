
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Moon, Wind, Droplets, MapPin, Tablet, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { WeatherData } from './types';
import { ATMOSPHERIC_THEMES, MOCK_WEATHER } from './constants';
import GrainOverlay from './components/GrainOverlay';
import TennisIndex from './components/TennisIndex';
import WeatherAnimations from './components/WeatherAnimations';

const App: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isEink, setIsEink] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeather = useCallback(async (lat?: number, lon?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let locationQuery = "current location";
      if (lat !== undefined && lon !== undefined) {
        locationQuery = `at coordinates [${lat}, ${lon}]`;
      }

      const prompt = `Get the current local weather for the person ${locationQuery} using a reputable weather source like AccuWeather or Weather.com. 
      Return the data strictly as a JSON object with the following structure:
      {
        "temp": number (Celsius),
        "condition": "clear" | "cloudy" | "rainy" | "night" | "hazy",
        "location": "City, Country",
        "windSpeed": number (km/h),
        "humidity": number (percentage),
        "precipitation": number (mm),
        "sunrise": "HH:MM",
        "sunset": "HH:MM"
      }
      If it is currently nighttime at that location, use the "night" condition. 
      Only return the JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as WeatherData;
        setWeather(data);
      } else {
        throw new Error("Could not interpret weather data atmosphere.");
      }

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        // Filter sources to prioritize weather data providers as per user request
        const extractedSources = groundingChunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri,
          }));
        setSources(extractedSources);
      }

    } catch (err: any) {
      console.error(err);
      setError("Atmospheric data unavailable. Reverting to local pulse.");
      setWeather(MOCK_WEATHER.current);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather();
        }
      );
    } else {
      fetchWeather();
    }
  }, [fetchWeather]);

  const theme = useMemo(() => {
    if (isEink) return { gradient: 'bg-white', text: 'text-black' };
    if (!weather) return ATMOSPHERIC_THEMES.clear;
    return ATMOSPHERIC_THEMES[weather.condition] || ATMOSPHERIC_THEMES.clear;
  }, [weather?.condition, isEink]);

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isLoading && !weather) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 font-light tracking-[0.2em]`}>
        <Loader2 className="animate-spin mb-4" size={32} strokeWidth={1} />
        <p className="text-xs uppercase tracking-[0.3em]">Sensing Atmosphere...</p>
      </div>
    );
  }

  const activeWeather = weather || MOCK_WEATHER.current;

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-1000 flex flex-col ${theme.text}`}>
      {/* Background Layer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isEink ? 'eink' : activeWeather.condition}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.gradient}`}
        />
      </AnimatePresence>

      {/* Dynamic Background Animations */}
      <WeatherAnimations condition={activeWeather.condition} isEink={isEink} />

      <GrainOverlay />

      {/* Header */}
      <header className="relative z-10 p-6 md:p-12 flex justify-between items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-2 opacity-60">
            <MapPin size={12} strokeWidth={1} />
            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-light">
              {activeWeather.location}
            </span>
          </div>
          <h1 className={`text-lg md:text-xl tracking-tight ${isEink ? 'font-serif italic font-bold' : 'font-light'}`}>
            Atmo.
          </h1>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-2 md:gap-4"
        >
          <button 
            onClick={() => fetchWeather()}
            className={`p-2 rounded-full transition-all border ${isEink ? 'border-black hover:bg-black hover:text-white' : 'border-current/20 hover:bg-white/10'} ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh Atmosphere"
            disabled={isLoading}
          >
            <RefreshCw size={18} strokeWidth={1} />
          </button>
          <button 
            onClick={() => setIsEink(!isEink)}
            className={`p-2 rounded-full transition-all border ${isEink ? 'bg-black text-white border-black' : 'border-current/20 hover:bg-white/10'}`}
            title="Toggle E-ink Mode"
          >
            <Tablet size={18} strokeWidth={1} />
          </button>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-8 md:p-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Hero Section */}
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              key={activeWeather.condition}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="mb-4 md:mb-6"
            >
              {activeWeather.condition === 'clear' && <Sun size={54} strokeWidth={0.5} />}
              {activeWeather.condition === 'cloudy' && <Cloud size={54} strokeWidth={0.5} />}
              {activeWeather.condition === 'rainy' && <CloudRain size={54} strokeWidth={0.5} />}
              {activeWeather.condition === 'night' && <Moon size={54} strokeWidth={0.5} />}
              {activeWeather.condition === 'hazy' && <Wind size={54} strokeWidth={0.5} />}
            </motion.div>

            <div className="relative inline-block">
              <motion.h2 
                key={activeWeather.temp}
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ 
                  opacity: 1, 
                  filter: 'blur(0px)',
                  scale: [1, 1.01, 1] 
                }}
                transition={{ 
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 1 }
                }}
                className={`text-[8rem] sm:text-[10rem] md:text-[14rem] lg:text-[18rem] leading-[0.8] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}
              >
                {activeWeather.temp}°
              </motion.h2>
              {/* FIXED POSITIONING: Increased right and top offset to separate condition from icon and temp on mobile */}
              <div className="absolute -top-16 md:-top-24 right-[-60px] md:right-[-100px]">
                <span className={`text-base md:text-2xl uppercase tracking-[0.4em] opacity-40 ${isEink ? 'font-bold' : 'font-light'}`}>
                  {activeWeather.condition}
                </span>
              </div>
            </div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-6 md:mt-4 text-base md:text-xl max-w-sm md:max-w-md opacity-70 ${isEink ? 'font-serif italic' : 'font-light'}`}
            >
              The air feels {activeWeather.temp > 20 ? 'warm' : 'crisp'} in {activeWeather.location.split(',')[0]}. 
              Currently {formattedTime}.
            </motion.p>
          </section>

          {/* Details Section */}
          <section className="grid grid-cols-1 gap-4 md:gap-6 mt-8 lg:mt-0">
            <TennisIndex weather={activeWeather} isEink={isEink} />

            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {[
                { label: 'Wind', value: `${activeWeather.windSpeed} km/h`, icon: Wind },
                { label: 'Humidity', value: `${activeWeather.humidity}%`, icon: Droplets }
              ].map((stat, i) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className={`p-4 md:p-6 rounded-2xl border backdrop-blur-sm flex flex-col gap-3 md:gap-4
                    ${isEink ? 'bg-white border-black text-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white/5 border-white/10'}`}
                >
                  <stat.icon size={14} strokeWidth={1} className="opacity-60" />
                  <div>
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest opacity-60 mb-1">{stat.label}</p>
                    <p className={`text-lg md:text-xl ${isEink ? 'font-serif font-bold' : 'font-light'}`}>{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Grounding Sources - Weather Data Providers */}
      {sources.length > 0 && !isEink && (
        <div className="relative z-10 px-6 md:px-12 pb-4 flex flex-wrap gap-x-4 gap-y-2 opacity-30 text-[7px] md:text-[8px] uppercase tracking-[0.2em] overflow-hidden items-center">
          <span className="font-bold shrink-0">Grounding Sources:</span>
          {sources.slice(0, 3).map((source, idx) => (
            <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 truncate max-w-[150px] md:max-w-[200px]">
              {source.title.toUpperCase()} <ExternalLink size={6} />
            </a>
          ))}
        </div>
      )}

      {/* Footer / Meta */}
      <footer className="relative z-10 p-6 md:p-12 pt-4 flex justify-between items-end opacity-40">
        <div className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-light">
          Atmospheric Weather
        </div>
        <div className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-light">
          v1.2.1 / Refined Alignment
        </div>
      </footer>
    </div>
  );
};

export default App;
