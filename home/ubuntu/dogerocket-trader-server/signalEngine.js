// Simple Moving Average
const calculateSMA = (data, period) => {
    if (data.length < period) return Array(data.length).fill(null);
    let sums = [];
    let currentSum = 0;
    for (let i = 0; i < data.length; i++) {
        currentSum += data[i];
        if (i >= period) {
            currentSum -= data[i - period];
            sums.push(currentSum / period);
        } else {
            sums.push(null);
        }
    }
    // To match length, we need to prepend nulls for the initial period
    const nulls = Array(period -1).fill(null);
    return nulls.concat(sums);
};

// Relative Strength Index
const calculateRSI = (data, period = 14) => {
    if (data.length < period + 1) return Array(data.length).fill(null);
    let rsi = [];
    let avgGain = 0;
    let avgLoss = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
        const change = data[i] - data[i - 1];
        if (change > 0) {
            avgGain += change;
        } else {
            avgLoss -= change;
        }
    }
    avgGain /= period;
    avgLoss /= period;
    
    // Prepend nulls for periods where RSI is not available
    for (let i = 0; i < period; i++) {
        rsi.push(null);
    }
    
    rsi.push(100 - (100 / (1 + (avgGain / avgLoss))));

    // Calculate subsequent RSI values
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        let gain = change > 0 ? change : 0;
        let loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        
        if (avgLoss === 0) {
             rsi.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
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
    const d = esa.map((val, i) => val !== null ? Math.abs(ap[i] - val) : null);
    const ci = d.map((val, i) => val !== null && esa[i] !== null ? (ap[i] - esa[i]) / (0.015 * val) : null);
    const wt1 = calculateSMA(ci, 21);
    const wt2 = calculateSMA(wt1, 4);

    return { rsi, wt1, wt2 };
}

function generateSignal(chartData, indicators, lastSignal) {
    const lastIndex = chartData.length - 1;
    if (lastIndex < 1) return null;

    const { rsi, wt1, wt2 } = indicators;

    const lastRsi = rsi[lastIndex];
    const lastWt1 = wt1[lastIndex];
    
    if (lastRsi === null || lastWt1 === null) {
        return null;
    }

    const currentPrice = chartData[lastIndex].close;
    const currentTime = chartData[lastIndex].time;

    let newSignal = null;

    // --- BUY SIGNAL LOGIC ---
    // Condition: WaveTrend is oversold and RSI confirms it.
    if (lastWt1 < -60 && lastRsi < 53) {
        if (!lastSignal || lastSignal.type !== 'BUY') {
            let level;
            if (lastWt1 < -80) level = 'High';
            else if (lastWt1 < -70) level = 'Medium';
            else level = 'Low';

            newSignal = { type: 'BUY', level, price: currentPrice, time: currentTime };
        }
    }
    
    // --- SELL SIGNAL LOGIC ---
    // Condition: WaveTrend is overbought and RSI confirms it.
    else if (lastWt1 > 60 && lastRsi > 47) {
        if (!lastSignal || lastSignal.type !== 'SELL') {
            let level;
            if (lastWt1 > 80) level = 'High';
            else if (lastWt1 > 70) level = 'Medium';
            else level = 'Low';
            
            newSignal = { type: 'SELL', level, price: currentPrice, time: currentTime };
        }
    }

    // This check prevents saving the exact same level of signal repeatedly.
    // e.g., if a "High BUY" is generated, it won't generate another "High BUY" until a SELL happens.
    if (newSignal && lastSignal && newSignal.type === lastSignal.type && newSignal.level === lastSignal.level) {
        return null;
    }

    return newSignal;
}


module.exports = { calculateIndicators, generateSignal };
