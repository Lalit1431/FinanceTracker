import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const getTodayDateString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const formatDisplayDate = (dateStr: string): string => {
  try {
    const parsed = parseISO(dateStr);
    return format(parsed, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};

export const getCurrentMonthRange = (): { start: string; end: string; monthName: string } => {
  const now = new Date();
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
    monthName: format(now, 'MMMM yyyy'),
  };
};

export const getPreviousMonthRange = (): { start: string; end: string; monthName: string } => {
  const prev = subMonths(new Date(), 1);
  return {
    start: format(startOfMonth(prev), 'yyyy-MM-dd'),
    end: format(endOfMonth(prev), 'yyyy-MM-dd'),
    monthName: format(prev, 'MMMM yyyy'),
  };
};

export const getLast30DaysRange = (): { start: string; end: string } => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: format(thirtyDaysAgo, 'yyyy-MM-dd'),
    end: format(now, 'yyyy-MM-dd'),
  };
};

export const getCurrentYearRange = (): { start: string; end: string } => {
  const now = new Date();
  const year = now.getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
};
