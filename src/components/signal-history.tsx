'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Signal, SignalLevel } from '@/lib/types';
import { History } from 'lucide-react';

interface SignalHistoryProps {
  signals: Signal[];
}

const getLevelClass = (level: SignalLevel) => {
    switch (level) {
        case 'High': return 'text-primary';
        case 'Medium': return 'text-foreground';
        case 'Low': return 'text-muted-foreground';
        default: return 'text-muted-foreground';
    }
}

export function SignalHistory({ signals }: SignalHistoryProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Signal History
        </CardTitle>
        <CardDescription>A log of the most recent trade signals.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg max-h-[445px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Price (USDT)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signals.length > 0 ? (
                signals.map((signal, index) => (
                  <TableRow key={index} className="transition-opacity hover:bg-muted/50">
                    <TableCell className="font-medium">{signal.displayTime}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${signal.type === 'BUY' ? 'text-buy' : 'text-sell'}`}>
                        {signal.type}
                      </span>
                    </TableCell>
                    <TableCell className={`font-medium ${getLevelClass(signal.level)}`}>{signal.level}</TableCell>
                    <TableCell className="text-right tabular-nums">{signal.price.toFixed(5)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No signals generated yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
