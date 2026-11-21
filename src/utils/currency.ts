/**
 * Formats integer paise into a standard INR currency string (or specified currency)
 * e.g. 10050 paise -> "₹100.50", 4500000 paise -> "₹45,000.00"
 */
export const formatPaiseToRupees = (
  paise: number,
  options?: { showSymbol?: boolean; showDecimals?: boolean }
): string => {
  const { showSymbol = true, showDecimals = true } = options || {};
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);

  const rupees = Math.floor(absPaise / 100);
  const fraction = absPaise % 100;

  // Indian number formatting: 12,34,567
  const rupeesStr = rupees.toLocaleString('en-IN');
  const fractionStr = fraction.toString().padStart(2, '0');

  const formattedAmount = showDecimals ? `${rupeesStr}.${fractionStr}` : rupeesStr;
  const symbol = showSymbol ? '₹' : '';

  return `${isNegative ? '-' : ''}${symbol}${formattedAmount}`;
};

/**
 * Converts user decimal input string (e.g. "120.50") into integer paise (12050)
 */
export const parseRupeesToPaise = (rupeesStr: string): number => {
  const cleanStr = rupeesStr.replace(/[^0-9.]/g, '');
  if (!cleanStr) return 0;

  const parts = cleanStr.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  let frac = 0;

  if (parts.length > 1) {
    const fractionPart = parts[1].slice(0, 2).padEnd(2, '0');
    frac = parseInt(fractionPart, 10);
  }

  return whole * 100 + frac;
};
