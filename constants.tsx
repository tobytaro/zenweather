
import { WeatherCondition } from './types';

export const ATMOSPHERIC_THEMES: Record<WeatherCondition, { gradient: string; text: string }> = {
  clear: {
    gradient: 'from-[#FDFCFB] to-[#E2D1C3]', // Hazy/Morning Peach
    text: 'text-stone-800'
  },
  cloudy: {
    gradient: 'from-[#D7DDE8] to-[#757F9A]', // Steel Blue
    text: 'text-slate-900'
  },
  rainy: {
    gradient: 'from-[#606c88] to-[#3f4c6b]', // Rainy Grey-Blue
    text: 'text-white'
  },
  night: {
    gradient: 'from-[#2C3E50] to-[#000000]', // Midnight Deep
    text: 'text-stone-200'
  },
  hazy: {
    gradient: 'from-[#8e9eab] to-[#eef2f3]', // Foggy White
    text: 'text-slate-700'
  }
};

export const MOCK_WEATHER: Record<string, any> = {
  current: {
    temp: 22,
    condition: 'clear',
    location: 'Basel, Switzerland',
    windSpeed: 8,
    humidity: 45,
    precipitation: 0
  },
  windy: {
    temp: 18,
    condition: 'hazy',
    location: 'Copenhagen, Denmark',
    windSpeed: 24,
    humidity: 60,
    precipitation: 0
  },
  rainy: {
    temp: 14,
    condition: 'rainy',
    location: 'London, UK',
    windSpeed: 15,
    humidity: 88,
    precipitation: 5.2
  }
};
