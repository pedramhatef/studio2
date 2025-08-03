'use server';

import type { ChartDataPoint, Signal } from '@/lib/types';
import { collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface DashboardData {
    chartData: ChartDataPoint[];
    signals: Signal[];
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    // --- Fetch Chart Data from Bybit ---
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
    })).reverse();


    // --- Fetch Signals from Firestore ---
    const signalsRef = collection(db, "signals");
    const q = query(signalsRef, orderBy("createdAt", "desc"), limit(15));
    const querySnapshot = await getDocs(q);
    const signals: Signal[] = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt as Timestamp;
        signals.push({
            type: data.type,
            level: data.level,
            price: data.price,
            time: data.time,
            displayTime: createdAt.toDate().toLocaleTimeString(),
        });
    });

    return { chartData, signals };

  } catch (error) {
    console.error("Error fetching dashboard data from server action:", error);
    return { chartData: [], signals: [] };
  }
}
