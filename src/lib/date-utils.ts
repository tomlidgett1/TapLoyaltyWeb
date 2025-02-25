import { format, isValid, parseISO } from 'date-fns'

/**
 * Safely formats a date string or Date object
 * @param dateValue Any date value (string, Date, null, undefined)
 * @param formatStr Format string for date-fns (default: 'MMM d, yyyy')
 * @param fallback Fallback string if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback value
 */
export function formatDate(
  dateValue: string | Date | null | undefined,
  formatStr = 'MMM d, yyyy',
  fallback = 'N/A'
): string {
  if (!dateValue) return fallback;
  
  try {
    // If it's a string, try to parse it
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    
    // Check if the date is valid
    if (!isValid(date)) {
      return fallback;
    }
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', dateValue, error);
    return fallback;
  }
} 