'use server';

import { generateMarketSentiment } from '@/ai/flows/generate-market-sentiment';
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
