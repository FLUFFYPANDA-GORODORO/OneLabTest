import * as assumptions from "../utils/assumptions";

/**
 * RECONCILIATION ENGINE
 * Matches transactions with settlements and identifies gaps
 */

export const reconcileData = async (transactions, settlements, refunds) => {
  try {
    const results = {
      matched: [],
      missing_in_bank: [],
      missing_in_platform: [],
      duplicates_in_platform: [],
      duplicates_in_bank: [],
      amount_mismatches: [],
      date_mismatches: [],
      rounding_issues: [],
      refund_errors: [],
      timing_mismatches: [],
      total_variance: 0,
      variance_comparison: 0,
    };

    // Create maps for faster lookup
    const txnMap = new Map();
    const settlementMap = new Map();
    const refundMap = new Map();

    // Build maps with duplicate detection
    transactions.forEach((txn) => {
      const existing = txnMap.get(txn.transaction_id);
      if (existing) {
        results.duplicates_in_platform.push({
          transaction_id: txn.transaction_id,
          count: 2,
          occurrences: [existing, txn],
        });
      } else {
        txnMap.set(txn.transaction_id, txn);
      }
    });

    settlements.forEach((settlement) => {
      const existing = settlementMap.get(settlement.transaction_id);
      if (existing) {
        results.duplicates_in_bank.push({
          transaction_id: settlement.transaction_id,
          count: 2,
          occurrences: [existing.settlement_id, settlement.settlement_id],
        });
      } else {
        settlementMap.set(settlement.transaction_id, settlement);
      }
    });

    refunds.forEach((refund) => {
      refundMap.set(refund.refund_id, refund);
    });

    // STEP 1: Match transactions with settlements
    txnMap.forEach((txn, txnId) => {
      const settlement = settlementMap.get(txnId);

      if (settlement) {
        // Transaction found in settlements
        const { isMatch, issue } = validateMatch(txn, settlement);

        if (isMatch) {
          results.matched.push({
            transaction_id: txnId,
            platform_amount: txn.amount,
            bank_amount: settlement.settled_amount,
            transaction_date: txn.transaction_date,
            settlement_date: settlement.settlement_date,
            settlement_id: settlement.settlement_id,
            difference: Math.abs(txn.amount - settlement.settled_amount),
          });
        } else {
          // Add specific issue
          if (issue === "rounding") {
            results.rounding_issues.push({
              transaction_id: txnId,
              platform_amount: txn.amount,
              bank_amount: settlement.settled_amount,
              difference: Math.abs(txn.amount - settlement.settled_amount),
              settlement_id: settlement.settlement_id,
            });
          } else if (issue === "date") {
            results.date_mismatches.push({
              transaction_id: txnId,
              platform_date: txn.transaction_date,
              settlement_date: settlement.settlement_date,
              days_difference: daysDifference(
                txn.transaction_date,
                settlement.settlement_date,
              ),
              amount: txn.amount,
            });

            // Check if timing crosses month boundary (late settlement)
            if (
              isTimingMismatch(txn.transaction_date, settlement.settlement_date)
            ) {
              results.timing_mismatches.push({
                transaction_id: txnId,
                transaction_month: getMonthYear(txn.transaction_date),
                settlement_month: getMonthYear(settlement.settlement_date),
                amount: txn.amount,
              });
            }
          } else if (issue === "amount") {
            results.amount_mismatches.push({
              transaction_id: txnId,
              platform_amount: txn.amount,
              bank_amount: settlement.settled_amount,
              difference: Math.abs(txn.amount - settlement.settled_amount),
              settlement_id: settlement.settlement_id,
            });
          }
        }

        // Mark as processed
        settlementMap.delete(txnId);
      } else {
        // Transaction exists but no settlement
        results.missing_in_bank.push({
          transaction_id: txnId,
          amount: txn.amount,
          transaction_date: txn.transaction_date,
          status: txn.status,
        });
      }
    });

    // STEP 2: Find settlements with no matching transactions
    settlementMap.forEach((settlement, txnId) => {
      results.missing_in_platform.push({
        settlement_id: settlement.settlement_id,
        transaction_id_expected: txnId,
        settled_amount: settlement.settled_amount,
        settlement_date: settlement.settlement_date,
      });
    });

    // STEP 3: Validate refunds
    refunds.forEach((refund) => {
      const originalTxn = txnMap.get(refund.original_transaction_id);

      if (!originalTxn) {
        results.refund_errors.push({
          refund_id: refund.refund_id,
          original_transaction_id: refund.original_transaction_id,
          refund_amount: refund.refund_amount,
          reason: "Original transaction not found",
        });
      } else if (refund.refund_amount > originalTxn.amount) {
        results.refund_errors.push({
          refund_id: refund.refund_id,
          original_transaction_id: refund.original_transaction_id,
          refund_amount: refund.refund_amount,
          original_amount: originalTxn.amount,
          reason: "Refund exceeds original transaction amount",
        });
      }
    });

    // STEP 4: Calculate variances
    const platformTotal = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const bankTotal = settlements.reduce(
      (sum, s) => sum + (s.settled_amount || 0),
      0,
    );

    results.total_variance = platformTotal - bankTotal;
    results.variance_comparison = {
      platform_total: platformTotal,
      bank_total: bankTotal,
      difference: platformTotal - bankTotal,
      variance_percentage: (
        (Math.abs(platformTotal - bankTotal) / platformTotal) *
        100
      ).toFixed(4),
    };

    return results;
  } catch (error) {
    console.error("Reconciliation error:", error);
    throw error;
  }
};

