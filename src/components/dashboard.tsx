'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CryptoChart } from './crypto-chart';
import { SignalHistory } from './signal-history';
import type { ChartDataPoint, Signal, Sensitivity } from '@/lib/types';
import { BarChart2 } from 'lucide-react';

const SENSITIVITY_SETTINGS = {
  Low: { probability: 0.05, interval: 2000 },
  Medium: { probability: 0.15, interval: 1500 },
  High: { probability: 0.3, interval: 1000 },
};

export function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('Medium');
  
  const generateNewDataPoint = useCallback((lastPrice: number): ChartDataPoint => {
    const time = Date.now();
    const change = (Math.random() - 0.5) * (lastPrice * 0.015);
    const newPrice = Math.max(lastPrice + change, 0.01);
    return { time, price: newPrice };
  }, []);

  useEffect(() => {
    const initialData: ChartDataPoint[] = [];
    let lastPrice = 0.15;
    const now = Date.now();
    for (let i = 50; i > 0; i--) {
      const point = generateNewDataPoint(lastPrice);
      initialData.push({ ...point, time: now - i * SENSITIVITY_SETTINGS.Medium.interval });
      lastPrice = point.price;
    }
    setChartData(initialData);
  }, [generateNewDataPoint]);

  useEffect(() => {
    const { probability, interval } = SENSITIVITY_SETTINGS[sensitivity];
    const timer = setInterval(() => {
      setChartData(prevData => {
        const lastPoint = prevData[prevData.length - 1] || { price: 0.15, time: Date.now() };
        const newDataPoint = generateNewDataPoint(lastPoint.price);
        const newChartData = [...prevData.slice(1), newDataPoint];

        if (Math.random() < probability) {
          const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
          const newSignal: Signal = {
            type,
            price: newDataPoint.price,
            time: newDataPoint.time,
            displayTime: new Date(newDataPoint.time).toLocaleTimeString(),
          };
          setSignals(prevSignals => [newSignal, ...prevSignals].slice(0, 15));
        }
        return newChartData;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [sensitivity, generateNewDataPoint]);

  return (
    <div className="grid gap-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6" />
                DOGE/USDT Real-Time Signals
              </CardTitle>
              <CardDescription>Aggressive signals for 100x leverage trades. For demonstration purposes only.</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Label className="font-semibold">Sensitivity:</Label>
              <RadioGroup
                defaultValue="Medium"
                onValueChange={(value: string) => setSensitivity(value as Sensitivity)}
                className="flex items-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Low" id="low" />
                  <Label htmlFor="low">Low</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Medium" id="medium" />
                  <Label htmlFor="medium">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="High" id="high" />
                  <Label htmlFor="high">High</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CryptoChart data={chartData} signals={signals} />
        </CardContent>
      </Card>
      <SignalHistory signals={signals} />
    </div>
  );
}
