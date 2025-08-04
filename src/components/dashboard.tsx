'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CryptoChart } from './crypto-chart';
import { SignalHistory } from './signal-history';
import type { ChartDataPoint, Signal, IndicatorValues } from '@/lib/types';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getChartData, getSignalHistoryFromDB, saveSignalToDB } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

// Constants
const DATA_REFRESH_INTERVAL = 5000;
const MAX_SIGNALS = 15;

// Indicator Parameters
const INDICATOR_PARAMS = {
  WT_CHANNEL_LENGTH: 10,
  WT_AVERAGE_LENGTH: 21,
  WT_SIGNAL_LENGTH: 4,
  MACD_FAST_PERIOD: 12,
  MACD_SLOW_PERIOD: 26,
  MACD_SIGNAL_PERIOD: 9,
  RSI_PERIOD: 14,
  EMA_TREND_PERIOD: 50,
  VOLUME_AVG_PERIOD: 20,
  VOLUME_SPIKE_FACTOR: 1.8
};

// --- Helper Functions ---
const calculateEMA = (data: number[], period: number): number[] => {
  if (data.length === 0) return [];
  
  const k = 2 / (period + 1);
  const emaArray: number[] = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    emaArray[i] = data[i] * k + emaArray[i-1] * (1 - k);
  }
  return emaArray;
};

const calculateSMA = (data: number[], period: number): (number | null)[] => {
  const smaArray: (number | null)[] = Array(data.length).fill(null);
  if (data.length < period) return smaArray;

  let sum = data.slice(0, period).reduce((a, b) => a + b, 0);
  smaArray[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    smaArray[i] = sum / period;
  }
  return smaArray;
};

