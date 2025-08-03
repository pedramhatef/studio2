'use server';

import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Signal } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const signal: Omit<Signal, 'displayTime'> = await request.json();

        if (!signal || !signal.type || !signal.level || !signal.price || !signal.time) {
            return NextResponse.json({ success: false, error: 'Invalid signal data provided.' }, { status: 400 });
        }
    
        const docRef = await addDoc(collection(db, "signals"), {
            ...signal,
            createdAt: serverTimestamp(),
        });
    
        return NextResponse.json({ success: true, id: docRef.id });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error('[API] Error saving signal:', errorMessage);
        return NextResponse.json({ success: false, error: `Failed to save signal: ${errorMessage}` }, { status: 500 });
    }
}
