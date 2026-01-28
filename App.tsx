
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Moon, Wind, Tablet, Loader2, Navigation, Search, Droplets, Sunrise, Sunset } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { WeatherData, WeatherCondition } from './types';
import { ATMOSPHERIC_THEMES, MOCK_WEATHER } from './constants';
import TennisIndex from './components/TennisIndex';
import WeatherAnimations from './components/WeatherAnimations';
import GrainOverlay from './components/GrainOverlay';

const CACHE_KEY = 'open_meteo_weather_cache_v4';
const CACHE_DURATION = 30 * 60 * 1000; 

const AtmoLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="23" cy="9" r="4" />
  </svg>
);

const App: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isEink, setIsEink] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualSearch, setManualSearch] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  
  const initialFetchCalled = useRef(false);

  useEffect(() => {
    document.body.classList.add('app-mounted');
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const mapWmoCodeToCondition = (code: number, isDay: boolean): WeatherCondition => {
    if (!isDay) return 'night';
    if (code <= 1) return 'clear';
    if (code <= 3) return 'cloudy';
    if (code === 45 || code === 48) return 'hazy';
    return 'rainy';
  };

  const fetchWeather = useCallback(async (lat: number, lon: number, locationName: string = "MEIXIAN", force = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=auto`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather service unavailable");
      
      const data = await response.json();
      const current = data.current;
      const daily = data.daily;

      const weatherData: WeatherData = {
        temp: current.temperature_2m,
        condition: mapWmoCodeToCondition(current.weather_code, current.is_day === 1),
        location: locationName.toUpperCase(),
        windSpeed: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        sunrise: daily.sunrise[0].split('T')[1],
        sunset: daily.sunset[0].split('T')[1]
      };

      setWeather(weatherData);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ 
        data: weatherData, 
        timestamp: Date.now(),
        lat,
        lon
      }));
      setShowSearch(false);
    } catch (err: any) {
      console.error(err);
      setError("Sync Failed");
      if (!weather) setWeather(MOCK_WEATHER.current);
    } finally {
      setIsLoading(false);
      setIsLocating(false);
    }
  }, [weather]);

  const searchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearch.trim()) return;
    
    setIsLoading(true);
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(manualSearch)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        setError("Location not found");
        setIsLoading(false);
        return;
      }

      const { latitude, longitude, name } = geoData.results[0];
      fetchWeather(latitude, longitude, name, true);
    } catch (err) {
      setError("Search failed");
      setIsLoading(false);
    }
  };

  const handleLocate = useCallback(async (force = false) => {
    setIsLocating(true);
    
    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION && data.location !== "CURRENT LOCATION") {
          setWeather(data);
          setIsLoading(false);
          setIsLocating(false);
          return;
        }
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          let cityName = "Current Location";
          
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `What is the name of the city/town at latitude ${lat} and longitude ${lon}? Return ONLY the short name of the city (max 2 words), no punctuation or extra words. Example: New York, Paris, Tokyo.`,
              config: {
                temperature: 0.1,
              }
            });
            
            const result = response.text?.trim();
            if (result && result.length < 50) {
              cityName = result;
            }
          } catch (e) {
            console.error("Gemini reverse geocoding failed", e);
          }
          
          fetchWeather(lat, lon, cityName, true);
        },
        (err) => {
          console.error("Geolocation error", err);
          setError("Location Denied");
          fetchWeather(24.288, 116.117, "MEIXIAN", true);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setError("No Geolocation");
      fetchWeather(24.288, 116.117, "MEIXIAN", true);
    }
  }, [fetchWeather]);

  useEffect(() => {
    if (!initialFetchCalled.current) {
      initialFetchCalled.current = true;
      handleLocate(false);
    }
  }, [handleLocate]);

  const activeWeather = weather || MOCK_WEATHER.current;
  
  const theme = useMemo(() => 
    isEink ? { gradient: 'bg-white', text: 'text-black' } : 
    (ATMOSPHERIC_THEMES[activeWeather.condition] || ATMOSPHERIC_THEMES.clear), 
  [activeWeather.condition, isEink]);

  const WeatherIcon = ({ condition, size = 48 }: { condition: WeatherCondition, size?: number }) => {
    const props = { size, strokeWidth: 1, className: "opacity-40 mb-6 lg:mb-8" };
    switch (condition) {
      case 'clear': return <Sun {...props} />;
      case 'cloudy': return <Cloud {...props} />;
      case 'rainy': return <CloudRain {...props} />;
      case 'night': return <Moon {...props} />;
      case 'hazy': return <Wind {...props} />;
      default: return <Sun {...props} />;
    }
  };

  if (isLoading && !weather) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB] text-stone-400">
        <AtmoLogo className="w-8 h-8 mb-6 opacity-20" />
        <Loader2 className="animate-spin mb-4" size={24} strokeWidth={1} />
        <p className="text-[10px] uppercase tracking-[0.5em]">Establishing Sync...</p>
      </div>
    );
  }

  const formattedCity = activeWeather.location.split(',')[0].trim().toUpperCase();

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-1000 flex flex-col overflow-hidden ${theme.text}`}>
      <GrainOverlay />
      <AnimatePresence mode="wait">
        <motion.div 
          key={isEink ? 'eink' : activeWeather.condition} 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 1.5 }} 
          className={`fixed inset-0 z-0 bg-gradient-to-br ${theme.gradient}`} 
        />
      </AnimatePresence>

      <WeatherAnimations condition={activeWeather.condition} isEink={isEink} />

      <header className="relative z-20 px-6 py-6 md:px-12 md:py-10 flex justify-between items-start w-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <AtmoLogo className="w-2.5 h-2.5 opacity-30" />
            <span className="text-[8px] uppercase tracking-[0.5em] opacity-30 font-bold">Atmosphere</span>
          </div>
          <div className="flex flex-col">
            <button onClick={() => setShowSearch(!showSearch)} className="group text-left">
              <span className="text-lg md:text-xl uppercase tracking-[0.3em] font-normal opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {formattedCity}
              </span>
            </button>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <HeaderAction onClick={() => setShowSearch(!showSearch)} active={showSearch} isEink={isEink}><Search size={18} /></HeaderAction>
          <HeaderAction onClick={() => handleLocate(true)} disabled={isLocating} isEink={isEink}>
            <Navigation size={18} className={isLocating ? 'animate-spin' : ''} />
          </HeaderAction>
          <HeaderAction onClick={() => setIsEink(!isEink)} active={isEink} isEink={isEink}><Tablet size={18} /></HeaderAction>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 md:px-20 py-8">
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="absolute top-24 z-30 w-full max-w-sm px-6"
            >
              <form onSubmit={searchCity} className="flex gap-3 border-b border-current/20 pb-2.5 items-center bg-transparent">
                <input autoFocus type="text" placeholder="Search City..." value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} className="bg-transparent border-none outline-none flex-grow text-[11px] uppercase tracking-[0.3em] placeholder:opacity-20" />
                <button type="submit" className="opacity-40 hover:opacity-100"><Search size={14}/></button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-24 items-center">
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <WeatherIcon condition={activeWeather.condition} size={64} />
            <h2 className={`text-[7rem] md:text-[10rem] leading-[0.75] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}>
              {Math.round(activeWeather.temp)}°
            </h2>
            <h3 className={`mt-4 text-2xl md:text-5xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-[0.25em] uppercase opacity-70`}>
              {activeWeather.condition}
            </h3>
          </section>

          <section className="flex flex-col gap-5 w-full max-w-md mx-auto lg:mx-0">
            <TennisIndex weather={activeWeather} isEink={isEink} />
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Wind" value={`${Math.round(activeWeather.windSpeed)} km/h`} icon={<Wind size={14} strokeWidth={1.5}/>} isEink={isEink} />
              <StatCard label="Humidity" value={`${activeWeather.humidity}%`} icon={<Droplets size={14} strokeWidth={1.5}/>} isEink={isEink} />
              <StatCard label="Sunrise" value={activeWeather.sunrise || "07:02"} icon={<Sunrise size={14} strokeWidth={1.5}/>} isEink={isEink} />
              <StatCard label="Sunset" value={activeWeather.sunset || "18:08"} icon={<Sunset size={14} strokeWidth={1.5}/>} isEink={isEink} />
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 p-6 md:px-12 md:py-10 flex justify-between items-center text-[7px] uppercase tracking-[0.6em] opacity-30">
        <div className="flex items-center gap-4">
          <AtmoLogo className="w-2.5 h-2.5" />
          <span>SOURCE: OPEN-METEO</span>
        </div>
        
        <div className="flex gap-8 items-center">
          {error && <div className="text-red-500 font-bold tracking-[0.1em]">{error}</div>}
          <span className="whitespace-nowrap font-medium">ZEN v2.1.0</span>
        </div>
      </footer>
    </div>
  );
};

const HeaderAction: React.FC<{ children: React.ReactNode, onClick: () => void, active?: boolean, disabled?: boolean, isEink: boolean }> = ({ children, onClick, active, disabled, isEink }) => (
  <button onClick={onClick} disabled={disabled} className={`p-1 transition-all duration-300 ${disabled ? 'opacity-20 cursor-not-allowed' : 'opacity-40 hover:opacity-100'} ${active && !disabled ? 'opacity-100 scale-110' : ''}`}>
    {children}
  </button>
);

const StatCard: React.FC<{ label: string, value: string, icon?: React.ReactNode, isEink: boolean }> = ({ label, value, icon, isEink }) => (
  <div className={`p-5 md:p-7 rounded-[2rem] transition-all flex flex-col justify-between ${isEink ? 'bg-white border-black text-black border-2' : 'bg-stone-800/5'}`}>
    <div className="flex justify-between items-start mb-4">
      <p className="text-[9px] uppercase tracking-[0.3em] font-bold opacity-30">{label}</p>
      <span className="opacity-30">{icon}</span>
    </div>
    <p className={`text-2xl md:text-3xl ${isEink ? 'font-serif font-black' : 'font-[300]'} tracking-tight`}>{value}</p>
  </div>
);

export default App;
