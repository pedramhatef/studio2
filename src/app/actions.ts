'use server';

import { generateMarketSentiment } from '@/ai/flows/generate-market-sentiment';
import type { ChartDataPoint } from '@/lib/types';
import { z } from 'zod';

const sentimentSchema = z.object({
  sentiment: z.string(),
});

export async function getMarketSentiment() {
  try {
    const result = await generateMarketSentiment({ query: 'DOGE' });
    const parsedResult = sentimentSchema.safeParse(result);
    if (!parsedResult.success) {
      console.error("Invalid data from AI:", parsedResult.error);
      return 'Received invalid data from AI.';
    }
    return parsedResult.data.sentiment;
  } catch (error) {
    console.error(error);
    return 'An error occurred while fetching market sentiment.';
  }
}

export async function getChartData(): Promise<ChartDataPoint[]> {
  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60); // 24 hours ago
    const interval = 'Min5';
    const symbol = 'DOGE_USDT';

    const url = `https://contract.mexc.com/api/v1/contract/kline/${symbol}?interval=${interval}&start=${startTime}&end=${endTime}`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`Failed to fetch data from MEXC: ${response.statusText}`);
      return [];
    }
    const data = await response.json();

    if (data.code !== 0 || !data.data || !data.data.time || data.data.time.length === 0) {
      console.error("Invalid data from MEXC API:", data.msg || "No data returned");
      return [];
    }
    
    const { time, close } = data.data;

    const formattedData: ChartDataPoint[] = time.map((t: number, index: number) => ({
      time: t * 1000,
      price: close[index],
    }));
    return formattedData;
  } catch (error) {
    console.error("Error fetching crypto data from server action:", error);
    return [];
  }
}
