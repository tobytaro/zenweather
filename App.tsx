import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Moon, Wind, MapPin, Tablet, Loader2, ExternalLink, Navigation, AlertCircle, Search, RefreshCw, Key } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData } from './types';
import { ATMOSPHERIC_THEMES, MOCK_WEATHER } from './constants';
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
      // Use the injected API key directly.
      const apiKey = process.env.API_KEY;
      
      // Verification for the user to debug environment setup
      if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === '') {
        throw new Error("MISSING_API_KEY");
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
      setError(null);

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
      if (err.message === "MISSING_API_KEY") {
        setError("API_KEY not detected. Ensure it is set in your Cloudflare environment and that you have triggered a fresh deployment.");
      } else {
        setError(err.message || "Sync failed.");
      }
      
      if (!weather) setWeather(MOCK_WEATHER.current);
    } finally {
      setIsLoading(false);
      setIsLocating(false);
    }
  }, [weather]);

  const handleLocate = useCallback(async () => {
    setIsLocating(true);
    setError(null);
    const geoOptions = { timeout: 8000, enableHighAccuracy: true };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.city) {
              fetchWeather(undefined, undefined, `${data.city}, ${data.country_name}`);
              return;
            }
          } catch {
            setError("Location access denied.");
            setIsLocating(false);
            setIsLoading(false);
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
    if (manualSearch.trim()) fetchWeather(undefined, undefined, manualSearch.trim());
  };

  // Dedicated error screen for configuration issues
  if (error && error.includes("API_KEY not detected") && !weather) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFB] text-stone-600 p-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md flex flex-col items-center">
          <Key className="mb-8 opacity-20" size={48} strokeWidth={1} />
          <h2 className="text-2xl font-light tracking-tight mb-4">Sync Interrupted</h2>
          <p className="text-sm font-light opacity-60 leading-relaxed mb-8 uppercase tracking-[0.2em]">
            The environment variable <code className="bg-stone-100 px-2 py-1 rounded">API_KEY</code> is missing. Cloudflare requires a <strong>new deployment</strong> after saving changes to environment variables.
          </p>
          <div className="p-5 bg-stone-100 rounded-2xl text-[10px] uppercase tracking-widest font-bold flex flex-col items-center gap-3 w-full">
             <div className="flex items-center gap-2">
               <AlertCircle size={14} className="text-red-500" /> <span>Deployment required</span>
             </div>
          </div>
          <button onClick={() => window.location.reload()} className="mt-12 p-3 rounded-full border border-stone-200 hover:bg-stone-50 transition-all">
            <RefreshCw size={18} strokeWidth={1.5} className="opacity-40" />
          </button>
        </motion.div>
      </div>
    );
  }

  if (isLoading && !weather) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFB] text-stone-400 font-light tracking-[0.2em]">
        <Loader2 className="animate-spin mb-4 opacity-50" size={24} strokeWidth={1} />
        <p className="text-[9px] uppercase tracking-[0.4em] animate-pulse">
          {isLocating ? 'Determining Position...' : 'Syncing Atmosphere...'}
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
          transition={{ duration: 1.8 }}
          className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.gradient}`}
        />
      </AnimatePresence>

      <WeatherAnimations 
        condition={!isDaytime && activeWeather.condition === 'clear' ? 'night' : activeWeather.condition} 
        isEink={isEink} 
      />

      <header className="relative z-10 p-8 md:p-12 flex justify-between items-start w-full">
        <div className="flex flex-col items-start text-left">
          <span className="text-[9px] uppercase tracking-[0.5em] opacity-30 font-bold mb-2">
            Location
          </span>
          <button onClick={() => setShowSearch(!showSearch)} className="group outline-none text-left">
            <span className="text-[12px] md:text-[14px] uppercase tracking-[0.3em] font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              {activeWeather.location}
            </span>
          </button>
        </div>

        <div className="flex gap-4">
          <HeaderAction onClick={() => setShowSearch(!showSearch)} active={showSearch} isEink={isEink}>
            <Search size={18} strokeWidth={1.5} />
          </HeaderAction>
          <HeaderAction onClick={handleLocate} disabled={isLocating} isEink={isEink}>
            <Navigation size={18} strokeWidth={1.5} className={isLocating ? 'animate-pulse' : ''} />
          </HeaderAction>
          <HeaderAction onClick={() => setIsEink(!isEink)} active={isEink} isEink={isEink}>
            <Tablet size={18} strokeWidth={1.5} />
          </HeaderAction>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-10 py-6">
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full max-w-sm mb-16">
              <form onSubmit={handleManualSearch} className="flex gap-3 border-b border-current/20 pb-3 items-center">
                <input 
                  autoFocus
                  type="text"
                  placeholder="SEARCH LOCATION..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="bg-transparent border-none outline-none flex-grow text-[10px] uppercase tracking-[0.4em] placeholder:opacity-20"
                />
                <button type="submit" className="opacity-40 hover:opacity-100"><Search size={16}/></button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div key={activeWeather.condition} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.6, scale: 1 }} className="mb-8">
              <WeatherIcon condition={activeWeather.condition} />
            </motion.div>

            <div className="relative group">
              <motion.h2 
                key={activeWeather.temp}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-[12rem] md:text-[16rem] leading-[0.7] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}
              >
                {Math.round(activeWeather.temp)}°
              </motion.h2>
            </div>

            <div className="mt-16 flex flex-col items-center lg:items-start">
              <span className="text-[10px] uppercase tracking-[0.8em] opacity-25 font-bold mb-4">Atmosphere</span>
              <h3 className={`text-5xl md:text-7xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-[0.2em] uppercase`}>
                {activeWeather.condition === 'night' ? 'Clear Night' : activeWeather.condition}
              </h3>
            </div>

            <p className={`mt-12 text-xl md:text-2xl max-w-md opacity-40 leading-relaxed ${isEink ? 'font-serif italic font-medium' : 'font-light'}`}>
              It's a {activeWeather.condition === 'night' ? 'calm night' : `${activeWeather.condition} sky`} in {activeWeather.location.split(',')[0]}.
            </p>
          </section>

          <section className="flex flex-col gap-12 w-full max-w-md mx-auto lg:mx-0">
            <TennisIndex weather={activeWeather} isEink={isEink} />
            <div className="grid grid-cols-2 gap-8">
              <StatCard label="Wind" value={`${activeWeather.windSpeed} km/h`} isEink={isEink} />
              <StatCard label="Humidity" value={`${activeWeather.humidity}%`} isEink={isEink} />
              <StatCard label="Sunrise" value={activeWeather.sunrise || "--:--"} isEink={isEink} />
              <StatCard label="Sunset" value={activeWeather.sunset || "--:--"} isEink={isEink} />
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 p-10 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex gap-4 items-center">
          {sources.length > 0 ? (
            <a href={sources[0].uri} target="_blank" className="text-[10px] uppercase tracking-[0.4em] opacity-30 hover:opacity-100 flex items-center gap-2 transition-opacity">
              {sources[0].title.slice(0, 25)}... <ExternalLink size={12} />
            </a>
          ) : <span className="text-[10px] uppercase tracking-[0.4em] opacity-20">Grounding Active</span>}
        </div>
        
        <div className="flex gap-10 items-center">
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-[10px] uppercase tracking-[0.3em] font-bold">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          {!error && isLoading && <div className="flex items-center gap-2 opacity-30 text-[10px] uppercase tracking-[0.5em]"><RefreshCw size={12} className="animate-spin" /> Syncing</div>}
          <span className="text-[10px] uppercase tracking-[0.6em] opacity-10 whitespace-nowrap">Zen Core v1.7.0</span>
        </div>
      </footer>
    </div>
  );
};

const HeaderAction: React.FC<{ children: React.ReactNode, onClick: () => void, active?: boolean, disabled?: boolean, isEink: boolean }> = ({ children, onClick, active, disabled, isEink }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`p-3 rounded-full border transition-all duration-300 ${disabled ? 'opacity-20' : ''} 
    ${isEink ? (active ? 'bg-black text-white border-black' : 'border-black hover:bg-black/5') : (active ? 'bg-current text-white border-current' : 'border-current/10 hover:border-current/30')}`}
  >
    {children}
  </button>
);

const WeatherIcon: React.FC<{ condition: string }> = ({ condition }) => {
  const props = { size: 72, strokeWidth: 0.5 };
  switch(condition) {
    case 'clear': return <Sun {...props} />;
    case 'cloudy': return <Cloud {...props} />;
    case 'rainy': return <CloudRain {...props} />;
    case 'night': return <Moon {...props} />;
    default: return <Wind {...props} />;
  }
};

const StatCard: React.FC<{ label: string, value: string, isEink: boolean }> = ({ label, value, isEink }) => (
  <div className={`p-10 rounded-[2.5rem] border transition-all duration-500
    ${isEink ? 'bg-white border-black text-black border-2' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
    <p className="text-[10px] uppercase tracking-[0.5em] opacity-30 mb-4 font-bold">{label}</p>
    <p className={`text-2xl ${isEink ? 'font-serif font-black' : 'font-light'}`}>{value}</p>
  </div>
);

export default App;