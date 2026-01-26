import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Moon, Wind, Tablet, Loader2, ExternalLink, Navigation, AlertCircle, Search, RefreshCw } from 'lucide-react';
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
      // Use process.env.API_KEY directly as per SDK guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
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
        contents: `Provide current weather for ${locationQuery}. If it is night, set condition to 'night'. Include temperature in Celsius, wind speed, humidity. Use Google Search grounding for real-time accuracy.`,
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
        setSources(chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })));
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      setError("Atmospheric sync failed.");
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
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [rH, rM] = activeWeather.sunrise.split(':').map(Number);
    const [sH, sM] = activeWeather.sunset.split(':').map(Number);
    return now >= (rH * 60 + rM) && now < (sH * 60 + sM);
  }, [activeWeather, currentTime]);

  const theme = useMemo(() => isEink ? { gradient: 'bg-white', text: 'text-black' } : (ATMOSPHERIC_THEMES[activeWeather.condition] || ATMOSPHERIC_THEMES.clear), [activeWeather.condition, isEink]);

  if (isLoading && !weather) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FDFCFB] text-stone-400 font-light tracking-[0.2em]">
        <Loader2 className="animate-spin mb-4 opacity-50" size={24} strokeWidth={1} />
        <p className="text-[10px] uppercase tracking-[0.5em]">Syncing Core...</p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-1000 flex flex-col overflow-x-hidden ${theme.text}`}>
      <AnimatePresence mode="wait">
        <motion.div key={isEink ? 'eink' : `${activeWeather.condition}-${isDaytime}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.gradient}`} />
      </AnimatePresence>

      <WeatherAnimations condition={!isDaytime && activeWeather.condition === 'clear' ? 'night' : activeWeather.condition} isEink={isEink} />

      <header className="relative z-10 p-10 md:p-14 flex justify-between items-start w-full">
        <div className="flex flex-col items-start">
          <span className="text-[10px] uppercase tracking-[0.6em] opacity-30 font-bold mb-2">Location</span>
          <button onClick={() => setShowSearch(!showSearch)} className="group text-left">
            <span className="text-[14px] md:text-[18px] uppercase tracking-[0.1em] font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              {activeWeather.location}
            </span>
          </button>
        </div>

        <div className="flex gap-4">
          <HeaderAction onClick={() => setShowSearch(!showSearch)} active={showSearch} isEink={isEink}><Search size={20} strokeWidth={1} /></HeaderAction>
          <HeaderAction onClick={handleLocate} disabled={isLocating} isEink={isEink}><Navigation size={20} strokeWidth={1} className={isLocating ? 'animate-pulse' : ''} /></HeaderAction>
          <HeaderAction onClick={() => setIsEink(!isEink)} active={isEink} isEink={isEink}><Tablet size={20} strokeWidth={1} /></HeaderAction>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-10 md:px-20 py-10">
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm mb-20">
              <form onSubmit={(e) => { e.preventDefault(); fetchWeather(undefined, undefined, manualSearch); }} className="flex gap-3 border-b border-current/20 pb-4 items-center">
                <input autoFocus type="text" placeholder="SYNC LOCATION..." value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} className="bg-transparent border-none outline-none flex-grow text-[11px] uppercase tracking-[0.4em] placeholder:opacity-20" />
                <button type="submit" className="opacity-40 hover:opacity-100"><Search size={18}/></button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-40 items-center">
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
              <h2 className={`text-[12rem] md:text-[18rem] leading-[0.7] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}>
                {Math.round(activeWeather.temp)}°
              </h2>
            </motion.div>

            <div className="mt-16 flex flex-col items-center lg:items-start">
              <span className="text-[12px] uppercase tracking-[0.8em] opacity-25 font-bold mb-4">Atmosphere</span>
              <h3 className={`text-6xl md:text-8xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-[0.1em] uppercase`}>
                {activeWeather.condition === 'night' ? 'Clear Night' : activeWeather.condition}
              </h3>
            </div>

            <p className={`mt-12 text-xl md:text-2xl max-w-md opacity-40 leading-relaxed ${isEink ? 'font-serif italic font-medium' : 'font-light'}`}>
              It's a {activeWeather.condition === 'night' ? 'calm night' : `${activeWeather.condition} sky`} in {activeWeather.location.split(',')[0]}.
            </p>
          </section>

          <section className="flex flex-col gap-14 w-full max-w-lg mx-auto lg:mx-0">
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

      <footer className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex gap-4 items-center">
          {sources.length > 0 ? (
            <a href={sources[0].uri} target="_blank" className="text-[10px] uppercase tracking-[0.4em] opacity-20 hover:opacity-100 flex items-center gap-2 transition-opacity">
              {sources[0].title.slice(0, 30)}... <ExternalLink size={12} />
            </a>
          ) : <span className="text-[10px] uppercase tracking-[0.4em] opacity-10">Zen established</span>}
        </div>
        
        <div className="flex gap-10 items-center">
          {error && <div className="flex items-center gap-2 text-red-500 text-[10px] uppercase tracking-[0.3em] font-bold"><AlertCircle size={12} /> {error}</div>}
          <span className="text-[10px] uppercase tracking-[0.6em] opacity-10 whitespace-nowrap">Zen core v1.9.0</span>
        </div>
      </footer>
    </div>
  );
};

const HeaderAction: React.FC<{ children: React.ReactNode, onClick: () => void, active?: boolean, disabled?: boolean, isEink: boolean }> = ({ children, onClick, active, disabled, isEink }) => (
  <button onClick={onClick} disabled={disabled} className={`p-4 rounded-full border transition-all duration-300 ${disabled ? 'opacity-20' : ''} ${isEink ? (active ? 'bg-black text-white border-black' : 'border-black hover:bg-black/5') : (active ? 'bg-current text-white border-current' : 'border-current/10 hover:border-current/30')}`}>
    {children}
  </button>
);

const StatCard: React.FC<{ label: string, value: string, isEink: boolean }> = ({ label, value, isEink }) => (
  <div className={`p-10 rounded-[3rem] border transition-all duration-500 ${isEink ? 'bg-white border-black text-black border-2' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
    <p className="text-[11px] uppercase tracking-[0.5em] opacity-30 mb-5 font-bold">{label}</p>
    <p className={`text-2xl ${isEink ? 'font-serif font-black' : 'font-light'}`}>{value}</p>
  </div>
);

export default App;