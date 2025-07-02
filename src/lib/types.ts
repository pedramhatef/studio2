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
  high: number;
  low: number;
  close: number;
}
