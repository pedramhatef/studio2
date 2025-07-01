'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CryptoChart } from './crypto-chart';
import { SignalHistory } from './signal-history';
import type { ChartDataPoint, Signal, Sensitivity } from '@/lib/types';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getChartData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const SENSITIVITY_SETTINGS = {
  Low: { probability: 0.01 },
  Medium: { probability: 0.03 },
  High: { probability: 0.05 },
};
const DATA_REFRESH_INTERVAL = 30000; // 30 seconds

export function Dashboard() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('Medium');
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
            description: "Could not fetch chart data. Retrying in 30s.",
          });
        }
        return;
      }
      
      setChartData(formattedData);

      const { probability } = SENSITIVITY_SETTINGS[sensitivity];
      if (Math.random() < probability) {
        const lastDataPoint = formattedData[formattedData.length - 1];
        const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const newSignal: Signal = {
          type,
          price: lastDataPoint.price,
          time: lastDataPoint.time,
          displayTime: new Date(lastDataPoint.time).toLocaleTimeString(),
        };
        setSignals(prevSignals => [newSignal, ...prevSignals].slice(0, 15));
      }
    } catch (error) {
      console.error("Error fetching crypto data:", error);
      toast({
        variant: "destructive",
        title: "An unexpected error occurred",
        description: "Could not update dashboard data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sensitivity, toast, chartData.length]);

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
              <CardDescription>24-hour price data from CoinGecko, updated every 30 seconds. Signals are for demonstration only.</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Label className="font-semibold">Signal Frequency:</Label>
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
