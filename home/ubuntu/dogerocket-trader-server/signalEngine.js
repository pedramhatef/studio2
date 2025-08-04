// --- Indicator Calculation ---
const calculateSMA = (data, period) => {
    if (data.length < period) return null;
    const sum = data.slice(data.length - period).reduce((a, b) => a + b, 0);
    return sum / period;
};

const calculateEMA = (data, period) => {
    if (data.length < 2) return null;
    const k = 2 / (period + 1);
    let ema = data[0]; // Start with the first value
    for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
    }
    return ema;
};

const calculateRSI = (data, period = 14) => {
    if (data.length <= period) return null;

    let gains = 0;
    let losses = 0;

    // Initial calculation for the first period
    for (let i = 1; i <= period; i++) {
        const diff = data[i] - data[i - 1];
        if (diff > 0) {
            gains += diff;
        } else {
            losses -= diff;
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smooth for subsequent values
    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        if (diff > 0) {
            avgGain = (avgGain * (period - 1) + diff) / period;
            avgLoss = (avgLoss * (period -1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - diff) / period;
        }
    }
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

const calculateIndicators = (data, params) => {
    const closePrices = data.map(p => p.close);
    const highPrices = data.map(p => p.high);
    const lowPrices = data.map(p => p.low);
    const ap = data.map(p => (p.high + p.low + p.close) / 3);

    const esa = calculateEMA(ap, params.WT_CHANNEL_LENGTH);
    if (esa === null) return {};
    
    const d_data = ap.map((val, i) => Math.abs(val - calculateEMA(ap.slice(0, i + 1), params.WT_CHANNEL_LENGTH)));
    const d = calculateEMA(d_data, params.WT_CHANNEL_LENGTH);
    if (d === null) return {};

    const ci = ap.map((val, i) => {
        const esa_i = calculateEMA(ap.slice(0, i + 1), params.WT_CHANNEL_LENGTH);
        const d_i = calculateEMA(d_data.slice(0, i + 1), params.WT_CHANNEL_LENGTH);
        return d_i === 0 ? 0 : (val - esa_i) / (0.015 * d_i);
    });

    const wt1 = calculateEMA(ci, params.WT_AVERAGE_LENGTH);
    const wt2 = calculateSMA(ci, params.WT_SIGNAL_LENGTH);
    const trendEMA = calculateEMA(closePrices, params.EMA_TREND_PERIOD);
    const rsi = calculateRSI(closePrices, params.RSI_PERIOD);

    return { wt1, wt2, trendEMA, rsi };
};


// --- Signal Generation ---
const generateSignal = (data, lastSignal, params) => {
    if (data.length < 2) return null;

    const currentData = data.slice(0, -1);
    const lastDataPoint = data[data.length - 1];
    const prevDataPoint = data[data.length - 2];

    const { wt1: lastWt1, wt2: lastWt2, trendEMA: lastTrendEMA, rsi: lastRsi } = calculateIndicators(data, params);
    const { wt1: prevWt1, wt2: prevWt2 } = calculateIndicators(currentData, params);
    
    if (lastWt1 === null || lastWt2 === null || prevWt1 === null || prevWt2 === null || lastTrendEMA === null || lastRsi === null) {
        return null;
    }
    
    const isUptrend = lastDataPoint.close > lastTrendEMA;
    const isDowntrend = lastDataPoint.close < lastTrendEMA;
    
    // BUY Condition: Crossover in oversold area, confirmed by trend and RSI
    const isWTBuy = prevWt1 < prevWt2 && lastWt1 > lastWt2 && lastWt1 < -60;
    if (isWTBuy && isUptrend && lastRsi < 70 && lastSignal?.type !== 'BUY') {
        let level = 'Low';
        if (lastWt1 < -70) level = 'Medium';
        if (lastWt1 < -80) level = 'High';
        return { type: 'BUY', level };
    }

    // SELL Condition: Crossunder in overbought area, confirmed by trend and RSI
    const isWTSell = prevWt1 > prevWt2 && lastWt1 < lastWt2 && lastWt1 > 60;
    if (isWTSell && isDowntrend && lastRsi > 30 && lastSignal?.type !== 'SELL') {
        let level = 'Low';
        if (lastWt1 > 70) level = 'Medium';
        if (lastWt1 > 80) level = 'High';
        return { type: 'SELL', level };
    }

    return null;
};

module.exports = { generateSignal };
