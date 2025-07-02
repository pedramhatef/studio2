export type SignalType = 'BUY' | 'SELL';
export type Sensitivity = 'Low' | 'Medium' | 'High';

export interface Signal {
  type: SignalType;
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
