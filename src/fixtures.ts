import { keccak256, toHex } from 'viem';
import type { Bundle } from './policy';

export const scenarios = ['approved', 'over-limit', 'wrong-recipient', 'duplicate'] as const;
export type Scenario = typeof scenarios[number];
export function fixture(scenario: Scenario, now: number, consumer = '0x1111111111111111111111111111111111111111'): Bundle {
  const recipient = '0x2222222222222222222222222222222222222222';
  const token = '0x3333333333333333333333333333333333333333';
  const amount = scenario === 'over-limit' ? '7200000000' : '2400000000';
  return {
    request: {
      id: keccak256(toHex(`velum-synthetic-${scenario}`)), chainId: 11155111,
      consumer: consumer as `0x${string}`,
      recipient: scenario === 'wrong-recipient' ? '0x4444444444444444444444444444444444444444' : recipient,
      token, amount, expiresAt: now + 3600,
    },
    invoice: { vendorId: 'SYNTHETIC-STUDIO-07', purchaseOrder: 'PO-2026-042', currency: 'USD', recipient, amount, alreadyPaid: scenario === 'duplicate' },
    policy: { vendorId: 'SYNTHETIC-STUDIO-07', purchaseOrder: 'PO-2026-042', currency: 'USD', recipient, token, maxInvoiceAmount: '5000000000', remainingPurchaseOrder: '12000000000', enabled: true },
  };
}
