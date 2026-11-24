/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: 'AOA' | 'USD' = 'AOA') {
  return new Intl.NumberFormat(currency === 'AOA' ? 'pt-AO' : 'en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const getUSDToAOA = (aoa: number) => {
  // Mock exchange rate: 1 USD = 900 AOA (approx for 2024-2025)
  return aoa / 900;
};
