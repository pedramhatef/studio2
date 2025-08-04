export type SignalType = 'BUY' | 'SELL';
export type SignalLevel = 'High' | 'Medium' | 'Low';
export type Sensitivity = 'Low' | 'Medium' | 'High';

export interface Signal {
  type: SignalType;
  level: SignalLevel;
  price: number;
  time: number;
  displayTime: string;
}

export interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValues {
  lastVolume: number;
  lastVolumeSMA: number | null;
  lastTrendEMA: number;
  lastTci: number;
  prevTci: number;
  lastWt2: number | null;
  prevWt2: number | null;
  lastMacd: number;
  lastMacdSignal: number;
  lastRsi: number | null;
  lastClose: number;
}
