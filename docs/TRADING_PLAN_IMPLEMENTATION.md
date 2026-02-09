# Trading Plan Frontend Implementation

## Overview

The Trading Plan page displays real-time trading data from the backend, showing the previous completed bar's calculated values and tracking level crossings.

---

## Key Features

### 1. Live Mode with Latest Bar Data

The component fetches the latest completed bar from the database (not the forming bar) to display calculated values.

**File:** `frontend/src/components/TradingPlan.jsx`

```javascript
// Fetch latest bar data
const response = await api.getCalculatedValues({
  symbol: selectedSymbol,
  timeframe: selectedTimeframe,
  limit: 1,
  offset: 0,  // Latest bar in DB = last completed bar
});
```

### 2. Trade Logs Persistence

Trade logs are fetched from the database when switching between historical and live views, ensuring logs persist across sessions.

```javascript
// Fetch existing trade logs for the current bar from the database
try {
  const barTs = response.data[0].timestamp_uk_formatted;
  if (barTs) {
    const logsResp = await api.getTradeLogs('XAUUSD', selectedTimeframe, barTs);
    if (logsResp.success && logsResp.logs) {
      transformedData.tradeLogs = logsResp.logs;
    } else {
      transformedData.tradeLogs = [];
    }
  } else {
    transformedData.tradeLogs = [];
  }
} catch (logErr) {
  console.debug('Could not fetch trade logs for live bar:', logErr);
  transformedData.tradeLogs = [];
}
```

### 3. Timestamp Display

All timestamps are displayed in broker time (EET) as received from the backend. No frontend timezone conversion is performed.

---

## Data Flow

```
Backend (Streaming Service)
         ↓
WebSocket broadcast with broker time timestamps
         ↓
Frontend receives data
         ↓
Display as-is (no conversion)
```

---

## Component Structure

```
TradingPlan.jsx
├── Header (Symbol, Timeframe selectors)
├── Price Data Section
│   ├── Previous Close
│   ├── High / Low
│   └── Current Price (Bid/Ask)
├── Technical Indicators
│   ├── ATR, Range, JGD, JWD
│   └── D Pattern
├── Channel Levels
│   ├── Rising Channel (Fibonacci levels)
│   └── Falling Channel (Fibonacci levels)
└── Trade Logs Table
    └── Level crossings with timestamps
```

---

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/calculated-values` | Fetch calculated values for symbol/timeframe |
| `GET /api/trade-logs/{symbol}/{timeframe}/{timestamp}` | Fetch trade logs for specific bar |
| WebSocket `/ws` | Real-time tick updates and level crossings |

---

## State Management

```javascript
const [planData, setPlanData] = useState(null);      // Current trading plan data
const [apiData, setApiData] = useState(null);        // Raw API response
const [isLiveMode, setIsLiveMode] = useState(true);  // Live vs Historical mode
const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
const [selectedTimeframe, setSelectedTimeframe] = useState('H1');
```

---

## WebSocket Updates

The component subscribes to WebSocket for real-time updates:

1. **Tick Updates** - Current bid/ask prices
2. **Level Crossings** - New trade log entries when price crosses a level
3. **Bar Completion** - Notification when a new bar completes

---

## Timestamp Format

All timestamps are displayed in the format: `YYYY-MM-DD HH:MM:SS`

Example: `2026-02-06 10:00:00`

This matches the MT5 terminal display exactly.

---

## Error Handling

```javascript
if (!response.success || response.data.length === 0) {
  setError('No trading plan data available. If markets are closed, the last active plan will appear once data has been recorded.');
  setPlanData(null);
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `TradingPlan.jsx` | Main component |
| `api.js` | API client functions |
| `websocket.js` | WebSocket connection management |

---

## Date: February 2026
