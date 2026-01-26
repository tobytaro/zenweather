import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Cloud, CloudRain, Moon, Wind, Droplets, MapPin, Tablet, 
  RefreshCw, Loader2, ExternalLink, Sunrise, Sunset, Navigation, 
  AlertCircle, Target 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- TYPES ---

export type WeatherCondition = 'clear' | 'cloudy' | 'rainy' | 'night' | 'hazy';

export interface WeatherData {
  temp: number;
  condition: WeatherCondition;
  location: string;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  sunrise?: string;
  sunset?: string;
}

// --- CONSTANTS ---

const ATMOSPHERIC_THEMES: Record<WeatherCondition, { gradient: string; text: string }> = {
  clear: { gradient: 'from-[#FDFCFB] to-[#E2D1C3]', text: 'text-stone-800' },
  cloudy: { gradient: 'from-[#D7DDE8] to-[#757F9A]', text: 'text-slate-900' },
  rainy: { gradient: 'from-[#606c88] to-[#3f4c6b]', text: 'text-white' },
  night: { gradient: 'from-[#2C3E50] to-[#000000]', text: 'text-stone-200' },
  hazy: { gradient: 'from-[#8e9eab] to-[#eef2f3]', text: 'text-slate-700' }
};

const MOCK_WEATHER = {
  temp: 20,
  condition: 'clear' as WeatherCondition,
  location: 'Sensing Atmosphere...',
  windSpeed: 5,
  humidity: 50,
  precipitation: 0,
  sunrise: "06:00",
  sunset: "20:00"
};

// --- SUB-COMPONENTS ---

const GrainOverlay: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.04]">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
);

const WeatherAnimations: React.FC<{ condition: WeatherCondition; isEink: boolean }> = ({ condition, isEink }) => {
  if (condition === 'clear') return null;
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
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
      {condition === 'cloudy' && (
        <div className="absolute inset-0 opacity-30">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ x: ['-20%', '120%'], y: [Math.random() * 10, -10, 10] }}
              transition={{ duration: 40 + i * 10, repeat: Infinity, ease: "linear", delay: i * -15 }}
              style={{ width: '600px', height: '400px', filter: 'blur(100px)', borderRadius: '100%', top: `${20 + i * 20}%` }}
              className={`absolute ${isEink ? 'bg-stone-200' : 'bg-white/40'}`}
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
              className={`absolute w-1 h-1 rounded-full ${isEink ? 'bg-black' : 'bg-white/60'}`}
            />
          ))}
        </div>
      )}
      {condition === 'hazy' && (
        <div className="absolute inset-0 opacity-40">
          <motion.div
            animate={{ x: ['-5%', '5%', '-5%'], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{ filter: 'blur(80px)' }}
            className={`absolute inset-0 ${isEink ? 'bg-stone-100' : 'bg-white/20'}`}
          />
        </div>
      )}
    </div>
  );
};

