import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Moon, Wind, Droplets, MapPin, Tablet, Loader2, ExternalLink, Sunrise, Sunset, Navigation, AlertCircle } from 'lucide-react';
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
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeather = useCallback(async (lat?: number, lon?: number, locationHint?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let locationContext = "";
      if (lat !== undefined && lon !== undefined) {
        locationContext = `at exactly these coordinates: Latitude ${lat}, Longitude ${lon}. Find the nearest city.`;
      } else if (locationHint) {
        locationContext = `in ${locationHint}.`;
      } else {
        locationContext = `for the user's current city based on their internet metadata.`;
      }

      const prompt = `Find the current local weather ${locationContext}. 
      Use Google Search for real-time accurate data.
      IMPORTANT: Do NOT default to Basel, Switzerland unless the user is actually there.
      
      Return ONLY a JSON object:
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
      Set condition to "night" if it is dark outside there right now.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as WeatherData;
        setWeather(data);
      } else {
        throw new Error("Sync failed.");
      }

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        setSources(groundingChunks.filter((c: any) => c.web).map((c: any) => ({
          title: c.web.title,
          uri: c.web.uri,
        })));
      }

    } catch (err: any) {
      console.error("Atmospheric sync error:", err);
      setError("Atmospheric sync failed.");
      if (!weather) setWeather(MOCK_WEATHER.current);
    } finally {
      setIsLoading(false);
      setIsLocating(false);
    }
  }, [weather]);

  const handleLocate = useCallback(async () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
        },
        async (geoError) => {
          console.warn("GPS access failed. Trying IP fallback...", geoError.message);
          try {
            const ipResponse = await fetch('https://ipapi.co/json/');
            const ipData = await ipResponse.json();
            if (ipData.city) {
              fetchWeather(undefined, undefined, `${ipData.city}, ${ipData.country_name}`);
            } else {
              fetchWeather();
            }
          } catch {
            fetchWeather();
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      fetchWeather();
    }
  }, [fetchWeather]);

  useEffect(() => {
    handleLocate();
  }, []);

  const activeWeather = weather || MOCK_WEATHER.current;

  const isDaytime = useMemo(() => {
    if (!activeWeather.sunrise || !activeWeather.sunset) return true;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [riseH, riseM] = activeWeather.sunrise.split(':').map(Number);
    const [setH, setM] = activeWeather.sunset.split(':').map(Number);
    return now >= (riseH * 60 + riseM) && now < (setH * 60 + setM);
  }, [activeWeather, currentTime]);

  const theme = useMemo(() => {
    if (isEink) return { gradient: 'bg-white', text: 'text-black' };
    const condition = activeWeather.condition;
    return ATMOSPHERIC_THEMES[condition] || ATMOSPHERIC_THEMES.clear;
  }, [activeWeather.condition, isEink]);

  if (isLoading && !weather) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 font-light tracking-[0.2em]">
        <Loader2 className="animate-spin mb-4" size={32} strokeWidth={1} />
        <p className="text-xs uppercase tracking-[0.3em] px-10 text-center">
          {isLocating ? "Acquiring Coordinates..." : "Sensing Atmosphere..."}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-1000 flex flex-col overflow-x-hidden ${theme.text}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isEink ? 'eink' : `${activeWeather.condition}-${isDaytime}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.gradient}`}
        />
      </AnimatePresence>

      <WeatherAnimations 
        condition={!isDaytime && activeWeather.condition === 'clear' ? 'night' : activeWeather.condition} 
        isEink={isEink} 
      />

      <GrainOverlay />

      <header className="relative z-10 p-6 md:p-12 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 opacity-60">
            <MapPin size={12} strokeWidth={1} />
            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-light">
              {activeWeather.location}
            </span>
          </div>
          <h1 className={`text-lg md:text-xl tracking-tight ${isEink ? 'font-serif italic font-bold' : 'font-light'}`}>
            Atmo.
          </h1>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleLocate}
            disabled={isLocating}
            className={`p-2 rounded-full transition-all border ${isEink ? 'border-black' : 'border-current/20 hover:bg-white/10'}`}
          >
            <Navigation size={18} strokeWidth={1} className={isLocating ? 'animate-pulse' : ''} />
          </button>
          <button 
            onClick={() => setIsEink(!isEink)}
            className={`p-2 rounded-full transition-all border ${isEink ? 'bg-black text-white' : 'border-current/20 hover:bg-white/10'}`}
          >
            <Tablet size={18} strokeWidth={1} />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              key={activeWeather.condition}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8 md:mb-10"
            >
              {activeWeather.condition === 'clear' && <Sun size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'cloudy' && <Cloud size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'rainy' && <CloudRain size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'night' && <Moon size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'hazy' && <Wind size={64} strokeWidth={0.5} />}
            </motion.div>

            <div className="relative inline-block">
              <motion.h2 
                key={activeWeather.temp}
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                className={`text-[8rem] sm:text-[10rem] md:text-[14rem] leading-[0.8] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}
              >
                {activeWeather.temp}°
              </motion.h2>
              <div className="absolute -top-16 md:-top-20 right-[-60px] md:right-[-100px]">
                <span className={`text-sm md:text-xl uppercase tracking-[0.4em] opacity-40 ${isEink ? 'font-bold' : 'font-light'}`}>
                  {activeWeather.condition}
                </span>
              </div>
            </div>

            <p className={`mt-8 text-base md:text-xl max-w-sm opacity-70 ${isEink ? 'font-serif italic' : 'font-light'}`}>
              It's {isDaytime ? 'a' : 'a quiet'} {activeWeather.condition} {isDaytime ? 'day' : 'night'} in {activeWeather.location.split(',')[0]}.
            </p>
          </section>

          <section className="flex flex-col gap-6 w-full">
            <TennisIndex weather={activeWeather} isEink={isEink} />
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={<Wind size={14}/>} label="Wind" value={`${activeWeather.windSpeed} km/h`} isEink={isEink} />
              <StatCard icon={<Droplets size={14}/>} label="Humidity" value={`${activeWeather.humidity}%`} isEink={isEink} />
              <StatCard icon={<Sunrise size={14}/>} label="Sunrise" value={activeWeather.sunrise || "--:--"} isEink={isEink} />
              <StatCard icon={<Sunset size={14}/>} label="Sunset" value={activeWeather.sunset || "--:--"} isEink={isEink} />
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 p-6 md:p-12 pt-4 flex flex-col md:flex-row justify-between items-center opacity-40 text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-light gap-4">
        <div className="flex gap-4">
          {sources.slice(0, 2).map((source, idx) => (
            <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
              {source.title.toUpperCase()}
            </a>
          ))}
        </div>
        <div className="flex gap-4 items-center">
          {error && <span className="flex items-center gap-1 text-red-400 font-bold"><AlertCircle size={10}/> {error}</span>}
          <span>v1.2.7 // Zen Experience</span>
        </div>
      </footer>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, isEink: boolean }> = ({ icon, label, value, isEink }) => (
  <div className={`p-4 md:p-6 rounded-2xl border backdrop-blur-sm flex flex-col gap-3
    ${isEink ? 'bg-white border-black text-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white/5 border-white/10'}`}>
    <div className="opacity-60">{icon}</div>
    <div>
      <p className="text-[9px] uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className={`text-lg ${isEink ? 'font-serif font-bold' : 'font-light'}`}>{value}</p>
    </div>
  </div>
);

export default App;