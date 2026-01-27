import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle } from 'lucide-react';
import { FIB_LEVELS, getTradingPlan, getAvailableDates } from '../data/tradingPlanMockData';

const TradingPlan = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState('');

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  const handleLoadPlan = () => {
    setError('');
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    const data = getTradingPlan(selectedDate);
    if (!data) {
      setError(`No trading plan found for ${selectedDate}`);
      setPlanData(null);
      return;
    }
    setPlanData(data);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Trading Plan
        </h1>
        <p className="text-gray-500">
          View the 1 Hour XAUUSD trading plan diagram by date
        </p>
      </div>

      {/* Date Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 rounded-2xl"
        style={glassStyle}
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-gray-900 text-sm font-medium min-w-[200px] hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>
        <motion.button
          onClick={handleLoadPlan}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Calendar size={18} />
          Load Plan
        </motion.button>

        {/* Show available dates hint */}
        <div className="text-xs text-gray-400 sm:ml-auto">
          Available: {getAvailableDates().join(', ')}
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Trading Plan Diagram */}
      {planData && <TradingPlanDiagram data={planData} />}

      {/* Empty state */}
      {!planData && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center">
            Select a date to view the trading plan diagram
          </p>
        </div>
      )}
    </div>
  );
};

const formatPrice = (price) => {
  if (price === null || price === undefined) return '';
  return price.toFixed(2);
};

