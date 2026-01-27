// Fibonacci retracement/extension levels used as column headers
export const FIB_LEVELS = [
  '14.60%', '23.60%', '38.20%', '61.80%', '100.00%',
  '138.20%', '161.80%', '261.80%', '423.60%'
];

// Mock trading plan data keyed by date (YYYY-MM-DD)
// RC = Rising Channel (green), FC = Falling Channel (red)
// Each row has `values` (9 entries matching FIB_LEVELS, null = empty cell)
// and `highlighted` (boolean array marking which cells get stronger color)
export const TRADING_PLAN_DATA = {
  '2025-05-22': {
    symbol: 'XAUUSD',
    timeframe: '1 HOUR',
    date: '22-May-29',

    info: {
      closingPrice: 3805.12,
      changeValue: 6.51,
      changePoints: 1.25,
      changePercent: 0.43,
    },

    // Rising Channel (upper section)
    rc: {
      rows: [
        {
          values: [null, null, null, null, null, 3829.50, 3838.25, 3858.60, null],
          highlighted: [false, false, false, false, false, false, false, false, false],
        },
        {
          values: [null, null, null, 3817.85, 3824.15, 3828.00, 3831.90, 3848.40, 3875.10],
          highlighted: [false, false, false, false, false, true, false, false, false],
        },
        {
          values: [3808.20, null, 3813.00, 3815.40, 3821.70, 3825.55, 3830.40, 3842.05, null],
          highlighted: [false, false, false, false, false, false, false, false, false],
        },
        {
          values: [3807.60, 3809.10, 3811.50, 3813.90, 3819.25, null, null, null, null],
          highlighted: [true, false, false, false, false, false, false, false, false],
        },
        {
          values: [3805.70, null, 3810.55, null, null, null, null, null, null],
          highlighted: [false, false, false, false, false, false, false, false, false],
        },
      ],
    },

    // Middle reference levels
    // Left headers align to fib columns 4,5,6 (61.80%, 100.00%, 138.20%)
    // Right headers align to fib columns 8,9 (261.80%, 423.60%)
    // Fib column 7 (161.80%) is a gap between left and right
    referenceLevels: {
      left: {
        headers: ['BDP-WDP', 'D P', '2+2'],
        rows: [
          [3791.20, null, 3802.80],
          [3785.90, null, 3798.80],
        ],
      },
      right: {
        headers: ['JGD', 'JWD'],
        rows: [
          [3791.20, 3785.90],
          [3802.80, 3798.80],
        ],
      },
    },

    // Falling Channel (lower section)
    fc: {
      rows: [
        {
          values: [3804.60, null, 3799.75, null, null, null, null, null, null],
          highlighted: [false, false, false, false, false, false, false, false, false],
        },
        {
          values: [3802.70, 3801.20, 3798.80, 3796.40, 3791.05, null, null, null, null],
          highlighted: [true, false, true, false, false, false, false, false, false],
        },
        {
          values: [3802.10, null, 3797.30, 3794.90, 3788.60, 3784.75, 3779.90, 3768.15, null],
          highlighted: [false, false, false, true, false, true, false, false, false],
        },
        {
          values: [null, null, null, 3792.45, 3786.15, 3782.30, 3778.40, 3761.80, 3735.10],
          highlighted: [false, false, false, false, false, true, false, true, true],
        },
        {
          values: [null, null, null, null, null, 3780.80, 3772.05, 3751.60, null],
          highlighted: [false, false, false, false, false, false, false, false, false],
        },
      ],
    },

    dates: ['22-May-29', '23-May-29'],
  },
};

export const getAvailableDates = () => Object.keys(TRADING_PLAN_DATA);

export const getTradingPlan = (date) => TRADING_PLAN_DATA[date] || null;
