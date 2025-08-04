
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const fetch = require('node-fetch');
const { calculateIndicators, generateSignal } = require('./signalEngine.js');

// --- Firebase Admin SDK setup ---
// Load service account credentials
const serviceAccount = require('./serviceAccountKey.json');

try {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
} catch (error) {
    // If the app is already initialized, it will throw an error. We can ignore it.
    if (!/already exists/i.test(error.message)) {
        console.error("Error initializing Firebase Admin SDK:", error.message);
        process.exit(1);
    }
}

const db = getFirestore();
console.log("Firebase Admin SDK initialized successfully.");

// --- Global State ---
let chartData = [];
let isFetching = false;
const DATA_REFRESH_INTERVAL = 5000; // 5 seconds
const MAX_DATA_POINTS = 1000; // Keep a max of 1000 data points to manage memory
let lastSignal = null; // In-memory store for the last signal

// --- Functions ---
async function fetchLatestCandle() {
  if (isFetching) return;
  isFetching = true;
  try {
    const limit = chartData.length > 0 ? 2 : 1000; // Fetch more initially, then just the latest
    const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=DOGEUSDT&interval=1&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Bybit API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    if (data.retCode !== 0 || !data.result || !data.result.list) {
        throw new Error(`Invalid data from Bybit API: ${data.retMsg}`);
    }

    const newCandles = data.result.list.map(c => ({
      time: parseInt(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
    })).reverse(); // Bybit returns newest first, so we reverse

    if (chartData.length === 0) {
      chartData = newCandles;
      console.log(`Initialized with ${chartData.length} data points.`);
    } else {
      const lastTimestamp = chartData[chartData.length - 1].time;
      newCandles.forEach(candle => {
        if (candle.time > lastTimestamp) {
          chartData.push(candle);
          if (chartData.length > MAX_DATA_POINTS) {
            chartData.shift(); // Keep array size manageable
          }
        } else if (candle.time === lastTimestamp) {
          // Update the last candle with the most recent data
          chartData[chartData.length - 1] = candle;
        }
      });
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  } finally {
    isFetching = false;
  }
}

async function saveSignal(signal, db) {
    if (!signal) return;
    try {
        const signalsRef = db.collection('signals');
        // Check the last signal in the database to prevent duplicates
        const q = signalsRef.orderBy('createdAt', 'desc').limit(1);
        const querySnapshot = await q.get();
        
        if (!querySnapshot.empty) {
            const lastDbSignal = querySnapshot.docs[0].data();
            // If the last signal in the DB is the same type and level, do not save.
            if (lastDbSignal.type === signal.type && lastDbSignal.level === signal.level) {
                // console.log(`INFO: Ignoring duplicate signal (${signal.level} ${signal.type})`);
                return;
            }
        }
        
        const signalToSave = {
            ...signal,
            createdAt: Timestamp.fromMillis(signal.time)
        };
        const docRef = await signalsRef.add(signalToSave);
        console.log(`SUCCESS: Saved ${signal.level} ${signal.type} signal to DB. Doc ID: ${docRef.id}`);
        lastSignal = signal; // Update in-memory lastSignal only after successful save
    } catch (error) {
        console.error("FIRESTORE ERROR: Failed to save signal:", error);
    }
}


function processDataAndGenerateSignal() {
  const requiredDataLength = 50; // A safe buffer for all indicators
  if (chartData.length < requiredDataLength) {
    console.log(`Waiting for more data... have ${chartData.length}/${requiredDataLength}`);
    return;
  }

  try {
    const indicators = calculateIndicators(chartData);
    const newSignal = generateSignal(chartData, indicators, lastSignal);

    if (newSignal) {
        console.log(`--- New Signal Generated: ${newSignal.level} ${newSignal.type} @ ${newSignal.price} ---`);
        saveSignal(newSignal, db);
    }
  } catch (error) {
    console.error("Error during signal generation:", error);
  }
}

// --- Main Loop ---
async function main() {
  console.log("Starting DogeRocket Signal Bot Server...");
  // Load the last signal from DB on startup to have the correct context
  try {
    const signalsRef = db.collection('signals');
    const q = signalsRef.orderBy('createdAt', 'desc').limit(1);
    const querySnapshot = await q.get();
    if (!querySnapshot.empty) {
        lastSignal = querySnapshot.docs[0].data();
        console.log('Successfully loaded last signal from DB:', lastSignal);
    }
  } catch(error) {
      console.error("Could not load last signal from DB on startup.", error);
  }


  await fetchLatestCandle(); // Initial fetch
  
  // Set up intervals
  setInterval(fetchLatestCandle, DATA_REFRESH_INTERVAL);
  setInterval(processDataAndGenerateSignal, DATA_REFRESH_INTERVAL + 1000); // Run slightly after fetch
}

main();
