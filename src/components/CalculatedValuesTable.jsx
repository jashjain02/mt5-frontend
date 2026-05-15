import { useState } from 'react';

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
    <div
      className="absolute z-50 p-3 text-xs rounded-xl shadow-card border border-white/[0.08] min-w-[250px] max-w-[350px] pointer-events-none"
      style={{
        background: '#0d1421',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '8px',
      }}
    >
      <div className="font-semibold text-accent mb-2">{data.label}</div>
      <div className="text-text-muted mb-2 italic text-[10px]">{data.formula}</div>
      <div className="space-y-1">
        <div className="font-medium text-text-muted mb-1">Input Values:</div>
        {data.inputs.map((input, idx) => (
          <div key={idx} className="flex justify-between gap-4">
            <span className="text-text-dim">{input.name}:</span>
            <span className="font-mono text-accent">
              {typeof input.value === 'number' ? input.value.toFixed(5) : input.value || 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const fibLevels = ['14.60%', '23.60%', '38.20%', '61.80%', '100.00%', '138.20%', '161.80%', '261.80%', '423.60%'];

const formatCalcValue = (value) => {
  if (value === null || value === undefined) return '-';
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v === 'number') return v.toFixed(5);
  return v ?? '-';
};

const CalculatedValuesTable = ({ data, isLoading, symbol, timeframe, formatTimestamp, formatPrice }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          <span className="mt-3 text-text-muted text-sm">Loading data...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <span className="text-4xl mb-3">📊</span>
          <p className="text-sm">No data available for {symbol} - {timeframe}</p>
          <p className="text-xs mt-1 text-text-dim">Select a date range and click Search</p>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {/* OHLCV Columns */}
              <th className="text-left py-3 px-3 font-semibold text-text-muted uppercase tracking-wider sticky left-0 bg-navy-800 z-10 whitespace-nowrap">Timestamp</th>
              <th className="text-right py-3 px-3 font-semibold text-text-muted uppercase tracking-wider">Open</th>
              <th className="text-right py-3 px-3 font-semibold text-text-muted uppercase tracking-wider">High</th>
              <th className="text-right py-3 px-3 font-semibold text-text-muted uppercase tracking-wider">Low</th>
              <th className="text-right py-3 px-3 font-semibold text-text-muted uppercase tracking-wider">Close</th>
              <th className="text-right py-3 px-3 font-semibold text-text-muted uppercase tracking-wider">Volume</th>
              <th className="text-right py-3 px-3 font-semibold text-text-muted uppercase tracking-wider">Change %</th>

              {/* Calculated Fields */}
              <th className="text-right py-3 px-3 font-semibold text-accent/70 uppercase tracking-wider bg-accent/5">ATR</th>
              <th className="text-right py-3 px-3 font-semibold text-accent/70 uppercase tracking-wider bg-accent/5">RANGE</th>
              <th className="text-right py-3 px-3 font-semibold text-accent/70 uppercase tracking-wider bg-accent/5">JGD</th>
              <th className="text-right py-3 px-3 font-semibold text-accent/70 uppercase tracking-wider bg-accent/5">JWD</th>
              <th className="text-right py-3 px-3 font-semibold text-accent/70 uppercase tracking-wider bg-accent/5">D Pat</th>
              <th className="text-right py-3 px-3 font-semibold text-accent/70 uppercase tracking-wider bg-accent/5">ABS RANGE</th>
              <th className="text-right py-3 px-3 font-semibold text-accent/70 uppercase tracking-wider bg-accent/5">Buffer</th>

              {/* Rising Channel */}
              {fibLevels.map((level) => (
                <th key={`rc-${level}`} className="text-right py-3 px-2 font-semibold text-accent/60 uppercase tracking-wider bg-accent/[0.04] whitespace-nowrap">
                  RC {level}
                </th>
              ))}

              {/* Falling Channel */}
              {fibLevels.map((level) => (
                <th key={`fc-${level}`} className="text-right py-3 px-2 font-semibold text-negative/60 uppercase tracking-wider bg-negative/[0.04] whitespace-nowrap">
                  FC {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.timestamp_uk || row.timestamp || index}
                className={`border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors ${
                  index === 0 && row._isNew ? 'bg-accent/[0.05]' : ''
                }`}
              >
                {/* Timestamp (sticky) */}
                <td className={`py-2.5 px-3 text-text-muted font-mono whitespace-nowrap sticky left-0 z-10 ${
                  index === 0 && row._isNew ? 'bg-accent/10' : 'bg-navy-900'
                }`}>
                  {formatTimestamp(row)}
                  {index === 0 && row._isNew && <span className="ml-2 text-accent text-xs font-semibold">NEW</span>}
                </td>

                {/* OHLCV Data */}
                <td className="py-2.5 px-3 text-text-base text-right font-medium">{row.open != null ? formatPrice(row.open) : '-'}</td>
                <td className="py-2.5 px-3 text-accent text-right font-medium">{row.high != null ? formatPrice(row.high) : '-'}</td>
                <td className="py-2.5 px-3 text-negative text-right font-medium">{row.low != null ? formatPrice(row.low) : '-'}</td>
                <td className="py-2.5 px-3 text-text-base text-right font-medium">{row.close != null ? formatPrice(row.close) : '-'}</td>
                <td className="py-2.5 px-3 text-text-muted text-right">{row.volume?.toLocaleString() || '-'}</td>
                <td className={`py-2.5 px-3 text-right font-semibold ${
                  row.changePositive ? 'text-accent' : row.change ? 'text-negative' : 'text-text-dim'
                }`}>
                  {row.change || '-'}
                </td>

                {/* Calculated Fields with Tooltips */}
                {['atr', 'range', 'jgd', 'jwd', 'd_pat', 'abs_range', 'buffer'].map((field) => (
                  <td
                    key={field}
                    className="py-2.5 px-3 text-text-muted text-right bg-accent/[0.03] relative cursor-help"
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
                  <td key={`rc-${level}-${index}`} className="py-2.5 px-2 text-accent/70 text-right bg-accent/[0.02]">
                    {formatCalcValue(row.rising_channel?.[level])}
                  </td>
                ))}

                {/* Falling Channel Values */}
                {fibLevels.map((level) => (
                  <td key={`fc-${level}-${index}`} className="py-2.5 px-2 text-negative/70 text-right bg-negative/[0.02]">
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
