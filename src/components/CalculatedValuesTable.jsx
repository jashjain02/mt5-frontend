import { useState } from 'react';

// Calculation Tooltip Component
const CalculationTooltip = ({ field, row }) => {
  const getInputs = () => {
    switch(field) {
      case 'range':
        return {
          label: 'RANGE',
          formula: 'high - low',
          inputs: [
            { name: 'high', value: row.high },
            { name: 'low', value: row.low }
          ]
        };
      case 'jgd':
        return {
          label: 'JGD',
          formula: 'ceil((high - (abs_range * 0.382)), 0.1)',
          inputs: [
            { name: 'high', value: row.high },
            { name: 'abs_range', value: row.abs_range }
          ]
        };
      case 'jwd':
        return {
          label: 'JWD',
          formula: 'floor((low + (abs_range * 0.382)), 0.1)',
          inputs: [
            { name: 'low', value: row.low },
            { name: 'abs_range', value: row.abs_range }
          ]
        };
      case 'buffer':
        return {
          label: 'Buffer',
          formula: 'ceil((range * 0.073), 0.1)',
          inputs: [
            { name: 'range', value: row.range }
          ]
        };
      case 'abs_range':
        return {
          label: 'ABS RANGE',
          formula: 'max(high-low, abs(high-prev_close), abs(low-prev_close))',
          inputs: [
            { name: 'high', value: row.high },
            { name: 'low', value: row.low },
            { name: 'prev_close', value: row.prev_close }
          ]
        };
      case 'atr':
        return {
          label: 'ATR',
          formula: 'avg(abs_range, 0, 13)',
          inputs: [
            { name: 'current abs_range', value: row.abs_range },
            { name: 'previous 13 values', value: row.prev_abs_range?.length > 0 ? row.prev_abs_range.join(', ') : 'N/A' }
          ]
        };
      case 'd_pat':
        return {
          label: 'D Pattern',
          formula: "'2+2' if jwd > prev_jwd else ('3+1' if jgd < prev_jgd else '2+1')",
          inputs: [
            { name: 'jwd', value: row.jwd },
            { name: 'jgd', value: row.jgd },
            { name: 'prev_jwd', value: row.prev_jwd },
            { name: 'prev_jgd', value: row.prev_jgd }
          ]
        };
      default:
        return null;
    }
  };

  const data = getInputs();
  if (!data) return null;

  return (
    <div className="absolute z-50 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl border border-gray-700 min-w-[250px] max-w-[350px] pointer-events-none"
         style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }}>
      <div className="font-semibold text-blue-300 mb-2">{data.label}</div>
      <div className="text-gray-400 mb-2 italic text-[10px]">{data.formula}</div>
      <div className="space-y-1">
        <div className="font-medium text-gray-300 mb-1">Input Values:</div>
        {data.inputs.map((input, idx) => (
          <div key={idx} className="flex justify-between gap-4">
            <span className="text-gray-400">{input.name}:</span>
            <span className="font-mono text-green-300">
              {typeof input.value === 'number' ? input.value.toFixed(5) : input.value || 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Fibonacci levels for channels
const fibLevels = ['14.60%', '23.60%', '38.20%', '61.80%', '100.00%', '138.20%', '161.80%', '261.80%', '423.60%'];

const formatCalcValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toFixed(5);
  return value;
};

const CalculatedValuesTable = ({ data, isLoading, symbol, timeframe, loadingProgress, formatTimestamp, formatPrice }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="mt-3 text-gray-500">
            {loadingProgress.total > 0
              ? `Loading timeframes... ${loadingProgress.current}/${loadingProgress.total}`
              : 'Loading data...'}
          </span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <span className="text-4xl mb-3">📊</span>
          <p>No data available for {symbol} - {timeframe}</p>
          <p className="text-sm mt-1">Try selecting a different symbol or timeframe</p>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200/50 bg-gray-50/50">
              {/* OHLCV Columns */}
              <th className="text-left py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50/90 z-10 whitespace-nowrap">Timestamp</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">Open</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">High</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">Low</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">Close</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">Volume</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider">Change %</th>

              {/* Calculated Fields */}
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">ATR</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">RANGE</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">JGD</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">JWD</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">D Pat</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">ABS RANGE</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700 uppercase tracking-wider bg-blue-50/50">Buffer</th>

              {/* Rising Channel */}
              {fibLevels.map((level) => (
                <th key={`rc-${level}`} className="text-right py-3 px-2 font-semibold text-green-700 uppercase tracking-wider bg-green-50/50 whitespace-nowrap">
                  RC {level}
                </th>
              ))}

              {/* Falling Channel */}
              {fibLevels.map((level) => (
                <th key={`fc-${level}`} className="text-right py-3 px-2 font-semibold text-red-700 uppercase tracking-wider bg-red-50/50 whitespace-nowrap">
                  FC {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.timestamp_uk || row.timestamp || index}
                className={`border-b border-gray-100/50 last:border-0 hover:bg-white/50 transition-colors ${
                  index === 0 && row._isNew ? 'bg-green-50/30' : ''
                }`}
              >
                {/* Timestamp (sticky) */}
                <td className={`py-2.5 px-3 text-gray-600 font-mono whitespace-nowrap sticky left-0 z-10 ${
                  index === 0 && row._isNew ? 'bg-green-50/90' : 'bg-white/90'
                }`}>
                  {formatTimestamp(row)}
                  {index === 0 && row._isNew && <span className="ml-2 text-green-600 text-xs font-semibold">NEW</span>}
                </td>

                {/* OHLCV Data */}
                <td className="py-2.5 px-3 text-gray-900 text-right font-medium">{row.open != null ? formatPrice(row.open) : '-'}</td>
                <td className="py-2.5 px-3 text-green-600 text-right font-medium">{row.high != null ? formatPrice(row.high) : '-'}</td>
                <td className="py-2.5 px-3 text-red-600 text-right font-medium">{row.low != null ? formatPrice(row.low) : '-'}</td>
                <td className="py-2.5 px-3 text-gray-900 text-right font-medium">{row.close != null ? formatPrice(row.close) : '-'}</td>
                <td className="py-2.5 px-3 text-gray-500 text-right">{row.volume?.toLocaleString() || '-'}</td>
                <td className={`py-2.5 px-3 text-right font-semibold ${
                  row.changePositive ? 'text-green-600' : row.change ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {row.change || '-'}
                </td>

                {/* Calculated Fields with Tooltips */}
                {['atr', 'range', 'jgd', 'jwd', 'd_pat', 'abs_range', 'buffer'].map((field) => (
                  <td
                    key={field}
                    className="py-2.5 px-3 text-gray-700 text-right bg-blue-50/30 relative cursor-help"
                    onMouseEnter={() => setHoveredCell({ field, rowIndex: index })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {formatCalcValue(row[field])}
                    {hoveredCell?.field === field && hoveredCell?.rowIndex === index && (
                      <CalculationTooltip field={field} row={row} />
                    )}
                  </td>
                ))}

                {/* Rising Channel Values */}
                {fibLevels.map((level) => (
                  <td key={`rc-${level}-${index}`} className="py-2.5 px-2 text-green-700 text-right bg-green-50/30">
                    {formatCalcValue(row.rising_channel?.[level])}
                  </td>
                ))}

                {/* Falling Channel Values */}
                {fibLevels.map((level) => (
                  <td key={`fc-${level}-${index}`} className="py-2.5 px-2 text-red-700 text-right bg-red-50/30">
                    {formatCalcValue(row.falling_channel?.[level])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CalculatedValuesTable;
