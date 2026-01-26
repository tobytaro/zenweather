
export type WeatherCondition = 'clear' | 'cloudy' | 'rainy' | 'night' | 'hazy';

export interface WeatherData {
  temp: number;
  condition: WeatherCondition;
  location: string;
  windSpeed: number; // km/h
  humidity: number;
  precipitation: number; // mm
  sunrise?: string;
  sunset?: string;
}

export interface AppState {
  weather: WeatherData;
  isEink: boolean;
  isUnitCelsius: boolean;
}
