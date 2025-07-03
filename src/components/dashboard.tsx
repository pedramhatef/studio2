'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CryptoChart } from './crypto-chart';
import { SignalHistory } from './signal-history';
import type { ChartDataPoint, Signal, SignalLevel } from '@/lib/types';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getChartData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const DATA_REFRESH_INTERVAL = 1000; // 1 second

// --- WaveTrend Parameters ---
const WT_CHANNEL_LENGTH = 9;
const WT_AVERAGE_LENGTH = 21; // Smoothed for more reliability
const WT_SIGNAL_LENGTH = 4;

// --- MACD Parameters ---
const MACD_FAST_PERIOD = 12;
const MACD_SLOW_PERIOD = 26;
const MACD_SIGNAL_PERIOD = 9;

// --- RSI Parameters ---
const RSI_PERIOD = 14;
// Note: RSI 50-level is now used for momentum confirmation.

// --- Trend Filter ---
const EMA_TREND_PERIOD = 50;

// Helper to calculate Exponential Moving Average (EMA)
const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  if (data.length > 0) {
    let ema = data[0]; // Start with the first value
    emaArray.push(ema);
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      emaArray.push(ema);
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

// Helper to calculate RSI
const calculateRSI = (data: number[], period: number): (number | null)[] => {
    if (data.length < period + 1) return new Array(data.length).fill(null);
    
    const rsiArray: (number | null)[] = new Array(data.length).fill(null);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = data[i] - data[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    if (avgLoss === 0) {
        rsiArray[period] = 100;
    } else {
        const rs = avgGain / avgLoss;
        rsiArray[period] = 100 - (100 / (1 + rs));
    }

    for (let i = period + 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        let currentGain = change > 0 ? change : 0;
        let currentLoss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        if (avgLoss === 0) {
            rsiArray[i] = 100;
        } else {
            const rs = avgGain / avgLoss;
            rsiArray[i] = 100 - (100 / (1 + rs));
        }
    }
    return rsiArray;
};


export function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDataAndGenerateSignal = useCallback(async () => {
    try {
      const formattedData = await getChartData();
      const requiredDataLength = Math.max(WT_CHANNEL_LENGTH + WT_AVERAGE_LENGTH, MACD_SLOW_PERIOD, RSI_PERIOD + 1, EMA_TREND_PERIOD);

      if (!formattedData || formattedData.length < requiredDataLength) {
        if (chartData.length === 0) {
          toast({
            variant: "destructive",
            title: "Fetching data...",
            description: "Waiting for enough data to generate signals.",
          });
        }
        setChartData(formattedData || []);
        return;
      }
      
      setChartData(formattedData);

      // --- Indicator Calculations ---
      const closePrices = formattedData.map(p => p.close);
      
      // Trend Filter
      const trendEMA = calculateEMA(closePrices, EMA_TREND_PERIOD);

      // WaveTrend
      const ap = formattedData.map(p => (p.high + p.low + p.close) / 3);
      const esa = calculateEMA(ap, WT_CHANNEL_LENGTH);
      const d = calculateEMA(ap.map((val, i) => Math.abs(val - esa[i])), WT_CHANNEL_LENGTH);
      const ci = ap.map((val, i) => (d[i] === 0) ? 0 : (val - esa[i]) / (0.015 * d[i]));
      const tci = calculateEMA(ci, WT_AVERAGE_LENGTH);
      const wt2 = calculateSMA(tci, WT_SIGNAL_LENGTH);

      // MACD
      const fastEMA = calculateEMA(closePrices, MACD_FAST_PERIOD);
      const slowEMA = calculateEMA(closePrices, MACD_SLOW_PERIOD);
      const macdLine = fastEMA.map((val, i) => val - slowEMA[i]);
      const signalLine = calculateEMA(macdLine, MACD_SIGNAL_PERIOD);

      // RSI
      const rsi = calculateRSI(closePrices, RSI_PERIOD);

      // --- Crossover Detection & Combined Signal Logic ---
      const lastClose = closePrices[closePrices.length - 1];
      const lastTrendEMA = trendEMA[trendEMA.length - 1];
      const lastTci = tci[tci.length - 1];
      const prevTci = tci[tci.length - 2];
      const lastWt2 = wt2[wt2.length - 1];
      const prevWt2 = wt2[wt2.length - 2];
      const lastMacd = macdLine[macdLine.length - 1];
      const lastMacdSignal = signalLine[signalLine.length - 1];
      const lastRsi = rsi[rsi.length - 1];
      
      if (lastTrendEMA === null || lastTci === null || prevTci === null || lastWt2 === null || prevWt2 === null || lastMacd === null || lastMacdSignal === null || lastRsi === null) return;

      const lastSignal = signals.length > 0 ? signals[0] : null;
      const lastDataPoint = formattedData[formattedData.length - 1];
      
      // Define conditions
      const isUptrend = lastClose > lastTrendEMA;
      const isDowntrend = lastClose < lastTrendEMA;

      const isWTBuy = prevTci < prevWt2 && lastTci > lastWt2;
      const isWTSell = prevTci > prevWt2 && lastTci < lastWt2;

      const isMACDConfirmBuy = lastMacd > lastMacdSignal;
      const isRSIConfirmBuy = lastRsi > 50;
      
      const isMACDConfirmSell = lastMacd < lastMacdSignal;
      const isRSIConfirmSell = lastRsi < 50;

      let newSignal: Omit<Signal, 'price' | 'time' | 'displayTime'> | null = null;
      
      // BUY Signal Logic
      if (isUptrend && isWTBuy && lastSignal?.type !== 'BUY') {
        let confirmations = 0;
        if (isMACDConfirmBuy) confirmations++;
        if (isRSIConfirmBuy) confirmations++;

        if (confirmations === 2) {
          newSignal = { type: 'BUY', level: 'High' };
        } else if (confirmations === 1) {
          newSignal = { type: 'BUY', level: 'Medium' };
        } else {
          newSignal = { type: 'BUY', level: 'Low' };
        }
      } 
      // SELL Signal Logic
      else if (isDowntrend && isWTSell && lastSignal?.type !== 'SELL') {
        let confirmations = 0;
        if (isMACDConfirmSell) confirmations++;
        if (isRSIConfirmSell) confirmations++;

        if (confirmations === 2) {
          newSignal = { type: 'SELL', level: 'High' };
        } else if (confirmations === 1) {
          newSignal = { type: 'SELL', level: 'Medium' };
        } else {
          newSignal = { type: 'SELL', level: 'Low' };
        }
      }

      if (newSignal) {
        const fullSignal: Signal = {
            ...newSignal,
            price: lastDataPoint.close,
            time: lastDataPoint.time,
            displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };
        setSignals(prevSignals => [fullSignal, ...prevSignals].slice(0, 15));
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
              <CardDescription>Signals use an EMA trend filter with WaveTrend, MACD, and RSI for high-confidence scalping entries. For demonstration only.</CardDescription>
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
