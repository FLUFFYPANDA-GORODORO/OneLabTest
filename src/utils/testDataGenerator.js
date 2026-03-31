/**
 * TEST DATA GENERATOR
 * Creates sample transactions, settlements, and refunds with intentional gaps
 */

export const generateTestData = () => {
  const data = {
    transactions: [],
    settlements: [],
    refunds: [],
  };

  // Generate base transactions (150 total)
  for (let i = 1; i <= 150; i++) {
    const amount = Math.floor(Math.random() * 10000) + 1000; // ₹1000 - ₹11000
    const txnDate = new Date(2024, 0, Math.floor(Math.random() * 28) + 1); // January dates

    data.transactions.push({
      transaction_id: `TXN_${String(i).padStart(4, "0")}`,
      amount: amount,
      currency: "INR",
      transaction_date: txnDate.toISOString().split("T")[0],
      status: "completed",
      customer_id: `CUST_${String(Math.floor(Math.random() * 100) + 1).padStart(3, "0")}`,
      description: `Payment ${i}`,
    });
  }

  // Generate settlements (145 total) - 5 transactions will settle in Feb
  for (let i = 1; i <= 145; i++) {
    let shouldDelaySettlement = false;
    let settlementDate = new Date(2024, 0, Math.floor(Math.random() * 28) + 1);

    // PROBLEM 1: Timing Mismatch (5 transactions)
    if (i > 140 && i <= 145) {
      shouldDelaySettlement = true;
      settlementDate = new Date(2024, 1, Math.floor(Math.random() * 2) + 1); // February 1-2
    }

    // Get corresponding transaction
    let txn = data.transactions[i - 1];
    let settlementAmount = txn.amount;

    // PROBLEM 2: Rounding Issues (4 transactions)
    if (i > 90 && i <= 94) {
      settlementAmount = txn.amount - 1; // ₹0.01 difference
    }

    data.settlements.push({
      settlement_id: `SET_${String(i).padStart(4, "0")}`,
      transaction_id: txn.transaction_id,
      settled_amount: settlementAmount,
      settlement_date: settlementDate.toISOString().split("T")[0],
      bank_reference: `BANK_REF_${String(i).padStart(6, "0")}`,
      status: "processed",
    });
  }

  // PROBLEM 3: Duplicate in Platform (Transaction appears twice)
  if (data.transactions.length > 0) {
    data.transactions.push({
      ...data.transactions[42], // Duplicate TXN_0043
      // Keep same ID to create duplicate
    });
  }

  // PROBLEM 4: Orphaned Refund (Refund with no original transaction)
  data.refunds.push({
    refund_id: "REF_0001",
    original_transaction_id: "TXN_9999", // Non-existent transaction
    refund_amount: 5000,
    refund_date: "2024-01-20",
    reason: "Customer Request",
    status: "processed",
  });

  // Generate other refunds (14 more, matching existing transactions)
  for (let i = 2; i <= 15; i++) {
    const txnIndex = Math.floor(Math.random() * (data.transactions.length - 1));
    const txn = data.transactions[txnIndex];
    const refundAmount = Math.floor(txn.amount * 0.5); // 50% refund

    data.refunds.push({
      refund_id: `REF_${String(i).padStart(4, "0")}`,
      original_transaction_id: txn.transaction_id,
      refund_amount: refundAmount,
      refund_date: "2024-01-25",
      reason: "Partial Return",
      status: "processed",
    });
  }

  return data;
};

/**
 * Export test data as JSON string
 */
export const exportTestDataAsJSON = (data) => {
  return JSON.stringify(data, null, 2);
};

/**
 * Get summary of generated data with problems
 */
export const getDataGenerationSummary = (data) => {
  return {
    transactions_count: data.transactions.length,
    settlements_count: data.settlements.length,
    refunds_count: data.refunds.length,
    problems_planted: {
      timing_mismatches: 5,
      rounding_issues: 4,
      duplicates_platform: 1,
      orphaned_refunds: 1,
    },
    total_problems: 11,
  };
};