/**
 * Validate if a match is clean (matched)
 */
function validateMatch(transaction, settlement) {
  const amountDiff = Math.abs(transaction.amount - settlement.settled_amount);
  const dateDiff = daysDifference(
    transaction.transaction_date,
    settlement.settlement_date,
  );

  // Check rounding issue (amount within tolerance)
  if (amountDiff <= assumptions.AMOUNT_TOLERANCE && amountDiff > 0) {
    return { isMatch: false, issue: "rounding" };
  }

  // Check date mismatch (date outside tolerance)
  if (dateDiff > assumptions.DATE_TOLERANCE_DAYS) {
    return { isMatch: false, issue: "date" };
  }

  // Check amount mismatch (amount outside tolerance)
  if (amountDiff > assumptions.AMOUNT_TOLERANCE) {
    return { isMatch: false, issue: "amount" };
  }

  return { isMatch: true, issue: null };
}

/**
 * Check if settlement is in different month than transaction
 */
function isTimingMismatch(txnDate, settlementDate) {
  const txnMonth = getMonthYear(txnDate);
  const settlementMonth = getMonthYear(settlementDate);
  return txnMonth !== settlementMonth;
}

/**
 * Get month-year string from date
 */
function getMonthYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Calculate days difference between two dates
 */
function daysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Generate summary statistics
 */
export const generateReportSummary = (reconciliationResults) => {
  return {
    matched_count: reconciliationResults.matched.length,
    missing_in_bank_count: reconciliationResults.missing_in_bank.length,
    missing_in_platform_count: reconciliationResults.missing_in_platform.length,
    duplicates_platform_count:
      reconciliationResults.duplicates_in_platform.length,
    duplicates_bank_count: reconciliationResults.duplicates_in_bank.length,
    amount_mismatches_count: reconciliationResults.amount_mismatches.length,
    date_mismatches_count: reconciliationResults.date_mismatches.length,
    rounding_issues_count: reconciliationResults.rounding_issues.length,
    refund_errors_count: reconciliationResults.refund_errors.length,
    timing_mismatches_count: reconciliationResults.timing_mismatches.length,
    variance_info: reconciliationResults.variance_comparison,
  };
};
