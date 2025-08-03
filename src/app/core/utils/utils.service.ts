export class UtilsService {
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static validateAndParseDate(dateString: string): Date {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }

    return date;
  }

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

  static allItemsMeet(
    items: any[],
    condition: (item: any) => boolean,
  ): boolean {
    return items.every(condition);
  }
}
