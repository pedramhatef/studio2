'use server';

import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Signal } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const signal: Omit<Signal, 'displayTime'> = await request.json();

        if (!signal || !signal.type || !signal.level || !signal.price || !signal.time) {
            return NextResponse.json({ success: false, error: 'Invalid signal data provided.' }, { status: 400 });
        }

        // --- Prevent Duplicate Signal Writes ---
        const signalsRef = collection(db, "signals");
        const q = query(signalsRef, orderBy("createdAt", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const lastSignal = querySnapshot.docs[0].data() as Omit<Signal, 'displayTime'>;
            // If the last signal in the DB is the same type and level, don't save.
            if (lastSignal.type === signal.type && lastSignal.level === signal.level) {
                 return NextResponse.json({ success: true, id: querySnapshot.docs[0].id, message: 'Duplicate signal, not saved.' });
            }
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
