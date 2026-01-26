import { WeatherCondition } from './types';

export const ATMOSPHERIC_THEMES: Record<WeatherCondition, { gradient: string; text: string }> = {
  clear: {
    gradient: 'from-[#FDFCFB] to-[#E2D1C3]',
    text: 'text-stone-800'
  },
  cloudy: {
    gradient: 'from-[#D7DDE8] to-[#757F9A]',
    text: 'text-slate-900'
  },
  rainy: {
    gradient: 'from-[#606c88] to-[#3f4c6b]',
    text: 'text-white'
  },
  night: {
    gradient: 'from-[#2C3E50] to-[#000000]',
    text: 'text-stone-200'
  },
  hazy: {
    gradient: 'from-[#8e9eab] to-[#eef2f3]',
    text: 'text-slate-700'
  }
};

export const MOCK_WEATHER: Record<string, any> = {
  current: {
    temp: 22,
    condition: 'clear',
    location: 'Acquiring Location...',
    windSpeed: 8,
    humidity: 45,
    precipitation: 0,
    sunrise: "06:15",
    sunset: "20:30"
  }
};