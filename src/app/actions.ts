'use server';

import type { ChartDataPoint, Signal } from '@/lib/types';
import { collection, query, orderBy, limit, getDocs, addDoc, Timestamp } from "firebase/firestore";
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

export async function getSignalHistoryFromDB(): Promise<Signal[]> {
    try {
        const signalsRef = collection(db, "signals");
        const q = query(signalsRef, orderBy("time", "desc"), limit(15));
        const querySnapshot = await getDocs(q);
        const signals: Signal[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            signals.push({
                type: data.type,
                level: data.level,
                price: data.price,
                time: data.time instanceof Timestamp ? data.time.toMillis() : data.time,
                displayTime: new Date(data.time instanceof Timestamp ? data.time.toMillis() : data.time).toLocaleTimeString(),
            });
        });
        return signals;
    } catch (error) {
        console.error("Error fetching signal history from DB:", error);
        return [];
    }
}

export async function saveSignalToDB(signal: Omit<Signal, 'displayTime'>) {
    try {
        const signalsRef = collection(db, "signals");
        // Check for duplicates before writing
        const q = query(signalsRef, orderBy("time", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const lastSignal = querySnapshot.docs[0].data();
            if (lastSignal.time === signal.time) {
                console.log("Duplicate signal detected. Not saving.");
                return;
            }
        }
        await addDoc(signalsRef, signal);
    } catch (error) {
        console.error("Error saving signal to DB:", error);
    }
}
