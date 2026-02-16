/**
 * Trading Plan Data Transformer
 * Transforms calculated values API response to Trading Plan format
 */

const FIB_LEVELS = [
  '14.60%', '23.60%', '38.20%', '61.80%', '100.00%',
  '138.20%', '161.80%', '261.80%', '423.60%'
];

/**
 * Find where a price falls in the trading plan (RC, FC, or center)
 * @param {number} price - The price to locate
 * @param {Array} rcRows - Rising Channel rows
 * @param {Array} fcRows - Falling Channel rows
 * @returns {{ section: 'rc'|'fc'|'center', column: number, betweenLevels: [string, string] | null }}
 */
const findPricePosition = (price, rcRows, fcRows) => {
  if (price === null || price === undefined) return { section: 'center', column: -1, betweenLevels: null };

  const rcMiddle = rcRows[1].values;  // RC middle row has all 9 Fib values
  const fcMiddle = fcRows[1].values;  // FC middle row has all 9 Fib values

  // Get valid (non-null) values for range checking
  const rcValid = rcMiddle.filter(v => v !== null && v !== undefined);
  const fcValid = fcMiddle.filter(v => v !== null && v !== undefined);

  if (rcValid.length === 0 && fcValid.length === 0) {
    return { section: 'center', column: -1, betweenLevels: null };
  }

  const rcMin = rcValid.length > 0 ? Math.min(...rcValid) : Infinity;
  const rcMax = rcValid.length > 0 ? Math.max(...rcValid) : -Infinity;
  const fcMin = fcValid.length > 0 ? Math.min(...fcValid) : Infinity;
  const fcMax = fcValid.length > 0 ? Math.max(...fcValid) : -Infinity;

  // Check if price is in RC range
  if (price >= rcMin && price <= rcMax) {
    for (let i = 0; i < rcMiddle.length - 1; i++) {
      if (rcMiddle[i] !== null && rcMiddle[i + 1] !== null) {
        const lower = Math.min(rcMiddle[i], rcMiddle[i + 1]);
        const upper = Math.max(rcMiddle[i], rcMiddle[i + 1]);
        if (price >= lower && price <= upper) {
          return { section: 'rc', column: i, betweenLevels: [FIB_LEVELS[i], FIB_LEVELS[i + 1]] };
        }
      }
    }
  }

  // Check if price is in FC range
  if (price >= fcMin && price <= fcMax) {
    for (let i = 0; i < fcMiddle.length - 1; i++) {
      if (fcMiddle[i] !== null && fcMiddle[i + 1] !== null) {
        const lower = Math.min(fcMiddle[i], fcMiddle[i + 1]);
        const upper = Math.max(fcMiddle[i], fcMiddle[i + 1]);
        if (price >= lower && price <= upper) {
          return { section: 'fc', column: i, betweenLevels: [FIB_LEVELS[i], FIB_LEVELS[i + 1]] };
        }
      }
    }
  }

  // Price is in center (between RC and FC, or outside ranges)
  return { section: 'center', column: -1, betweenLevels: null };
};

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
      prevClose: apiRecord.close,
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
      prevClose: apiRecord.close,
      spread: tick?.spread ?? null,
      change: apiRecord.close && apiRecord.prev_close ? apiRecord.close - apiRecord.prev_close : null,
    },

    // Rising Channel
    rc: { rows: rcRows },

    // Falling Channel
    fc: { rows: fcRows },

    // UTP position (jgd[0]) - Uptrend Price marker
    utp: (() => {
      const price = apiRecord.jgd?.[0] ?? null;
      const position = findPricePosition(price, rcRows, fcRows);
      if (price !== null) {
        console.log(`UTP (${price}) in ${position.section} section, column ${position.column}, between ${position.betweenLevels?.join(' and ') || 'N/A'}`);
      }
      return { price, ...position, label: 'UTP' };
    })(),

    // DTP position (jwd[1]) - Downtrend Price marker
    dtp: (() => {
      const price = apiRecord.jwd?.[1] ?? null;
      const position = findPricePosition(price, rcRows, fcRows);
      if (price !== null) {
        console.log(`DTP (${price}) in ${position.section} section, column ${position.column}, between ${position.betweenLevels?.join(' and ') || 'N/A'}`);
      }
      return { price, ...position, label: 'DTP' };
    })(),

    // MUTP (Micro Uptrend Price) = jwd[0] — shown for "2+1" and "3+1"
    mutp: (() => {
      const dPat = apiRecord.d_pat;
      if (dPat === '2+1' || dPat === '3+1') {
        const price = apiRecord.jwd?.[0] ?? null;
        const position = findPricePosition(price, rcRows, fcRows);
        return { price, ...position, label: 'MUTP' };
      }
      return null;
    })(),

    // MDTP (Micro Downtrend Price) = jgd[1] — shown for "2+2"
    mdtp: (() => {
      const dPat = apiRecord.d_pat;
      if (dPat === '2+2') {
        const price = apiRecord.jgd?.[1] ?? null;
        const position = findPricePosition(price, rcRows, fcRows);
        return { price, ...position, label: 'MDTP' };
      }
      return null;
    })(),

    // Reference levels - layout varies by d_pat pattern
    referenceLevels: (() => {
      const dPat = apiRecord.d_pat;
      if (dPat === '3+1') {
        return {
          headers: ['BDP-WDP', 'DP', '3+1'],
          rows: [
            [apiRecord.jgd?.[1] ?? null, apiRecord.jwd?.[0] ?? null, apiRecord.jgd?.[0] ?? null],
            [apiRecord.jwd?.[1] ?? null, null, null],
          ],
        };
      }
      if (dPat === '2+1') {
        return {
          headers: ['BDP-WDP', '2+1'],
          rows: [
            [apiRecord.jgd?.[1] ?? null, apiRecord.jgd?.[0] ?? null],
            [apiRecord.jwd?.[1] ?? null, null],
          ],
        };
      }
      // "2+2" (default)
      return {
        headers: ['BDP-WDP', dPat],
        rows: [
          [apiRecord.jgd?.[1] ?? null, apiRecord.jgd?.[0] ?? null],
          [apiRecord.jwd?.[1] ?? null, apiRecord.jwd?.[0] ?? null],
        ],
      };
    })(),

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
