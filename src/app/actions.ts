'use server';

import type { ChartDataPoint } from '@/lib/types';

export async function getChartData(): Promise<ChartDataPoint[]> {
  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60); // 24 hours ago
    const interval = 'Min1';
    const symbol = 'DOGE_USDT';

    const url = `https://contract.mexc.com/api/v1/contract/kline/${symbol}?interval=${interval}&start=${startTime}&end=${endTime}`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`Failed to fetch data from MEXC: ${response.statusText}`);
      return [];
    }
    const data = await response.json();

    if (data.code !== 0 || !data.data || !data.data.time || data.data.time.length === 0 || !data.data.high || !data.data.low || !data.data.close) {
      console.error("Invalid data from MEXC API:", data.msg || "Incomplete data returned");
      return [];
    }
    
    const { time, high, low, close } = data.data;

    const minLength = Math.min(time.length, high.length, low.length, close.length);
    if (time.length !== minLength || high.length !== minLength || low.length !== minLength || close.length !== minLength) {
        console.warn("MEXC API returned inconsistent array lengths. Truncating data.");
    }

    const formattedData: ChartDataPoint[] = time.slice(0, minLength).map((t: number, index: number) => ({
      time: t * 1000,
      high: high[index],
      low: low[index],
      close: close[index],
    }));
    return formattedData;
  } catch (error) {
    console.error("Error fetching crypto data from server action:", error);
    return [];
  }
}
