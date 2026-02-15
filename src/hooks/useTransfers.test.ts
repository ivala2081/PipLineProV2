import { describe, it, expect } from 'vitest'
import { computeTransfer } from './useTransfers'
import type { TransferCategory } from '@/lib/database.types'

describe('computeTransfer', () => {
  const mockDepositCategory: TransferCategory = {
    id: '1',
    organization_id: 'org-1',
    name: 'Deposit',
    is_deposit: true,
    created_at: '2024-01-01',
  }

  const mockWithdrawalCategory: TransferCategory = {
    id: '2',
    organization_id: 'org-1',
    name: 'Withdrawal',
    is_deposit: false,
    created_at: '2024-01-01',
  }

  describe('Deposit calculations (TL currency)', () => {
    it('should calculate deposit with commission in TL', () => {
      const result = computeTransfer(
        1000, // rawAmount
        mockDepositCategory,
        0.03, // 3% commission
        35.5, // exchange rate TL/USD
        'TL',
      )

      expect(result.amount).toBe(1000)
      expect(result.commission).toBe(30) // 1000 * 0.03 = 30
      expect(result.net).toBe(970) // 1000 - 30 = 970
      expect(result.amountTry).toBe(1000)
      expect(result.amountUsd).toBe(28.17) // 1000 / 35.5 ≈ 28.17
    })

    it('should round commission to 2 decimal places', () => {
      const result = computeTransfer(
        1234.56,
        mockDepositCategory,
        0.0275, // 2.75% commission
        35.5,
        'TL',
      )

      expect(result.commission).toBe(33.95) // 1234.56 * 0.0275 = 33.95
      expect(result.net).toBe(1200.61) // 1234.56 - 33.95 = 1200.61
    })

    it('should handle zero commission rate', () => {
      const result = computeTransfer(1000, mockDepositCategory, 0, 35.5, 'TL')

      expect(result.commission).toBe(0)
      expect(result.net).toBe(1000)
    })
  })

  describe('Deposit calculations (USD currency)', () => {
    it('should calculate deposit with commission in USD', () => {
      const result = computeTransfer(
        100, // rawAmount in USD
        mockDepositCategory,
        0.03, // 3% commission
        35.5, // exchange rate TL/USD
        'USD',
      )

      expect(result.amount).toBe(100)
      expect(result.commission).toBe(3) // 100 * 0.03 = 3
      expect(result.net).toBe(97) // 100 - 3 = 97
      expect(result.amountUsd).toBe(100)
      expect(result.amountTry).toBe(3550) // 100 * 35.5 = 3550
    })
  })

  describe('Withdrawal calculations (TL currency)', () => {
    it('should calculate withdrawal with no commission in TL', () => {
      const result = computeTransfer(
        500,
        mockWithdrawalCategory,
        0.03, // commission rate (ignored for withdrawals)
        35.5,
        'TL',
      )

      expect(result.amount).toBe(-500) // negative for withdrawal
      expect(result.commission).toBe(0) // no commission on withdrawals
      expect(result.net).toBe(-500) // amount - 0 commission
      expect(result.amountTry).toBe(-500)
      expect(result.amountUsd).toBe(-14.08) // -500 / 35.5 ≈ -14.08
    })
  })

  describe('Withdrawal calculations (USD currency)', () => {
    it('should calculate withdrawal with no commission in USD', () => {
      const result = computeTransfer(
        50,
        mockWithdrawalCategory,
        0.03, // commission rate (ignored)
        35.5,
        'USD',
      )

      expect(result.amount).toBe(-50)
      expect(result.commission).toBe(0)
      expect(result.net).toBe(-50)
      expect(result.amountUsd).toBe(-50)
      expect(result.amountTry).toBe(-1775) // -50 * 35.5 = -1775
    })
  })

  describe('Edge cases', () => {
    it('should handle zero exchange rate (TL to USD)', () => {
      const result = computeTransfer(
        1000,
        mockDepositCategory,
        0.03,
        0, // zero exchange rate
        'TL',
      )

      expect(result.amountUsd).toBe(0) // division by zero protection
    })

    it('should handle zero amount', () => {
      const result = computeTransfer(0, mockDepositCategory, 0.03, 35.5, 'TL')

      expect(result.amount).toBe(0)
      expect(result.commission).toBe(0)
      expect(result.net).toBe(0)
      expect(result.amountTry).toBe(0)
      expect(result.amountUsd).toBe(0)
    })

    it('should handle very small amounts with proper rounding', () => {
      const result = computeTransfer(0.01, mockDepositCategory, 0.03, 35.5, 'TL')

      expect(result.amount).toBe(0.01)
      expect(result.commission).toBe(0) // 0.01 * 0.03 = 0.0003 → rounds to 0
      expect(result.net).toBe(0.01)
    })

    it('should handle large amounts', () => {
      const result = computeTransfer(1_000_000, mockDepositCategory, 0.03, 35.5, 'TL')

      expect(result.amount).toBe(1_000_000)
      expect(result.commission).toBe(30_000) // 1M * 0.03 = 30k
      expect(result.net).toBe(970_000)
      expect(result.amountTry).toBe(1_000_000)
      expect(result.amountUsd).toBe(28_169.01) // 1M / 35.5
    })
  })

  describe('Currency conversion accuracy', () => {
    it('should correctly convert TL to USD with realistic exchange rate', () => {
      const result = computeTransfer(
        35_500, // 35,500 TL
        mockDepositCategory,
        0.025, // 2.5% commission
        35.5,
        'TL',
      )

      expect(result.amountTry).toBe(35_500)
      expect(result.amountUsd).toBe(1000) // 35,500 / 35.5 = 1000 exactly
      expect(result.commission).toBe(887.5) // 35,500 * 0.025
    })

    it('should correctly convert USD to TL with realistic exchange rate', () => {
      const result = computeTransfer(
        1000, // $1000
        mockDepositCategory,
        0.025,
        35.5,
        'USD',
      )

      expect(result.amountUsd).toBe(1000)
      expect(result.amountTry).toBe(35_500) // 1000 * 35.5 = 35,500
      expect(result.commission).toBe(25) // 1000 * 0.025
    })
  })

  describe('Rounding behavior', () => {
    it('should round commission to 2 decimals using standard rounding', () => {
      // Test case that would round up
      const result1 = computeTransfer(
        100,
        mockDepositCategory,
        0.0333, // would give 3.33
        35.5,
        'TL',
      )
      expect(result1.commission).toBe(3.33)

      // Test case with .5 (banker's rounding may apply)
      const result2 = computeTransfer(
        100,
        mockDepositCategory,
        0.0335, // would give 3.35
        35.5,
        'TL',
      )
      expect(result2.commission).toBe(3.35)
    })

    it('should round net amount to 2 decimals', () => {
      const result = computeTransfer(100.999, mockDepositCategory, 0.0333, 35.5, 'TL')

      // amount = 100.999, commission = 3.36 (100.999 * 0.0333 rounded)
      // net = 100.999 - 3.36 = 97.639 → should round to 97.64
      expect(result.net).toBe(97.64)
    })
  })
})
