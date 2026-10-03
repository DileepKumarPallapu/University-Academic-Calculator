/**
 * Utility to format the current date for academic reports
 * Example output: "03 October 2026"
 */
export const getFormattedCurrentDate = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Generate official Report ID for academic calculation reports
 * Format: AC-<TYPE>-YYYYMMDD-HHMMSS
 * Example: AC-SGPA-20261003-165500
 */
export const generateReportId = (
  type: string = 'REPORT',
  date: Date = new Date()
): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const cleanType = type.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `AC-${cleanType}-${yyyy}${mm}${dd}-${hh}${min}${ss}`;
};
