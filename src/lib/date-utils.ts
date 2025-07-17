import { format, isValid, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

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

/**
 * Formats a date string to Melbourne time with smart formatting
 * @param dateValue ISO date string (e.g., "2025-07-17T09:27:10Z")
 * @param fallback Fallback string if date is invalid (default: 'Invalid date')
 * @returns Formatted date string in Melbourne time
 */
export function formatMelbourneTime(
  dateValue: string | Date | null | undefined,
  fallback = 'Invalid date'
): string {
  if (!dateValue) return fallback;
  
  try {
    // Parse the ISO string
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    
    // Check if the date is valid
    if (!isValid(date)) {
      return fallback;
    }
    
    // Convert to Melbourne timezone
    const melbourneTime = toZonedTime(date, 'Australia/Melbourne');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const emailDate = new Date(melbourneTime.getFullYear(), melbourneTime.getMonth(), melbourneTime.getDate());
    
    // Smart formatting based on recency
    if (emailDate.getTime() === today.getTime()) {
      // Today: show just time
      return format(melbourneTime, 'h:mm a');
    } else if (emailDate.getTime() === yesterday.getTime()) {
      // Yesterday: show "Yesterday"
      return 'Yesterday';
    } else {
      // Older: show date
      return format(melbourneTime, 'MMM d');
    }
  } catch (error) {
    console.error('Error formatting Melbourne time:', dateValue, error);
    return fallback;
  }
}