/**
 * General-purpose utility functions for the application
 */
export class UtilsService {
  /**
   * Sleep for a specified number of milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate and parse a date string
   */
  static validateAndParseDate(dateString: string): Date {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }

    return date;
  }

  /**
   * Group items by a key
   */
  static groupBy(items: any[], getKey: (item: any) => string) {
    const groups: Record<string, any[]> = {};

    for (const item of items) {
      const key = getKey(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }

    return groups;
  }

  /**
   * Check if all items meet a condition
   */
  static allItemsMeet(
    items: any[],
    condition: (item: any) => boolean,
  ): boolean {
    return items.every(condition);
  }
}
