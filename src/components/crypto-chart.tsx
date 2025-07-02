'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import type { ChartDataPoint, Signal, SignalLevel } from '@/lib/types';
import { useMemo } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CryptoChartProps {
  data: ChartDataPoint[];
  signals: Signal[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background/80 backdrop-blur-sm p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Time</span>
            <span className="font-bold text-muted-foreground">
              {new Date(label).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Price</span>
            <span className="font-bold text-foreground">
              ${payload[0].value.toFixed(5)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const radiusMap: Record<SignalLevel, number> = {
  High: 7,
  Medium: 5,
  Low: 3,
};

const getSignalBoxClasses = (signal: Signal) => {
    const borderColor = signal.type === 'BUY' ? 'border-buy' : 'border-sell';
    let bgColor = '';
    // The full classes need to be present for Tailwind's JIT compiler
    // bg-buy/20 bg-buy/15 bg-buy/10 bg-sell/20 bg-sell/15 bg-sell/10
    if (signal.type === 'BUY') {
        switch (signal.level) {
            case 'High': bgColor = 'bg-buy/20'; break;
            case 'Medium': bgColor = 'bg-buy/15'; break;
            case 'Low': bgColor = 'bg-buy/10'; break;
        }
    } else {
        switch (signal.level) {
            case 'High': bgColor = 'bg-sell/20'; break;
            case 'Medium': bgColor = 'bg-sell/15'; break;
            case 'Low': bgColor = 'bg-sell/10'; break;
        }
    }
    return `${borderColor} ${bgColor}`;
};


export function CryptoChart({ data, signals }: CryptoChartProps) {
  const yAxisDomain = useMemo(() => {
    if (data.length === 0) return [0, 1];
    const prices = data.map(p => p.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.15;
    return [min - padding, max + padding];
  }, [data]);
  
  const latestSignal = signals.length > 0 ? signals[0] : null;

  return (
    <div className="h-[400px] w-full relative">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={(price) => `$${Number(price).toFixed(4)}`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          {signals.map((signal, index) => (
            <ReferenceDot
              key={index}
              x={signal.time}
              y={signal.price}
              r={radiusMap[signal.level]}
              fill={signal.type === 'BUY' ? 'hsl(var(--buy))' : 'hsl(var(--sell))'}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              isFront={true}
              className={cn(index === 0 && signal.level === 'High' ? 'animate-pulse' : '')}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {latestSignal && (
         <div className={cn(
             "absolute top-4 right-4 p-3 rounded-lg border shadow-lg flex items-center gap-3 animate-fade-in",
             getSignalBoxClasses(latestSignal)
         )}>
            {latestSignal.type === 'BUY' ? (
                <ArrowUp className="h-6 w-6 text-buy" />
            ) : (
                <ArrowDown className="h-6 w-6 text-sell" />
            )}
            <div>
                <p className={`font-bold ${(latestSignal.type === 'BUY' ? 'text-buy' : 'text-sell')}`}>
                    {latestSignal.level.toUpperCase()} {latestSignal.type} SIGNAL
                </p>
                <p className="text-sm text-foreground">
                    @ ${latestSignal.price.toFixed(5)}
                </p>
            </div>
         </div>
      )}
    </div>
  );
}
