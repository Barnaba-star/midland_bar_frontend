import { Pipe, PipeTransform } from '@angular/core';

/** The backend's ProductCategory: DRINK, FOOD, SHISHA or POOL (pool table games). */
export const PRODUCT_CATEGORIES = ['DRINK', 'FOOD', 'SHISHA', 'POOL'] as const;

/** The mat-icon for a product's category; anything unknown reads as a drink, as before. */
export function categoryIcon(category: string | null | undefined): string {
  switch (category) {
    case 'FOOD': return 'restaurant';
    case 'SHISHA': return 'smoking_rooms';
    case 'POOL': return 'sports_baseball';
    default: return 'local_bar';
  }
}

/** The i18n key of a product's category label. */
export function categoryLabel(category: string | null | undefined): string {
  switch (category) {
    case 'FOOD': return 'SETTING_PAGE.CATEGORY_FOOD';
    case 'SHISHA': return 'SETTING_PAGE.CATEGORY_SHISHA';
    case 'POOL': return 'SETTING_PAGE.CATEGORY_POOL';
    default: return 'SETTING_PAGE.CATEGORY_DRINK';
  }
}

@Pipe({ name: 'categoryIcon', standalone: true })
export class CategoryIconPipe implements PipeTransform {
  transform(category: string | null | undefined): string {
    return categoryIcon(category);
  }
}

@Pipe({ name: 'categoryLabel', standalone: true })
export class CategoryLabelPipe implements PipeTransform {
  transform(category: string | null | undefined): string {
    return categoryLabel(category);
  }
}
