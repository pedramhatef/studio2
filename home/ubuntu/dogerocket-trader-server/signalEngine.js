// Simple Moving Average - A correct and robust implementation
const calculateSMA = (data, period) => {
    if (data.length < period) return Array(data.length).fill(null);
    const sma = Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
        const window = data.slice(i - period + 1, i + 1);
        const sum = window.reduce((acc, val) => acc + val, 0);
        sma[i] = sum / period;
    }
    return sma;
};


// Relative Strength Index
const calculateRSI = (data, period = 14) => {
    if (data.length <= period) return Array(data.length).fill(null);
    let rsi = Array(data.length).fill(null);
    let gains = [];
    let losses = [];

    // Calculate initial changes
    for (let i = 1; i <= period; i++) {
        const change = data[i] - data[i - 1];
        if (change > 0) {
            gains.push(change);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(change));
        }
    }

    let avgGain = gains.reduce((acc, val) => acc + val, 0) / period;
    let avgLoss = losses.reduce((acc, val) => acc + val, 0) / period;

    let rs = avgLoss > 0 ? avgGain / avgLoss : 0;
    rsi[period] = 100 - (100 / (1 + rs));

    // Calculate subsequent RSI values
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        let currentGain = change > 0 ? change : 0;
        let currentLoss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
        
        rs = avgLoss > 0 ? avgGain / avgLoss : 0;
        rsi[i] = 100 - (100 / (1 + rs));
    }
    
    return rsi;
};


// Calculate all indicators
function calculateIndicators(chartData) {
    const closePrices = chartData.map(p => p.close);
    
    // RSI
    const rsi = calculateRSI(closePrices, 14);

    // WaveTrend
    const ap = chartData.map(p => (p.high + p.low + p.close) / 3);
    const esa = calculateSMA(ap, 10);
    const d = ap.map((val, i) => (esa[i] !== null ? Math.abs(val - esa[i]) : null));
    const ci = calculateSMA(d, 10).map((val, i) => val !== null && esa[i] !== null ? (ap[i] - esa[i]) / (0.015 * val) : null);
    const wt1 = calculateSMA(ci, 21);
    const wt2 = calculateSMA(wt1, 4);

    return { rsi, wt1, wt2 };
}

function generateSignal(chartData, indicators, lastSignal) {
    const lastIndex = chartData.length - 1;
    // We need at least two points to detect a crossover
    if (lastIndex < 1) return null;

    const { wt1, wt2 } = indicators;

    // Current values
    const lastWt1 = wt1[lastIndex];
    const lastWt2 = wt2[lastIndex];

    // Previous values
    const prevWt1 = wt1[lastIndex - 1];
    const prevWt2 = wt2[lastIndex - 1];
    
    // Ensure we have valid indicator data to proceed
    if (lastWt1 === null || lastWt2 === null || prevWt1 === null || prevWt2 === null) {
        return null;
    }

    const currentPrice = chartData[lastIndex].close;
    const currentTime = chartData[lastIndex].time;

    let newSignal = null;

    const isBuyCrossover = prevWt1 < prevWt2 && lastWt1 > lastWt2;
    const isSellCrossover = prevWt1 > prevWt2 && lastWt1 < lastWt2;

    // --- BUY SIGNAL LOGIC ---
    // Condition: WaveTrend crosses up its signal line in the oversold area.
    if (isBuyCrossover && lastWt1 < -60) {
        // Only generate a BUY if the last signal was a SELL
        if (!lastSignal || lastSignal.type === 'SELL') {
            let level;
            if (lastWt1 < -70) level = 'High';
            else if (lastWt1 < -65) level = 'Medium';
            else level = 'Low';

            newSignal = { type: 'BUY', level, price: currentPrice, time: currentTime };
        }
    }
    
    // --- SELL SIGNAL LOGIC ---
    // Condition: WaveTrend crosses down its signal line in the overbought area.
    else if (isSellCrossover && lastWt1 > 60) {
        // Only generate a SELL if the last signal was a BUY
        if (!lastSignal || lastSignal.type === 'BUY') {
            let level;
            if (lastWt1 > 70) level = 'High';
            else if (lastWt1 > 65) level = 'Medium';
            else level = 'Low';
            
            newSignal = { type: 'SELL', level, price: currentPrice, time: currentTime };
        }
    }
    
    return newSignal;
}


module.exports = { calculateIndicators, generateSignal };
