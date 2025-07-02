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

// --- Technical Indicator Parameters ---
const MACD_FAST_PERIOD = 12;
const MACD_SLOW_PERIOD = 26;
const MACD_SIGNAL_PERIOD = 9;

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
  const [trendWarning, setTrendWarning] = useState<boolean>(false);
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

      // --- Signal Generation Logic using MACD State ---
      if (formattedData.length < MACD_SLOW_PERIOD + MACD_SIGNAL_PERIOD) return; // Not enough data for MACD

      const prices = formattedData.map(p => p.price);
      
      const emaFast = calculateEMA(prices, MACD_FAST_PERIOD);
      const emaSlow = calculateEMA(prices, MACD_SLOW_PERIOD);

      const macdLine = emaSlow.map((slow, i) => {
          if (slow !== null && emaFast[i] !== null) {
              return emaFast[i]! - slow;
          }
          return null;
      });

      const macdValues = macdLine.filter(val => val !== null) as number[];
      if (macdValues.length < MACD_SIGNAL_PERIOD) return;

      const signalLineEma = calculateEMA(macdValues, MACD_SIGNAL_PERIOD);
      const signalValues = signalLineEma.filter(val => val !== null) as number[];
      if (signalValues.length < 1) return;

      // Align MACD values with signal line values for comparison
      const macdSlice = macdValues.slice(-signalValues.length);

      const lastMacd = macdSlice[macdSlice.length - 1];
      const lastSignalLine = signalValues[signalValues.length - 1];
      
      // --- Trend Weakening/Warning Logic ---
      const histogram = lastMacd - lastSignalLine;
      // Set a dynamic threshold based on a fraction of the MACD value itself.
      // When the histogram (gap between lines) is less than this, the trend is weakening.
      const WARNING_THRESHOLD = Math.abs(lastMacd) * 0.10; // 10% of MACD value
      setTrendWarning(Math.abs(histogram) < WARNING_THRESHOLD);

      const lastSignalType = signals.length > 0 ? signals[0].type : null;
      const lastDataPoint = formattedData[formattedData.length - 1];
      
      // If MACD is above the signal line, we're in a "BUY" state.
      // Generate a signal if the last signal wasn't also a BUY.
      if (lastMacd > lastSignalLine && lastSignalType !== 'BUY') {
        const newSignal: Signal = {
          type: 'BUY',
          price: lastDataPoint.price,
          time: lastDataPoint.time,
          displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };
        setSignals(prevSignals => [newSignal, ...prevSignals].slice(0, 15));
      } 
      // If MACD is below the signal line, we're in a "SELL" state.
      // Generate a signal if the last signal wasn't also a SELL.
      else if (lastMacd < lastSignalLine && lastSignalType !== 'SELL') {
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
              <CardDescription>1-minute price data from MEXC. Signals are generated using MACD analysis and are for demonstration only.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && chartData.length === 0 ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <CryptoChart data={chartData} signals={signals} trendWarning={trendWarning} />
          )}
        </CardContent>
      </Card>
      <SignalHistory signals={signals} />
    </div>
  );
}
