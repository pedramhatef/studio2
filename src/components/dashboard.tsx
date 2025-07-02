'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CryptoChart } from './crypto-chart';
import { SignalHistory } from './signal-history';
import type { ChartDataPoint, Signal } from '@/lib/types';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getChartData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const DATA_REFRESH_INTERVAL = 1000; // 1 second

// --- WaveTrend Parameters ---
const WT_CHANNEL_LENGTH = 10;
const WT_AVERAGE_LENGTH = 21;
const WT_SIGNAL_LENGTH = 4;

// Helper to calculate Exponential Moving Average (EMA) similar to Pine Script's 'ema'
const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  if (data.length > 0) {
    emaArray[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      const prevEma = emaArray[i - 1];
      emaArray[i] = data[i] * k + prevEma * (1 - k);
    }
  }
  return emaArray;
};

// Helper to calculate Simple Moving Average (SMA)
const calculateSMA = (data: number[], period: number): (number | null)[] => {
  const smaArray: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return smaArray;

  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    smaArray[i] = sum / period;
  }
  return smaArray;
};

export function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDataAndGenerateSignal = useCallback(async () => {
    try {
      const formattedData = await getChartData();
      const requiredDataLength = WT_CHANNEL_LENGTH + WT_AVERAGE_LENGTH;

      if (!formattedData || formattedData.length < requiredDataLength) {
        if (chartData.length === 0) {
          toast({
            variant: "destructive",
            title: "Fetching data...",
            description: "Waiting for enough data to generate signals.",
          });
        }
        return;
      }
      
      setChartData(formattedData);

      // --- Signal Generation Logic using WaveTrend ---
      const ap = formattedData.map(p => (p.high + p.low + p.close) / 3);
      
      const esa = calculateEMA(ap, WT_CHANNEL_LENGTH);
      const d = calculateEMA(ap.map((val, i) => Math.abs(val - esa[i])), WT_CHANNEL_LENGTH);
      
      const ci = ap.map((val, i) => {
          if (d[i] === 0) return 0;
          return (val - esa[i]) / (0.015 * d[i]);
      });
      
      const tci = calculateEMA(ci, WT_AVERAGE_LENGTH); // WaveTrend 1
      const wt2 = calculateSMA(tci, WT_SIGNAL_LENGTH); // WaveTrend 2 (Signal)

      if (tci.length < 2 || wt2.length < 2) return;

      // --- Crossover Detection ---
      const lastTci = tci[tci.length - 1];
      const prevTci = tci[tci.length - 2];
      const lastWt2 = wt2[wt2.length - 1];
      const prevWt2 = wt2[wt2.length - 2];
      
      if (lastTci === null || prevTci === null || lastWt2 === null || prevWt2 === null) return;

      const lastSignalType = signals.length > 0 ? signals[0].type : null;
      const lastDataPoint = formattedData[formattedData.length - 1];
      
      // BUY Condition: tci crosses above wt2
      if (prevTci < prevWt2 && lastTci > lastWt2 && lastSignalType !== 'BUY') {
        const newSignal: Signal = {
          type: 'BUY',
          price: lastDataPoint.close,
          time: lastDataPoint.time,
          displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };
        setSignals(prevSignals => [newSignal, ...prevSignals].slice(0, 15));
      } 
      // SELL Condition: tci crosses below wt2
      else if (prevTci > prevWt2 && lastTci < lastWt2 && lastSignalType !== 'SELL') {
        const newSignal: Signal = {
          type: 'SELL',
          price: lastDataPoint.close,
          time: lastDataPoint.time,
          displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };
        setSignals(prevSignals => [newSignal, ...prevSignals].slice(0, 15));
      }

    } catch (error) {
      console.error("Error processing data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [toast, chartData.length, signals]);

  useEffect(() => {
    fetchDataAndGenerateSignal();
    const intervalId = setInterval(fetchDataAndGenerateSignal, DATA_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchDataAndGenerateSignal]);

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
              <CardDescription>1-minute price data from MEXC. Signals are generated using the WaveTrend oscillator and are for demonstration only.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && chartData.length === 0 ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <CryptoChart data={chartData} signals={signals} />
          )}
        </CardContent>
      </Card>
      <SignalHistory signals={signals} />
    </div>
  );
}
