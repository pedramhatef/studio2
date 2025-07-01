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
    const response = await fetch('https://api.coingecko.com/api/v3/coins/dogecoin/market_chart?vs_currency=usd&days=1', { cache: 'no-store' });
    if (!response.ok) {
      console.error(`Failed to fetch data from CoinGecko: ${response.statusText}`);
      return [];
    }
    const data = await response.json();

    if (!data.prices || data.prices.length === 0) {
      return [];
    }
    
    const formattedData: ChartDataPoint[] = data.prices.map((p: [number, number]) => ({
      time: p[0],
      price: p[1],
    }));
    return formattedData;
  } catch (error) {
    console.error("Error fetching crypto data from server action:", error);
    return [];
  }
}
