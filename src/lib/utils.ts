import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(timestamp: any) {
  if (!timestamp) return 'N/A'
  
  try {
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

export const safelyGetDate = (dateField: any): Date => {
  if (!dateField) return new Date();
  
  try {
    // If it's a Firestore timestamp with toDate method
    if (typeof dateField.toDate === 'function') {
      return dateField.toDate();
    }
    // If it's an ISO string
    else if (typeof dateField === 'string') {
      return new Date(dateField);
    }
    // If it's already a Date
    else if (dateField instanceof Date) {
      return dateField;
    }
    // Fallback
    else {
      return new Date();
    }
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date();
  }
};