// The spreadsheet-style diagram
const TradingPlanDiagram = ({ data }) => {
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  const totalCols = FIB_LEVELS.length; // 9

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl overflow-hidden"
      style={glassStyle}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {/* Left info column */}
              <col style={{ width: '80px' }} />
              {/* Fib level columns */}
              {FIB_LEVELS.map((_, i) => (
                <col key={i} style={{ width: `${(100 - 14) / totalCols}%` }} />
              ))}
              {/* Right date column */}
              <col style={{ width: '80px' }} />
            </colgroup>

            {/* ===== HEADER ROWS ===== */}
            <thead>
              {/* Title row */}
              <tr>
                <th className="border border-gray-400 bg-gray-100 text-[10px] text-gray-600 font-semibold p-1">
                  SCRIP
                </th>
                <th
                  colSpan={totalCols}
                  className="border border-gray-400 text-center text-sm font-bold text-gray-900 p-2"
                  style={{ background: 'linear-gradient(to right, #fbbf24, #f59e0b)' }}
                >
                  {data.timeframe} TRADING PLAN
                </th>
                <th className="border border-gray-400 bg-gray-100 text-[10px] text-gray-600 font-medium p-1 text-center">
                  {data.dates[0] || ''}
                </th>
              </tr>

              {/* Fib levels row */}
              <tr>
                <td className="border border-gray-400 bg-gray-200 text-[10px] font-bold text-gray-700 p-1 text-center">
                  {data.symbol}
                </td>
                {FIB_LEVELS.map((level) => (
                  <th
                    key={level}
                    className="border border-gray-400 text-[10px] font-bold text-white p-1.5 text-center whitespace-nowrap"
                    style={{ background: '#dc2626' }}
                  >
                    {level}
                  </th>
                ))}
                <td className="border border-gray-400 bg-gray-200 text-[10px] text-gray-600 font-medium p-1 text-center">
                  {data.dates[1] || ''}
                </td>
              </tr>
            </thead>

            <tbody>
              {/* ===== RC (Rising Channel) SECTION ===== */}
              {data.rc.rows.map((row, rowIdx) => (
                <tr key={`rc-${rowIdx}`}>
                  {/* Left info cell */}
                  <td className="border border-gray-300 bg-white text-[10px] font-mono text-gray-700 p-1 text-right">
                    {rowIdx === 0 && data.info.closingPrice ? formatPrice(data.info.closingPrice) : ''}
                    {rowIdx === 1 && data.info.changeValue ? formatPrice(data.info.changeValue) : ''}
                    {rowIdx === 2 && data.info.changePoints ? data.info.changePoints : ''}
                    {rowIdx === 3 && data.info.changePercent !== undefined ? `${data.info.changePercent}%` : ''}
                  </td>
                  {/* Fib value cells */}
                  {row.values.map((val, colIdx) => (
                    <td
                      key={`rc-${rowIdx}-${colIdx}`}
                      className={`border border-gray-300 text-[11px] font-mono text-center p-1 ${
                        val !== null
                          ? row.highlighted[colIdx]
                            ? 'bg-green-300 text-green-950 font-bold'
                            : 'text-gray-900'
                          : ''
                      }`}
                    >
                      {val !== null ? formatPrice(val) : ''}
                    </td>
                  ))}
                  {/* Right date cell */}
                  <td className="border border-gray-300 bg-white text-[10px] text-gray-500 p-1 text-center">
                    {rowIdx === 0 ? '' : ''}
                  </td>
                </tr>
              ))}

              {/* ===== MIDDLE REFERENCE SECTION ===== */}
              {/* Header row: fib cols 1-3 empty, 4-6 = left headers, 7 = gap, 8-9 = right headers */}
              <tr>
                <td className="border border-gray-400 bg-gray-100 p-0.5" />
                {/* Fib cols 1-3 empty */}
                <td colSpan={3} className="border border-gray-400 bg-white p-0.5" />
                {/* Left reference headers: BDP-WDP, DP, 2+2 at fib cols 4,5,6 */}
                {data.referenceLevels.left.headers.map((header) => (
                  <td key={header} className="border border-gray-400 bg-green-300 text-[10px] font-bold text-gray-900 p-1 text-center">
                    {header}
                  </td>
                ))}
                {/* Gap at fib col 7 */}
                <td className="border border-gray-400 bg-white p-0.5" />
                {/* Right reference headers: JGD, JWD at fib cols 8,9 */}
                {data.referenceLevels.right.headers.map((header) => (
                  <td key={header} className="border border-gray-400 bg-green-300 text-[10px] font-bold text-gray-900 p-1 text-center">
                    {header}
                  </td>
                ))}
                {/* Right date cell */}
                <td className="border border-gray-400 bg-white p-0.5" />
              </tr>

              {/* Reference level value rows */}
              {data.referenceLevels.left.rows.map((leftRow, rowIdx) => (
                <tr key={`ref-${rowIdx}`}>
                  <td className="border border-gray-300 bg-white p-0.5" />
                  {/* Fib cols 1-3 empty */}
                  <td colSpan={3} className="border border-gray-300 bg-white p-0.5" />
                  {/* Left values (3 cells for BDP-WDP, DP, 2+2) */}
                  {leftRow.map((val, i) => (
                    <td
                      key={`ref-l-${rowIdx}-${i}`}
                      className={`border border-gray-300 text-[11px] font-mono font-bold text-center p-1 ${
                        val !== null ? 'bg-green-100 text-green-900' : ''
                      }`}
                    >
                      {val !== null ? formatPrice(val) : ''}
                    </td>
                  ))}
                  {/* Gap at fib col 7 */}
                  <td className="border border-gray-300 bg-white p-0.5" />
                  {/* Right values (2 cells for JGD, JWD) */}
                  {data.referenceLevels.right.rows[rowIdx]?.map((val, i) => (
                    <td
                      key={`ref-r-${rowIdx}-${i}`}
                      className={`border border-gray-300 text-[11px] font-mono font-bold text-center p-1 ${
                        val !== null ? 'bg-green-100 text-green-900' : ''
                      }`}
                    >
                      {val !== null ? formatPrice(val) : ''}
                    </td>
                  ))}
                  {/* Right date cell */}
                  <td className="border border-gray-300 bg-white p-0.5" />
                </tr>
              ))}

              {/* ===== FC (Falling Channel) SECTION ===== */}
              {data.fc.rows.map((row, rowIdx) => (
                <tr key={`fc-${rowIdx}`}>
                  {/* Left info cell */}
                  <td className="border border-gray-300 bg-white p-1" />
                  {/* Fib value cells */}
                  {row.values.map((val, colIdx) => (
                    <td
                      key={`fc-${rowIdx}-${colIdx}`}
                      className={`border border-gray-300 text-[11px] font-mono text-center p-1 ${
                        val !== null
                          ? row.highlighted[colIdx]
                            ? 'bg-red-100 text-red-700 font-bold'
                            : 'text-red-600'
                          : ''
                      }`}
                    >
                      {val !== null ? formatPrice(val) : ''}
                    </td>
                  ))}
                  {/* Right date cell */}
                  <td className="border border-gray-300 bg-white p-1" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default TradingPlan;
