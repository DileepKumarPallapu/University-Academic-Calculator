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
