'use client';

import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMarketSentiment } from '@/app/actions';
import { Skeleton } from './ui/skeleton';

export function MarketSentiment() {
  const [sentiment, setSentiment] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerateSentiment = async () => {
    setIsLoading(true);
    setSentiment('');
    const result = await getMarketSentiment();
    setSentiment(result);
    setIsLoading(false);
  };

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Market Sentiment
        </CardTitle>
        <CardDescription>AI insights on DOGE market trends and social media sentiment.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow gap-4">
        <Button onClick={handleGenerateSentiment} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Analyze DOGE Sentiment'}
        </Button>
        <div className="flex-grow rounded-lg border bg-muted/50 p-4 text-sm min-h-[150px]">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {sentiment && <p className="whitespace-pre-wrap">{sentiment}</p>}
          {!isLoading && !sentiment && (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">Click the button to generate the latest market sentiment for DOGE.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
