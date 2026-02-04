/**
 * Trading Plan Data Transformer
 * Transforms calculated values API response to Trading Plan format
 */

export const transformApiDataToTradingPlan = (apiRecord) => {
  if (!apiRecord) return null;

  const tick = apiRecord.tick || null;
  const rc = apiRecord.rising_channel || {};
  const fc = apiRecord.falling_channel || {};
  const rcAbove = apiRecord.rising_channel_above || {};
  const rcBelow = apiRecord.rising_channel_below || {};
  const fcAbove = apiRecord.falling_channel_above || {};
  const fcBelow = apiRecord.falling_channel_below || {};

  // RC rows: above (null for 23.60% and 423.60%), middle (all 9), below (null for 23.60% and 423.60%)
  const rcRows = [
    {
      values: [rcAbove['14.60%'], null, rcAbove['38.20%'], rcAbove['61.80%'], rcAbove['100.00%'], rcAbove['138.20%'], rcAbove['161.80%'], rcAbove['261.80%'], null],
      highlighted: [false, false, false, false, false, false, false, false, false]
    },
    {
      values: [rc['14.60%'], rc['23.60%'], rc['38.20%'], rc['61.80%'], rc['100.00%'], rc['138.20%'], rc['161.80%'], rc['261.80%'], rc['423.60%']],
      highlighted: [false, false, false, false, false, false, false, false, false]
    },
    {
      values: [rcBelow['14.60%'], null, rcBelow['38.20%'], rcBelow['61.80%'], rcBelow['100.00%'], rcBelow['138.20%'], rcBelow['161.80%'], rcBelow['261.80%'], null],
      highlighted: [false, false, false, false, false, false, false, false, false]
    }
  ];

  // FC rows: above (null for 23.60% and 423.60%), middle (all 9), below (null for 23.60% and 423.60%)
  const fcRows = [
    {
      values: [fcAbove['14.60%'], null, fcAbove['38.20%'], fcAbove['61.80%'], fcAbove['100.00%'], fcAbove['138.20%'], fcAbove['161.80%'], fcAbove['261.80%'], null],
      highlighted: [false, false, false, false, false, false, false, false, false]
    },
    {
      values: [fc['14.60%'], fc['23.60%'], fc['38.20%'], fc['61.80%'], fc['100.00%'], fc['138.20%'], fc['161.80%'], fc['261.80%'], fc['423.60%']],
      highlighted: [false, false, false, false, false, false, false, false, false]
    },
    {
      values: [fcBelow['14.60%'], null, fcBelow['38.20%'], fcBelow['61.80%'], fcBelow['100.00%'], fcBelow['138.20%'], fcBelow['161.80%'], fcBelow['261.80%'], null],
      highlighted: [false, false, false, false, false, false, false, false, false]
    }
  ];

  return {
    symbol: 'XAUUSD',
    timeframe: apiRecord.timeframe || 'H1',
    timestamp: apiRecord.timestamp_uk_formatted || '',
    date: apiRecord.timestamp_uk_formatted ? apiRecord.timestamp_uk_formatted.split(' ')[0] : '',

    // Calculated values for display
    calculatedValues: {
      atr: apiRecord.atr,
      range: apiRecord.range,
      jgd: apiRecord.jgd,
      jwd: apiRecord.jwd,
      d_pat: apiRecord.d_pat,
    },

    // Middle section values
    middleValues: {
      absRange: apiRecord.abs_range,
      buffer: apiRecord.buffer,
      prevClose: apiRecord.prev_close,
    },

    // Whether this is a forming (open) bar or a completed bar
    isForming: apiRecord.is_forming || false,

    // Market data — use real MT5 tick data when available, fallback to bar data
    marketData: {
      symbol: 'XAUUSD',
      high: apiRecord.high,
      low: apiRecord.low,
      close: apiRecord.is_forming ? null : apiRecord.close,
      last: tick?.last ?? apiRecord.close,
      bid: tick?.bid ?? null,
      ask: tick?.ask ?? null,
      bidHigh: tick?.bid_high ?? null,
      bidLow: tick?.bid_low ?? null,
      askHigh: tick?.ask_high ?? null,
      askLow: tick?.ask_low ?? null,
      open: apiRecord.open,
      prevClose: apiRecord.prev_close,
      spread: tick?.spread ?? null,
      change: apiRecord.close && apiRecord.prev_close ? apiRecord.close - apiRecord.prev_close : null,
    },

    // Rising Channel
    rc: { rows: rcRows },

    // Falling Channel
    fc: { rows: fcRows },

    // Reference levels (keep as mock - not in API)
    referenceLevels: {
      headers: ['BDP-WDP', '2+2'],
      rows: [[null, null], [null, null]]
    },

    // Trade logs (populated from API or WebSocket)
    tradeLogs: apiRecord.trade_logs || [],

    // Info section (keep minimal from API)
    info: {
      closingPrice: apiRecord.close,
      changeValue: null,
      changePoints: null,
      changePercent: null,
    }
  };
};
