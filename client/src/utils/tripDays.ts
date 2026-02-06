import { ImageInfo } from '../api/client';

/**
 * Trip Days Utility
 *
 * Groups photos by day based on their EXIF dateTaken field.
 * Used when an album has trip_days.txt enabled.
 */

export interface DayGroup {
  /** Day number starting from 1 */
  dayNumber: number;
  /** Formatted date string (e.g., "January 15, 2024") */
  dateLabel: string;
  /** ISO date string for sorting (YYYY-MM-DD) */
  dateKey: string;
  /** Photos taken on this day */
  images: ImageInfo[];
}

/**
 * Parse a dateTaken string (which may contain " at ") into a Date object
 */
function parseDateTaken(dateStr: string): Date | null {
  const parsed = new Date(dateStr.replace(' at ', ' '));
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Get the date key (YYYY-MM-DD) from a dateTaken string
 */
function getDateKey(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const date = parseDateTaken(dateStr);
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Format a date key into a human-readable label
 */
function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00'); // Use noon to avoid timezone issues
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Group images by day based on their EXIF dateTaken field.
 * Images without a date are grouped into an "Unknown Date" group at the end.
 *
 * @param images - Array of images to group
 * @returns Array of day groups sorted chronologically
 */
export function groupImagesByDay(images: ImageInfo[]): DayGroup[] {
  // Group images by date key
  const groups = new Map<string, ImageInfo[]>();
  const unknownDateImages: ImageInfo[] = [];

  for (const img of images) {
    const dateKey = getDateKey(img.exif?.dateTaken);
    if (dateKey) {
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(img);
    } else {
      unknownDateImages.push(img);
    }
  }

  // Sort date keys chronologically
  const sortedKeys = Array.from(groups.keys()).sort();

  // Build day groups
  const dayGroups: DayGroup[] = sortedKeys.map((dateKey, index) => ({
    dayNumber: index + 1,
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    images: groups.get(dateKey)!,
  }));

  // Add unknown date group if there are any
  if (unknownDateImages.length > 0) {
    dayGroups.push({
      dayNumber: dayGroups.length + 1,
      dateKey: 'unknown',
      dateLabel: 'Unknown Date',
      images: unknownDateImages,
    });
  }

  return dayGroups;
}

/**
 * Get unique day keys from images for filtering in map view
 */
export function getDayKeys(images: ImageInfo[]): { dateKey: string; dateLabel: string; dayNumber: number }[] {
  const groups = groupImagesByDay(images);
  return groups.map(g => ({
    dateKey: g.dateKey,
    dateLabel: g.dateLabel,
    dayNumber: g.dayNumber,
  }));
}