const TennisIndex: React.FC<{ weather: WeatherData; isEink: boolean }> = ({ weather, isEink }) => {
  const getTennisVerdict = () => {
    const { windSpeed, temp, precipitation } = weather;
    if (precipitation > 0) return { status: "Courts likely wet", advice: "Avoid play. Risk of injury.", score: "Poor" };
    if (windSpeed > 20) return { status: "High winds", advice: "Focus on slice and footwork.", score: "Challenging" };
    if (temp >= 15 && temp <= 25 && windSpeed < 10) return { status: "Perfect Conditions", advice: "Ideal for baseline rallies.", score: "Elite" };
    return { status: "Playable", advice: "Solid conditions for a hit.", score: "Good" };
  };
  const verdict = getTennisVerdict();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl border ${isEink ? 'bg-white border-black text-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white/10 border-white/20 text-current'}`}
    >
      <div className="flex items-center gap-2 mb-4 opacity-60 text-xs uppercase tracking-[0.2em] font-light">
        <Target size={16} strokeWidth={1} />
        <span>Tennis Index</span>
      </div>
      <h3 className={`text-2xl mb-1 ${isEink ? 'font-serif italic font-bold' : 'font-light'}`}>{verdict.status}</h3>
      <p className="text-sm opacity-80 leading-relaxed font-light">{verdict.advice}</p>
      <div className="mt-4 pt-4 border-t border-current/10 flex justify-between items-center text-[10px] uppercase tracking-widest opacity-60">
        <span>Verdict</span>
        <span className={isEink ? 'font-bold' : 'font-medium'}>{verdict.score}</span>
      </div>
    </motion.div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, isEink: boolean }> = ({ icon, label, value, isEink }) => (
  <div className={`p-4 md:p-6 rounded-2xl border backdrop-blur-sm flex flex-col gap-3 ${isEink ? 'bg-white border-black text-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white/5 border-white/10'}`}>
    <div className="opacity-60">{icon}</div>
    <div>
      <p className="text-[9px] uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className={`text-lg ${isEink ? 'font-serif font-bold' : 'font-light'}`}>{value}</p>
    </div>
  </div>
);

// --- MAIN APP ---

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

  const fetchWeather = useCallback(async (locationHint?: string, lat?: number, lon?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let locationContext = lat && lon ? `at exactly: Latitude ${lat}, Longitude ${lon}. Find the nearest city.` : locationHint ? `in ${locationHint}.` : `for the user's current city.`;
      
      const prompt = `Find current weather ${locationContext}. Use Google Search. Return JSON: { "temp": number, "condition": "clear"|"cloudy"|"rainy"|"night"|"hazy", "location": "City, Country", "windSpeed": number, "humidity": number, "precipitation": number, "sunrise": "HH:MM", "sunset": "HH:MM" }. Set condition to "night" if currently dark. IMPORTANT: Avoid defaulting to Basel, Switzerland. Only return JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setWeather(JSON.parse(jsonMatch[0]));
      } else {
        throw new Error("Data error");
      }

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) setSources(chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })));
    } catch (err) {
      setError("Atmospheric sync error");
      if (!weather) setWeather(MOCK_WEATHER);
    } finally {
      setIsLoading(false);
      setIsLocating(false);
    }
  }, [weather]);

  const handleLocate = useCallback(async () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => fetchWeather(undefined, p.coords.latitude, p.coords.longitude),
        async () => {
          try {
            const r = await fetch('https://ipapi.co/json/');
            const d = await r.json();
            d.city ? fetchWeather(`${d.city}, ${d.country_name}`) : fetchWeather();
          } catch { fetchWeather(); }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else { fetchWeather(); }
  }, [fetchWeather]);

  useEffect(() => { handleLocate(); }, []);

  const activeWeather = weather || MOCK_WEATHER;
  const isDaytime = useMemo(() => {
    if (!activeWeather.sunrise || !activeWeather.sunset) return true;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [rH, rM] = activeWeather.sunrise.split(':').map(Number);
    const [sH, sM] = activeWeather.sunset.split(':').map(Number);
    return now >= (rH * 60 + rM) && now < (sH * 60 + sM);
  }, [activeWeather, currentTime]);

  const theme = isEink ? { gradient: 'bg-white', text: 'text-black' } : ATMOSPHERIC_THEMES[activeWeather.condition] || ATMOSPHERIC_THEMES.clear;

  if (isLoading && !weather) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 font-light tracking-[0.2em]">
        <Loader2 className="animate-spin mb-4" size={32} strokeWidth={1} />
        <p className="text-xs uppercase tracking-[0.3em]">{isLocating ? "Locating..." : "Sensing..."}</p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-1000 flex flex-col overflow-x-hidden ${theme.text}`}>
      <AnimatePresence mode="wait">
        <motion.div key={isEink ? 'eink' : `${activeWeather.condition}-${isDaytime}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.gradient}`} />
      </AnimatePresence>
      <WeatherAnimations condition={!isDaytime && activeWeather.condition === 'clear' ? 'night' : activeWeather.condition} isEink={isEink} />
      <GrainOverlay />
      <header className="relative z-10 p-6 md:p-12 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 opacity-60 text-[10px] md:text-xs uppercase tracking-[0.3em] font-light">
            <MapPin size={12} strokeWidth={1} />
            <span>{activeWeather.location}</span>
          </div>
          <h1 className={`text-lg md:text-xl tracking-tight ${isEink ? 'font-serif italic font-bold' : 'font-light'}`}>Atmo.</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLocate} className={`p-2 rounded-full border ${isEink ? 'border-black' : 'border-current/20'}`} disabled={isLocating}><Navigation size={18} strokeWidth={1} /></button>
          <button onClick={() => setIsEink(!isEink)} className={`p-2 rounded-full border ${isEink ? 'bg-black text-white' : 'border-current/20'}`}><Tablet size={18} strokeWidth={1} /></button>
        </div>
      </header>
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="mb-8 md:mb-10 opacity-80">
              {activeWeather.condition === 'clear' && <Sun size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'cloudy' && <Cloud size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'rainy' && <CloudRain size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'night' && <Moon size={64} strokeWidth={0.5} />}
              {activeWeather.condition === 'hazy' && <Wind size={64} strokeWidth={0.5} />}
            </div>
            <div className="relative inline-block">
              <h2 className={`text-[8rem] sm:text-[10rem] md:text-[14rem] leading-[0.8] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}>{activeWeather.temp}°</h2>
              <div className="absolute -top-12 md:-top-16 right-[-50px] md:right-[-90px]">
                <span className={`text-sm md:text-xl uppercase tracking-[0.4em] opacity-40 ${isEink ? 'font-bold' : 'font-light'}`}>{activeWeather.condition}</span>
              </div>
            </div>
            <p className={`mt-8 text-base md:text-xl max-w-sm opacity-70 ${isEink ? 'font-serif italic' : 'font-light'}`}>The air feels {activeWeather.temp > 20 ? 'warm' : 'crisp'} in {activeWeather.location.split(',')[0]}.</p>
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
      <footer className="relative z-10 p-6 md:p-12 flex flex-col md:flex-row justify-between items-center opacity-40 text-[8px] uppercase tracking-[0.4em] font-light gap-4">
        <div className="flex gap-4">{sources.slice(0, 2).map((s, i) => (<a key={i} href={s.uri} target="_blank" className="hover:underline">{s.title.toUpperCase()}</a>))}</div>
        <div className="flex gap-4"><span>{error && `(!) ${error}`}</span><span>Atmo // Zen v1.3.0</span></div>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
}
