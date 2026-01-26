import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Moon, Wind, Droplets, MapPin, Tablet, Loader2, ExternalLink, Sunrise, Sunset, Navigation, AlertCircle, Search, X, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
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
  const [manualSearch, setManualSearch] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeather = useCallback(async (lat?: number, lon?: number, locationHint?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("Configuration Error: API Key not detected in browser environment.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let locationQuery = "";
      if (lat !== undefined && lon !== undefined) {
        locationQuery = `at coordinates ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      } else if (locationHint) {
        locationQuery = `in ${locationHint}`;
      } else {
        locationQuery = `for the user's current city`;
      }

      const prompt = `Provide the current weather and atmospheric data ${locationQuery}. 
      Use the Google Search tool to ensure real-time accuracy. 
      If it is currently night time at the location, set condition to 'night'.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              temp: { type: Type.NUMBER, description: "Current temperature in Celsius" },
              condition: { 
                type: Type.STRING, 
                enum: ['clear', 'cloudy', 'rainy', 'night', 'hazy'],
                description: "Primary atmospheric condition"
              },
              location: { type: Type.STRING, description: "City and Country name" },
              windSpeed: { type: Type.NUMBER, description: "Wind speed in km/h" },
              humidity: { type: Type.NUMBER, description: "Humidity percentage" },
              precipitation: { type: Type.NUMBER, description: "Precipitation in mm" },
              sunrise: { type: Type.STRING, description: "Sunrise time in HH:MM format" },
              sunset: { type: Type.STRING, description: "Sunset time in HH:MM format" }
            },
            required: ["temp", "condition", "location", "windSpeed", "humidity", "precipitation"]
          }
        },
      });

      const data = JSON.parse(response.text) as WeatherData;
      setWeather(data);
      setShowSearch(false);
      setManualSearch('');

      // Extract grounding sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        setSources(groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
            title: c.web.title,
            uri: c.web.uri,
          })));
      }

    } catch (err: any) {
      console.error("Atmospheric sync error:", err);
      const isConfigError = err.message?.includes("Configuration");
      setError(isConfigError ? "Sync restricted. Use manual mode." : "Atmospheric sync failed.");
      
      if (!weather) setWeather(MOCK_WEATHER.current);
      // If it's not a key error, help them recover with manual search
      if (!isConfigError) setShowSearch(true);
    } finally {
      setIsLoading(false);
      setIsLocating(false);
    }
  }, [weather]);

  const handleLocate = useCallback(async () => {
    setIsLocating(true);
    setError(null);
    
    const geoOptions = {
      timeout: 6000,
      enableHighAccuracy: true,
      maximumAge: 0
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        async (geoErr) => {
          console.warn("Geolocation fallback triggered:", geoErr.message);
          try {
            // Try IP-based location services
            const res = await fetch('https://ip-api.com/json/');
            const data = await res.json();
            if (data.city) {
              fetchWeather(undefined, undefined, `${data.city}, ${data.country}`);
              return;
            }
            throw new Error("IP Lookup failed");
          } catch {
            setError("Location unavailable. Please search manually.");
            setIsLocating(false);
            setIsLoading(false);
            setShowSearch(true);
          }
        },
        geoOptions
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
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [riseH, riseM] = activeWeather.sunrise.split(':').map(Number);
    const [setH, setM] = activeWeather.sunset.split(':').map(Number);
    return nowMinutes >= (riseH * 60 + riseM) && nowMinutes < (setH * 60 + setM);
  }, [activeWeather, currentTime]);

  const theme = useMemo(() => {
    if (isEink) return { gradient: 'bg-white', text: 'text-black' };
    return ATMOSPHERIC_THEMES[activeWeather.condition] || ATMOSPHERIC_THEMES.clear;
  }, [activeWeather.condition, isEink]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSearch.trim()) {
      fetchWeather(undefined, undefined, manualSearch.trim());
    }
  };

  if (isLoading && !weather) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 font-light tracking-[0.2em]">
        <Loader2 className="animate-spin mb-4" size={32} strokeWidth={1} />
        <p className="text-[10px] uppercase tracking-[0.3em] animate-pulse">
          {isLocating ? 'Determining Coordinates...' : 'Syncing Atmosphere...'}
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
          <button 
            onClick={() => setShowSearch(!showSearch)} 
            className="flex items-center gap-2 group text-left outline-none"
          >
            <MapPin size={12} strokeWidth={1} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-light opacity-60 group-hover:opacity-100 transition-opacity">
              {activeWeather.location}
            </span>
          </button>
          <h1 className={`text-lg md:text-xl tracking-tight ${isEink ? 'font-serif italic font-bold' : 'font-light'}`}>
            Atmo.
          </h1>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full border transition-all ${showSearch ? 'bg-current text-white border-current' : isEink ? 'border-black' : 'border-current/20 hover:bg-white/10'}`}
          >
            <Search size={18} strokeWidth={1} />
          </button>
          <button 
            onClick={handleLocate} 
            disabled={isLocating}
            className={`p-2 rounded-full border transition-all ${isEink ? 'border-black' : 'border-current/20 hover:bg-white/10'}`}
          >
            <Navigation size={18} strokeWidth={1} className={isLocating ? 'animate-pulse' : ''} />
          </button>
          <button 
            onClick={() => setIsEink(!isEink)} 
            className={`p-2 rounded-full border transition-all ${isEink ? 'bg-black text-white' : 'border-current/20 hover:bg-white/10'}`}
          >
            <Tablet size={18} strokeWidth={1} />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-8">
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              className="w-full max-w-md mb-12 px-4"
            >
              <form onSubmit={handleManualSearch} className="flex gap-3 border-b border-current/30 pb-3 items-center">
                <Search size={16} className="opacity-40" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Enter City..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="bg-transparent border-none outline-none flex-grow text-sm uppercase tracking-widest placeholder:opacity-30"
                />
                {manualSearch.trim() && (
                  <button type="submit" className="text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1 bg-current text-white rounded-full">
                    Sync
                  </button>
                )}
                <button type="button" onClick={() => setShowSearch(false)} className="opacity-40 hover:opacity-100">
                  <X size={16} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div 
              key={activeWeather.condition}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8 md:mb-10 opacity-80"
            >
              {activeWeather.condition === 'clear' && <Sun size={80} strokeWidth={0.5} />}
              {activeWeather.condition === 'cloudy' && <Cloud size={80} strokeWidth={0.5} />}
              {activeWeather.condition === 'rainy' && <CloudRain size={80} strokeWidth={0.5} />}
              {activeWeather.condition === 'night' && <Moon size={80} strokeWidth={0.5} />}
              {activeWeather.condition === 'hazy' && <Wind size={80} strokeWidth={0.5} />}
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
              <div className="absolute -top-12 md:-top-16 right-[-40px] md:right-[-80px]">
                <span className={`text-xs md:text-lg uppercase tracking-[0.4em] opacity-40 ${isEink ? 'font-bold' : 'font-light'}`}>
                  {activeWeather.condition}
                </span>
              </div>
            </div>

            <p className={`mt-10 text-lg md:text-2xl max-w-sm opacity-70 ${isEink ? 'font-serif italic' : 'font-light'}`}>
              The air feels {activeWeather.temp > 22 ? 'warm' : activeWeather.temp < 15 ? 'chilly' : 'pleasant'} in {activeWeather.location.split(',')[0]}.
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

      <footer className="relative z-10 p-6 md:p-12 flex flex-col md:flex-row justify-between items-center opacity-50 text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-light gap-6">
        <div className="flex gap-6 overflow-x-auto max-w-full pb-2 md:pb-0 no-scrollbar">
          {sources.length > 0 ? sources.slice(0, 2).map((source, idx) => (
            <a key={idx} href={source.uri} target="_blank" className="hover:underline flex items-center gap-1 whitespace-nowrap">
              {source.title.toUpperCase()} <ExternalLink size={8} />
            </a>
          )) : <span>Atmospheric Grounding Active</span>}
        </div>
        <div className="flex gap-4 items-center whitespace-nowrap">
          {error && (
            <button onClick={() => setShowSearch(true)} className="flex items-center gap-2 text-red-500 font-bold hover:underline bg-red-500/5 px-3 py-1 rounded-full">
              <AlertCircle size={10}/> {error}
            </button>
          )}
          {!error && isLoading && <span className="flex items-center gap-2 opacity-80"><RefreshCw size={10} className="animate-spin"/> Syncing...</span>}
          <span>v1.5.0 // Zen Core</span>
        </div>
      </footer>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, isEink: boolean }> = ({ icon, label, value, isEink }) => (
  <div className={`p-5 md:p-6 rounded-2xl border backdrop-blur-md flex flex-col gap-3 transition-all duration-500
    ${isEink ? 'bg-white border-black text-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
    <div className="opacity-60">{icon}</div>
    <div>
      <p className="text-[9px] uppercase tracking-widest opacity-60 mb-1 font-medium">{label}</p>
      <p className={`text-xl ${isEink ? 'font-serif font-bold' : 'font-light'}`}>{value}</p>
    </div>
  </div>
);

export default App;