const calculateRSI = (data: number[], period: number): (number | null)[] => {
  if (data.length < period + 1) return Array(data.length).fill(null);
  
  const rsiArray: (number | null)[] = Array(data.length).fill(null);
  const changes = data.slice(1).map((val, i) => val - data[i]);
  
  let avgGain = 0;
  let avgLoss = 0;

  // Initial calculation
  changes.slice(0, period).forEach(change => {
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  });
  
  avgGain /= period;
  avgLoss /= period;

  rsiArray[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  // Subsequent calculations
  for (let i = period + 1; i < data.length; i++) {
    const change = changes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsiArray[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  
  return rsiArray;
};

// --- Signal Generation Logic ---
const getNewSignal = (
  indicators: IndicatorValues,
  lastSignal: Signal | null
): Omit<Signal, 'price' | 'time' | 'displayTime'> | null => {
  const {
    lastVolume,
    lastVolumeSMA,
    lastTrendEMA,
    lastTci,
    prevTci,
    lastWt2,
    prevWt2,
    lastMacd,
    lastMacdSignal,
    lastRsi,
    lastClose
  } = indicators;

  // Validate indicator values
  if ([lastVolumeSMA, lastWt2, prevWt2, lastRsi].some(val => val === null)) {
    return null;
  }

  const isWTBuy = prevTci < prevWt2! && lastTci > lastWt2!;
  const isWTSell = prevTci > prevWt2! && lastTci < lastWt2!;
  const isMACDConfirmBuy = lastMacd > lastMacdSignal;
  const isRSIConfirmBuy = lastRsi! > 50;
  const isMACDConfirmSell = lastMacd < lastMacdSignal;
  const isRSIConfirmSell = lastRsi! < 50;
  const isVolumeSpike = lastVolume > lastVolumeSMA! * INDICATOR_PARAMS.VOLUME_SPIKE_FACTOR;
  const isUptrend = lastClose > lastTrendEMA;

  // Signal generation logic
  if (isWTBuy && lastSignal?.type !== 'BUY') {
    let confirmations = 
      (isMACDConfirmBuy ? 1 : 0) + 
      (isRSIConfirmBuy ? 1 : 0) +
      (isUptrend ? 1 : 0);
    
    if (confirmations >= 2 && isVolumeSpike) return { type: 'BUY', level: 'High' };
    if (confirmations >= 1) return { type: 'BUY', level: 'Medium' };
    return { type: 'BUY', level: 'Low' };
  } 
  
  if (isWTSell && lastSignal?.type !== 'SELL') {
    let confirmations = 
      (isMACDConfirmSell ? 1 : 0) + 
      (isRSIConfirmSell ? 1 : 0) +
      (!isUptrend ? 1 : 0);
    
    if (confirmations >= 2 && isVolumeSpike) return { type: 'SELL', level: 'High' };
    if (confirmations >= 1) return { type: 'SELL', level: 'Medium' };
    return { type: 'SELL', level: 'Low' };
  }

  return null;
};

// --- Main Component ---
export function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const lastSignalTimeRef = useRef<number>(0);

  // Calculate required data length
  const requiredDataLength = useMemo(() => {
    return Math.max(
      INDICATOR_PARAMS.WT_CHANNEL_LENGTH + INDICATOR_PARAMS.WT_AVERAGE_LENGTH,
      INDICATOR_PARAMS.MACD_SLOW_PERIOD,
      INDICATOR_PARAMS.RSI_PERIOD + 1,
      INDICATOR_PARAMS.EMA_TREND_PERIOD,
      INDICATOR_PARAMS.VOLUME_AVG_PERIOD
    );
  }, []);

  const processDataAndGenerateSignal = useCallback((data: ChartDataPoint[], currentSignals: Signal[]) => {
      if (data.length < requiredDataLength) return;
      
      // Extract price and volume data
      const closePrices = data.map(p => p.close);
      const volumes = data.map(p => p.volume);

      // Calculate indicators
      const trendEMA = calculateEMA(closePrices, INDICATOR_PARAMS.EMA_TREND_PERIOD);
      const ap = data.map(p => (p.high + p.low + p.close) / 3);
      const esa = calculateEMA(ap, INDICATOR_PARAMS.WT_CHANNEL_LENGTH);
      const d = calculateEMA(ap.map((val, i) => Math.abs(val - esa[i])), INDICATOR_PARAMS.WT_CHANNEL_LENGTH);
      const ci = ap.map((val, i) => (d[i] === 0 ? 0 : (val - esa[i]) / (0.015 * d[i])));
      const tci = calculateEMA(ci, INDICATOR_PARAMS.WT_AVERAGE_LENGTH);
      const wt2 = calculateSMA(tci, INDICATOR_PARAMS.WT_SIGNAL_LENGTH);
      const fastEMA = calculateEMA(closePrices, INDICATOR_PARAMS.MACD_FAST_PERIOD);
      const slowEMA = calculateEMA(closePrices, INDICATOR_PARAMS.MACD_SLOW_PERIOD);
      const macdLine = fastEMA.map((val, i) => val - slowEMA[i]);
      const signalLine = calculateEMA(macdLine, INDICATOR_PARAMS.MACD_SIGNAL_PERIOD);
      const rsi = calculateRSI(closePrices, INDICATOR_PARAMS.RSI_PERIOD);
      const volumeSMA = calculateSMA(volumes, INDICATOR_PARAMS.VOLUME_AVG_PERIOD);

      // Generate new signal
      const lastIndex = data.length - 1;
      const indicators: IndicatorValues = {
        lastVolume: volumes[lastIndex],
        lastVolumeSMA: volumeSMA[lastIndex],
        lastTrendEMA: trendEMA[lastIndex],
        lastTci: tci[lastIndex],
        prevTci: tci[lastIndex - 1],
        lastWt2: wt2[lastIndex],
        prevWt2: wt2[lastIndex - 1],
        lastMacd: macdLine[lastIndex],
        lastMacdSignal: signalLine[lastIndex],
        lastRsi: rsi[lastIndex],
        lastClose: closePrices[lastIndex]
      };

      const lastSignal = currentSignals[0] || null;
      const newSignalBase = getNewSignal(indicators, lastSignal);

      if (newSignalBase) {
        const lastDataPoint = data[lastIndex];
        const newSignal: Signal = {
          ...newSignalBase,
          price: lastDataPoint.close,
          time: lastDataPoint.time,
          displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };

        if (currentSignals[0]?.time !== newSignal.time) {
          setSignals(prev => [newSignal, ...prev].slice(0, MAX_SIGNALS));
          saveSignalToDB({
            type: newSignal.type,
            level: newSignal.level,
            price: newSignal.price,
            time: newSignal.time
          });
        }
      }
  }, [requiredDataLength]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [initialChartData, initialSignals] = await Promise.all([
        getChartData(),
        getSignalHistoryFromDB(),
      ]);
      
      setChartData(initialChartData);
      setSignals(initialSignals);
      
      if(initialChartData.length > 0) {
        processDataAndGenerateSignal(initialChartData, initialSignals);
      }
    } catch (error) {
       console.error("Error fetching initial data:", error);
       toast({
        variant: "destructive",
        title: "Initialization Error",
        description: "Could not load initial chart and signal data.",
      });
    } finally {
        setIsLoading(false);
    }
  }, [processDataAndGenerateSignal, toast]);

  const fetchUpdateData = useCallback(async () => {
    try {
      const updatedChartData = await getChartData();
      setChartData(updatedChartData);
      setSignals(currentSignals => {
        processDataAndGenerateSignal(updatedChartData, currentSignals);
        return currentSignals;
      });
    } catch (error) {
       console.error("Error fetching updated data:", error);
       toast({
        variant: "destructive",
        title: "Data Update Error",
        description: "Could not refresh chart data.",
      });
    }
  }, [processDataAndGenerateSignal, toast]);
  
  // Initial data load
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Periodic data refresh
  useEffect(() => {
    const intervalId = setInterval(fetchUpdateData, DATA_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchUpdateData]);

  // Show signal toast
  useEffect(() => {
    if (!signals.length || signals[0].time === lastSignalTimeRef.current) return;
    
    const newSignal = signals[0];
    lastSignalTimeRef.current = newSignal.time;
    
    const toastTitles = {
      High: `🚀 High ${newSignal.type} Signal!`,
      Medium: `🔥 Medium ${newSignal.type} Signal!`,
      Low: `🤔 Low ${newSignal.type} Signal`
    };

    toast({
      id: `signal-${newSignal.time}`,
      title: toastTitles[newSignal.level],
      description: `Generated at $${newSignal.price.toFixed(5)}`,
    });
  }, [signals, toast]);

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
              <CardDescription>
                Algorithmic signals using enhanced WaveTrend strategy with volume confirmation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
