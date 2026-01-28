
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Moon, Wind, Tablet, Loader2, Navigation, Search, Droplets } from 'lucide-react';
import { WeatherData, WeatherCondition } from './types';
import { ATMOSPHERIC_THEMES, MOCK_WEATHER } from './constants';
import TennisIndex from './components/TennisIndex';
import WeatherAnimations from './components/WeatherAnimations';

const CACHE_KEY = 'open_meteo_weather_cache_v4';
const CACHE_DURATION = 30 * 60 * 1000; 

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
    return 'rainy'; // Covers rain, snow, storms, etc.
  };

  const fetchWeather = useCallback(async (lat: number, lon: number, locationName: string = "Current Location", force = false) => {
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
        location: locationName,
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

      const { latitude, longitude, name, country } = geoData.results[0];
      fetchWeather(latitude, longitude, `${name}, ${country}`, true);
    } catch (err) {
      setError("Search failed");
      setIsLoading(false);
    }
  };

  const handleLocate = useCallback(() => {
    setIsLocating(true);
    // Check Cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp, lat, lon } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setWeather(data);
        setIsLoading(false);
        setIsLocating(false);
        return;
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "Current Location", true),
        () => fetchWeather(40.7128, -74.006, "New York", true), // Fallback
        { timeout: 8000 }
      );
    } else {
      fetchWeather(40.7128, -74.006, "New York", true);
    }
  }, [fetchWeather]);

  useEffect(() => {
    if (!initialFetchCalled.current) {
      initialFetchCalled.current = true;
      handleLocate();
    }
  }, [handleLocate]);

  const activeWeather = weather || MOCK_WEATHER.current;
  
  const theme = useMemo(() => 
    isEink ? { gradient: 'bg-white', text: 'text-black' } : 
    (ATMOSPHERIC_THEMES[activeWeather.condition] || ATMOSPHERIC_THEMES.clear), 
  [activeWeather.condition, isEink]);

  const WeatherIcon = ({ condition, size = 48 }: { condition: WeatherCondition, size?: number }) => {
    const props = { size, strokeWidth: 1.2, className: "opacity-60 mb-2 md:mb-4" };
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
        <Loader2 className="animate-spin mb-4" size={24} strokeWidth={1} />
        <p className="text-[10px] uppercase tracking-[0.5em]">Establishing Sync...</p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-1000 flex flex-col overflow-hidden ${theme.text}`}>
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

      <header className="relative z-10 px-6 py-4 md:px-12 md:py-8 flex justify-between items-center w-full">
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-[0.5em] opacity-40 font-bold mb-0.5">Atmosphere</span>
          <button onClick={() => setShowSearch(!showSearch)} className="group text-left">
            <span className="text-[14px] md:text-[18px] uppercase tracking-[0.1em] font-medium opacity-70 group-hover:opacity-100 transition-opacity">
              {activeWeather.location.split(',')[0]}
            </span>
          </button>
        </div>

        <div className="flex gap-2.5">
          <HeaderAction onClick={() => setShowSearch(!showSearch)} active={showSearch} isEink={isEink}><Search size={16} /></HeaderAction>
          <HeaderAction onClick={handleLocate} disabled={isLocating} isEink={isEink}><Navigation size={16} className={isLocating ? 'animate-pulse' : ''} /></HeaderAction>
          <HeaderAction onClick={() => setIsEink(!isEink)} active={isEink} isEink={isEink}><Tablet size={16} /></HeaderAction>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 md:px-20 -mt-8 py-10">
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} 
              className="w-full max-w-sm mb-6"
            >
              <form onSubmit={searchCity} className="flex gap-3 border-b border-current/20 pb-2.5 items-center">
                <input autoFocus type="text" placeholder="Search City..." value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} className="bg-transparent border-none outline-none flex-grow text-[11px] uppercase tracking-[0.3em] placeholder:opacity-20" />
                <button type="submit" className="opacity-40 hover:opacity-100"><Search size={14}/></button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center">
          <section className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <WeatherIcon condition={activeWeather.condition} size={64} />
            <h2 className={`text-[7.5rem] md:text-[12rem] leading-[0.8] tracking-tighter ${isEink ? 'font-serif font-black' : 'font-[100]'}`}>
              {Math.round(activeWeather.temp)}°
            </h2>
            <h3 className={`mt-4 text-3xl md:text-6xl ${isEink ? 'font-serif font-black italic' : 'font-[200]'} tracking-[0.2em] uppercase opacity-80`}>
              {activeWeather.condition}
            </h3>
          </section>

          <section className="flex flex-col gap-5 w-full max-w-md mx-auto lg:mx-0">
            <TennisIndex weather={activeWeather} isEink={isEink} />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Wind" value={`${Math.round(activeWeather.windSpeed)} km/h`} icon={<Wind size={12}/>} isEink={isEink} />
              <StatCard label="Humidity" value={`${activeWeather.humidity}%`} icon={<Droplets size={12}/>} isEink={isEink} />
              <StatCard label="Sunrise" value={activeWeather.sunrise || "06:00"} isEink={isEink} />
              <StatCard label="Sunset" value={activeWeather.sunset || "20:00"} isEink={isEink} />
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 p-6 md:px-12 md:py-8 flex justify-between items-center text-[7px] uppercase tracking-[0.5em] opacity-40">
        <div className="flex gap-4 items-center">
          <span>Source: Open-Meteo (No API Key Required)</span>
        </div>
        
        <div className="flex gap-6 items-center">
          {error && <div className="text-red-500 font-bold tracking-[0.1em]">{error}</div>}
          <span className="whitespace-nowrap font-medium tracking-[0.2em]">ZEN v2.0.0</span>
        </div>
      </footer>
    </div>
  );
};

const HeaderAction: React.FC<{ children: React.ReactNode, onClick: () => void, active?: boolean, disabled?: boolean, isEink: boolean }> = ({ children, onClick, active, disabled, isEink }) => (
  <button onClick={onClick} disabled={disabled} className={`p-2 rounded-full border transition-all duration-300 ${disabled ? 'opacity-20' : ''} ${isEink ? (active ? 'bg-black text-white border-black' : 'border-black hover:bg-black/5') : (active ? 'bg-current text-white border-current' : 'border-current/10 hover:border-current/30')}`}>
    {children}
  </button>
);

const StatCard: React.FC<{ label: string, value: string, icon?: React.ReactNode, isEink: boolean }> = ({ label, value, icon, isEink }) => (
  <div className={`p-4 rounded-3xl border transition-all ${isEink ? 'bg-white border-black text-black border-2' : 'bg-white/5 border-white/5'}`}>
    <div className="flex justify-between items-center mb-2 opacity-30">
      <p className="text-[8px] uppercase tracking-[0.3em] font-bold">{label}</p>
      {icon}
    </div>
    <p className={`text-base md:text-lg ${isEink ? 'font-serif font-black' : 'font-light'}`}>{value}</p>
  </div>
);

export default App;
