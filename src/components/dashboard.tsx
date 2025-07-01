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

// Helper to calculate Exponential Moving Average (EMA)
const calculateEMA = (data: number[], period: number): (number | null)[] => {
  if (data.length < period) return new Array(data.length).fill(null);
  
  const k = 2 / (period + 1);
  const emaArray: (number | null)[] = new Array(data.length).fill(null);

  // First EMA is the SMA of the first 'period' data points
  let sma = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  emaArray[period - 1] = sma;

  // Calculate subsequent EMAs
  for (let i = period; i < data.length; i++) {
    const prevEma = emaArray[i - 1];
    if (prevEma !== null) {
      emaArray[i] = (data[i] * k) + (prevEma * (1 - k));
    }
  }
  
  return emaArray;
};


export function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDataAndGenerateSignal = useCallback(async () => {
    try {
      const formattedData = await getChartData();

      if (!formattedData || formattedData.length === 0) {
        if (chartData.length === 0) {
          toast({
            variant: "destructive",
            title: "Error fetching data",
            description: "Could not fetch chart data. Retrying...",
          });
        }
        return;
      }
      
      setChartData(formattedData);

      // --- Signal Generation Logic using MACD Crossover ---
      if (formattedData.length < 35) return; // Not enough data for MACD(12,26,9)

      const prices = formattedData.map(p => p.price);
      
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);

      const macdLine = ema26.map((slow, i) => {
          if (slow !== null && ema12[i] !== null) {
              return ema12[i]! - slow;
          }
          return null;
      });

      const macdValues = macdLine.filter(val => val !== null) as number[];
      if (macdValues.length < 10) return;

      const signalLineEma = calculateEMA(macdValues, 9);
      const signalValues = signalLineEma.filter(val => val !== null) as number[];
      if (signalValues.length < 2) return;

      const macdSlice = macdValues.slice(-signalValues.length);

      const lastMacd = macdSlice[macdSlice.length - 1];
      const prevMacd = macdSlice[macdSlice.length - 2];
      const lastSignal = signalValues[signalValues.length - 1];
      const prevSignal = signalValues[signalValues.length - 2];

      const lastSignalType = signals.length > 0 ? signals[0].type : null;
      
      const hasBullishCrossover = prevMacd < prevSignal && lastMacd > lastSignal;
      const hasBearishCrossover = prevMacd > prevSignal && lastMacd < lastSignal;

      const lastDataPoint = formattedData[formattedData.length - 1];
      
      if (hasBullishCrossover && lastSignalType !== 'BUY') {
        const newSignal: Signal = {
          type: 'BUY',
          price: lastDataPoint.price,
          time: lastDataPoint.time,
          displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };
        setSignals(prevSignals => [newSignal, ...prevSignals].slice(0, 15));
      } else if (hasBearishCrossover && lastSignalType !== 'SELL') {
        const newSignal: Signal = {
          type: 'SELL',
          price: lastDataPoint.price,
          time: lastDataPoint.time,
          displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };
        setSignals(prevSignals => [newSignal, ...prevSignals].slice(0, 15));
      }

    } catch (error) {
      console.error("Error processing data:", error);
      // We don't toast here to avoid spamming on rapid refreshes
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
              <CardDescription>24-hour price data from MEXC. Signals are generated using MACD crossover analysis and are for demonstration only.</CardDescription>
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
