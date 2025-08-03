'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CryptoChart } from './crypto-chart';
import { SignalHistory } from './signal-history';
import type { ChartDataPoint, Signal } from '@/lib/types';
import { BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardData, type DashboardData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const DATA_REFRESH_INTERVAL = 5000; // 5 seconds

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({ chartData: [], signals: [] });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const data = await getDashboardData();
      if (data) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Data Error",
        description: "Could not fetch latest chart and signal data.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData(); // Initial fetch
    const intervalId = setInterval(fetchData, DATA_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchData]);
  
  // Initial loading toast.
  useEffect(() => {
    if (isLoading) {
      toast({
        title: "Fetching data...",
        description: "Loading latest market data and signals.",
      });
    }
  }, [isLoading, toast]);

  const { chartData, signals } = dashboardData;

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
              <CardDescription>Backend server generates signals using a trend-following strategy. For demonstration only.</CardDescription>
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
