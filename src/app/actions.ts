'use server';

import type { ChartDataPoint } from '@/lib/types';
import { collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getChartData(): Promise<ChartDataPoint[]> {
  try {
    const bybitUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=DOGEUSDT&interval=1&limit=200`;
    const bybitResponse = await fetch(bybitUrl, { cache: 'no-store' });
    if (!bybitResponse.ok) {
        throw new Error(`Bybit API Error: ${bybitResponse.status} ${bybitResponse.statusText}`);
    }
    const bybitData = await bybitResponse.json();

    if (bybitData.retCode !== 0 || !bybitData.result || !bybitData.result.list) {
        throw new Error(`Invalid data from Bybit API: ${bybitData.retMsg}`);
    }

    const chartData: ChartDataPoint[] = bybitData.result.list.map((c: any) => ({
      time: parseInt(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    })).reverse();

    return chartData;

  } catch (error) {
    console.error("Error fetching chart data from server action:", error);
    return [];
  }
}
