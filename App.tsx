import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tablet, Loader2, Navigation, AlertCircle, Search, Sun, Cloud, CloudRain, Moon, Wind, Droplets } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, WeatherCondition } from './types';
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
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");
      
      const ai = new GoogleGenAI({ apiKey });
      
      let locationQuery = "";
      if (lat !== undefined && lon !== undefined) {
        locationQuery = `at coordinates ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      } else if (locationHint) {
        locationQuery = `in ${locationHint}`;
      } else {
        locationQuery = `for the user's current city`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide current weather for ${locationQuery}. If night, set condition to 'night'. Include temp (C), wind, humidity, precip, sunrise/sunset. Use Google Search grounding.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              temp: { type: Type.NUMBER },
              condition: { type: Type.STRING, enum: ['clear', 'cloudy', 'rainy', 'night', 'hazy'] },
              location: { type: Type.STRING },
              windSpeed: { type: Type.NUMBER },
              humidity: { type: Type.NUMBER },
              precipitation: { type: Type.NUMBER },
              sunrise: { type: Type.STRING },
              sunset: { type: Type.STRING }
            },
            required: ["temp", "condition", "location", "windSpeed", "humidity", "precipitation"]
          }
        },
      });

      const data = JSON.parse(response.text) as WeatherData;
      setWeather(data);
      setShowSearch(false);
      setError(null);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setSources(chunks.filter((c: any) => c.web).map((c: any) => ({ 
          title: c.web.title || "Reference", 
          uri: c.web.uri 
        })));
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      const errMsg = err.message || "";
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
        setError("Quota Exceeded.");
      } else if (errMsg === "API_KEY_MISSING") {
        setError("Key Needed.");
      } else {
        setError("Sync failed.");
      }
      if (!weather) setWeather(MOCK_WEATHER.current);
    } finally {
      setIsLoading(false);
      setIsLocating(false);
    }
  }, [weather]);

  const handleLocate = useCallback(() => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(),
        { timeout: 8000 }
      );
    } else fetchWeather();
  }, [fetchWeather]);

  useEffect(() => { handleLocate(); }, []);

  const activeWeather = weather || MOCK_WEATHER.current;
  
  const isDaytime = useMemo(() => {
    if (!activeWeather.sunrise || !activeWeather.sunset) return true;
    try {
      const now = currentTime.getHours() * 60 + currentTime.getMinutes();
      const [rH, rM] = activeWeather.sunrise.split(':').map(Number);
      const [sH, sM] = activeWeather.sunset.split(':').map(Number);
      return now >= (rH * 60 + rM) && now < (sH * 60 + sM);
    } catch { return true; }
  }, [activeWeather, currentTime]);

  const theme = useMemo(() => 
    isEink ? { gradient: 'bg-[#FDFCFB]', text: 'text-black' } : 
    (ATMOSPHERIC_THEMES[activeWeather.condition] || ATMOSPHERIC_THEMES.clear), 
  [activeWeather.condition, isEink]);

  const WeatherIcon = ({ condition, size = 24 }: { condition: WeatherCondition, size?: number }) => {
    switch (condition) {
      case 'clear': return <Sun size={size} strokeWidth={1.5} />;
      case 'cloudy': return <Cloud size={size} strokeWidth={1.5} />;
      case 'rainy': return <CloudRain size={size} strokeWidth={1.5} />;
      case 'night': return <Moon size={size} strokeWidth={1.5} />;
      case 'hazy': return <Wind size={size} strokeWidth={1.5} />;
      default: return <Sun size={size} strokeWidth={1.5} />;
    }
  };

  if (isLoading && !weather) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFB] text-stone-400 font-light tracking-[0.2em]">
        <Loader2 className="animate-spin mb-4 opacity-50" size={24} strokeWidth={1} />
        <p className="text-[11px] uppercase tracking-[0.5em]">Syncing Atmosphere...</p>
      </div>
    );
  }

  return (
    <div className={`relative h-screen w-full transition-colors duration-1000 flex flex-col overflow-hidden ${theme.text}`}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={isEink ? 'eink' : `${activeWeather.condition}-${isDaytime}`} 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 1.5 }} 
          className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.gradient}`} 
        />
      </AnimatePresence>

      <WeatherAnimations 
        condition={!isDaytime && activeWeather.condition === 'clear' ? 'night' : activeWeather.condition} 
        isEink={isEink} 
      />

      <header className="relative z-10 px-6 py-4 md:px-12 md:py-10 flex justify-between items-center w-full">
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-[0.6em] opacity-40 font-bold mb-1">Atmosphere</span>
          <button onClick={() => setShowSearch(!showSearch)} className="group text-left">
            <span className="text-[12px] md:text-[18px] uppercase tracking-[0.15em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">
              {activeWeather.location.split(',')[0]}
            </span>
          </button>
        </div>

        <div className="flex gap-3">
          <HeaderAction onClick={() => setShowSearch(!showSearch)} active={showSearch} isEink={isEink}><Search size={16} /></HeaderAction>
          <HeaderAction onClick={handleLocate} disabled={isLocating} isEink={isEink}><Navigation size={16} className={isLocating ? 'animate-pulse' : ''} /></HeaderAction>
          <HeaderAction onClick={() => setIsEink(!isEink)} active={isEink} isEink={isEink}><Tablet size={16} /></HeaderAction>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 md:px-20 overflow-hidden">
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-xs mb-6">
              <form onSubmit={(e) => { e.preventDefault(); fetchWeather(undefined, undefined, manualSearch); }} className="flex gap-3 border-b border-current/20 pb-2 items-center">
                <input autoFocus type="text" placeholder="Locate..." value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} className="bg-transparent border-none outline-none flex-grow text-[10px] uppercase tracking-[0.4em] placeholder:opacity-20" />
                <button type="submit" className="opacity-40 hover:opacity-100"><Search size={14}/></button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center">
          <section className="flex flex-col items-center md:items-start text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center md:items-start"
            >
              <div className="mb-4 opacity-40">
                <WeatherIcon condition={activeWeather.condition} size={48} />
              </div>
              <h2 className={`text-[7rem] md:text-[10rem] leading-[0.8] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}>
                {Math.round(activeWeather.temp)}°
              </h2>
              <div className="mt-6">
                <h3 className={`text-3xl md:text-5xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-[0.2em] uppercase opacity-80`}>
                  {activeWeather.condition}
                </h3>
              </div>
            </motion.div>
          </section>

          <section className="flex flex-col gap-4 w-full max-w-[340px] mx-auto md:mx-0">
            <TennisIndex weather={activeWeather} isEink={isEink} />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Wind" value={`${activeWeather.windSpeed} km`} icon={<Wind size={10} />} isEink={isEink} />
              <StatCard label="Hum" value={`${activeWeather.humidity}%`} icon={<Droplets size={10} />} isEink={isEink} />
              <StatCard label="Sunrise" value={activeWeather.sunrise || "06:00"} isEink={isEink} />
              <StatCard label="Sunset" value={activeWeather.sunset || "20:00"} isEink={isEink} />
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 md:px-12 md:py-10 flex flex-row justify-between items-center text-[8px] uppercase tracking-[0.5em] opacity-40">
        <div className="flex gap-4">
          {sources.length > 0 ? (
            <a href={sources[0].uri} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 flex items-center gap-1 transition-opacity">
              {sources[0].title.slice(0, 12)}...
            </a>
          ) : <span>Atmo State: Synced</span>}
        </div>
        
        <div className="flex gap-6 items-center">
          {error && <div className="text-red-500 font-bold tracking-[0.2em]">{error}</div>}
          <span className="whitespace-nowrap font-medium">Core v1.9.5</span>
        </div>
      </footer>
    </div>
  );
};

const HeaderAction: React.FC<{ children: React.ReactNode, onClick: () => void, active?: boolean, disabled?: boolean, isEink: boolean }> = ({ children, onClick, active, disabled, isEink }) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    className={`p-2 rounded-full border transition-all duration-300 ${disabled ? 'opacity-20' : ''} ${isEink ? (active ? 'bg-black text-white border-black' : 'border-black hover:bg-black/5') : (active ? 'bg-current text-white border-current' : 'border-current/10 hover:border-current/30')}`}
  >
    {children}
  </button>
);

const StatCard: React.FC<{ label: string, value: string, icon?: React.ReactNode, isEink: boolean }> = ({ label, value, icon, isEink }) => (
  <div className={`p-4 rounded-3xl border transition-all duration-500 flex flex-col justify-between ${isEink ? 'bg-white border-black border-[1px]' : 'bg-white/5 border-white/5'}`}>
    <div className="flex justify-between items-center mb-2 opacity-40">
       <p className="text-[7px] uppercase tracking-[0.3em] font-bold">{label}</p>
       {icon}
    </div>
    <p className={`text-base md:text-lg ${isEink ? 'font-serif font-black' : 'font-light'}`}>{value}</p>
  </div>
);

export default App;
