/**
 * ASSUMPTIONS FOR RECONCILIATION
 * All constants and tolerances used in matching logic
 */

// ===== MATCHING TOLERANCES =====
export const DATE_TOLERANCE_DAYS = 1; // Allow ±1 day difference
export const AMOUNT_TOLERANCE = 1; // Allow ±₹1 (in smallest unit) = ±₹0.01

// ===== SETTLEMENT PARAMETERS =====
export const MAX_SETTLEMENT_DELAY_DAYS = 2; // Bank usually settles within 2 days
export const CURRENCY = "INR";
export const AMOUNT_MULTIPLIER = 100; // Store amounts in paise (₹1 = 100 paise)

// ===== ROUNDING PARAMETERS =====
export const ROUNDING_DECIMAL_PLACES = 2; // INR uses 2 decimal places
export const ROUNDING_THRESHOLD = 0.01; // Amounts differing by ±₹0.01

// ===== TIME WINDOW PARAMETERS =====
export const INCLUDE_NEXT_MONTH_SETTLEMENTS = true; // Allow settlements 2 days into next month
export const SETTLEMENT_PROCESSING_WINDOW_HOURS = 48; // 2 days

// ===== DATA INTEGRITY ASSUMPTIONS =====
export const ASSUMPTIONS = {
  ASSUMPTION_1: {
    title: "Matching Date Tolerance",
    value: `±${DATE_TOLERANCE_DAYS} day`,
    reason: "Bank processes batches 1-2 days after transaction",
  },

  ASSUMPTION_2: {
    title: "Amount Tolerance",
    value: `±₹${(AMOUNT_TOLERANCE / AMOUNT_MULTIPLIER).toFixed(2)}`,
    reason: "Rounding differences in currency conversion",
  },

  ASSUMPTION_3: {
    title: "Settlement Delay Window",
    value: `${MAX_SETTLEMENT_DELAY_DAYS} days max`,
    reason: "Standard industry settlement time for banks",
  },

  ASSUMPTION_4: {
    title: "Refund Matching",
    value: "Refunds must reference valid transaction_id",
    reason: "Standard financial controls and validation",
  },

  ASSUMPTION_5: {
    title: "Duplicate Definition",
    value: "Same transaction_id appearing 2+ times in same dataset",
    reason: "Prevents false positives from legitimate retries",
  },

  ASSUMPTION_6: {
    title: "Time Period Boundaries",
    value: "First day to last day of month (23:59:59)",
    reason: "Allows settlements up to 2 days into next month",
  },

  ASSUMPTION_7: {
    title: "Currency",
    value: `${CURRENCY} - Stored in ${AMOUNT_MULTIPLIER}x units (paise)`,
    reason: "Avoids floating-point precision issues",
  },

  ASSUMPTION_8: {
    title: "Data Integrity",
    value: "All IDs globally unique (no circular dependencies)",
    reason: "Enables reliable matching and traceability",
  },
};

// ===== TOLERANCE DISPLAY =====
export const getTolerancesSummary = () => {
  return {
    dateTolerance: `${DATE_TOLERANCE_DAYS} day(s)`,
    amountTolerance: `₹${(AMOUNT_TOLERANCE / AMOUNT_MULTIPLIER).toFixed(2)}`,
    maxSettlementDelay: `${MAX_SETTLEMENT_DELAY_DAYS} days`,
    currency: CURRENCY,
  };
};
