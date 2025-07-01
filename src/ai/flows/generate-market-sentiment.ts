'use server';

/**
 * @fileOverview A market sentiment analysis AI agent for DOGE.
 *
 * - generateMarketSentiment - A function that generates insights on market trends and social media sentiment towards DOGE.
 * - GenerateMarketSentimentInput - The input type for the generateMarketSentiment function.
 * - GenerateMarketSentimentOutput - The return type for the generateMarketSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMarketSentimentInputSchema = z.object({
  query: z
    .string()
    .default('DOGE')
    .describe('The cryptocurrency to analyze market sentiment for.'),
});
export type GenerateMarketSentimentInput = z.infer<
  typeof GenerateMarketSentimentInputSchema
>;

const GenerateMarketSentimentOutputSchema = z.object({
  sentiment: z
    .string()
    .describe(
      'A summary of the current market trends and social media sentiment towards DOGE.'
    ),
});
export type GenerateMarketSentimentOutput = z.infer<
  typeof GenerateMarketSentimentOutputSchema
>;

export async function generateMarketSentiment(
  input: GenerateMarketSentimentInput
): Promise<GenerateMarketSentimentOutput> {
  return generateMarketSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMarketSentimentPrompt',
  input: {schema: GenerateMarketSentimentInputSchema},
  output: {schema: GenerateMarketSentimentOutputSchema},
  prompt: `You are an expert cryptocurrency market analyst specializing in DOGE.

You will analyze the current market trends and social media sentiment towards DOGE.

Use the following information to generate a summary of the overall market mood.

Cryptocurrency: {{{query}}}`,
});

const generateMarketSentimentFlow = ai.defineFlow(
  {
    name: 'generateMarketSentimentFlow',
    inputSchema: GenerateMarketSentimentInputSchema,
    outputSchema: GenerateMarketSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
