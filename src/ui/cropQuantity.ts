const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** Long debug stocks must still fit the cards' fixed label insets. */
export const cropQuantity = (amount: number): string => amount < 1000000 ? String(amount) : compact.format(amount);
