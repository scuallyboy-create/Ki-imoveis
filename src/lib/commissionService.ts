/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommissionConfig, Transaction } from '../types';

const DEFAULT_CONFIG: CommissionConfig = {
  platformFeePercent: 2.5, // 2.5% Ki-Imóveis fee
  agentCommissionPercent: 3.0, // 3% Agent commission
};

export function calculateCommission(amount: number, type: 'sale' | 'rent') {
  const platformFee = (amount * DEFAULT_CONFIG.platformFeePercent) / 100;
  const agentEarnings = (amount * DEFAULT_CONFIG.agentCommissionPercent) / 100;
  
  return {
    totalValue: amount,
    platformFee,
    agentEarnings,
    netForOwner: amount - platformFee - agentEarnings
  };
}

export const COMMISSIONS = DEFAULT_CONFIG;
