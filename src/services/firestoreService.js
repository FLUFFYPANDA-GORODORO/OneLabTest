import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ===== TRANSACTION OPERATIONS =====
export const addTransaction = async (transactionData) => {
  try {
    const docRef = await addDoc(collection(db, "transactions"), {
      ...transactionData,
      created_at: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
};

export const getTransactions = async (monthYear = null) => {
  try {
    const collectionRef = collection(db, "transactions");
    const snapshot = await getDocs(collectionRef);
    let transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by month if provided (format: '2024-01')
    if (monthYear) {
      transactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.transaction_date);
        const txnMonth =
          txnDate.getFullYear() +
          "-" +
          String(txnDate.getMonth() + 1).padStart(2, "0");
        return txnMonth === monthYear;
      });
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

// ===== SETTLEMENT OPERATIONS =====
export const addSettlement = async (settlementData) => {
  try {
    const docRef = await addDoc(collection(db, "settlements"), {
      ...settlementData,
      created_at: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding settlement:", error);
    throw error;
  }
};

export const getSettlements = async (monthYear = null) => {
  try {
    const collectionRef = collection(db, "settlements");
    const snapshot = await getDocs(collectionRef);
    let settlements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (monthYear) {
      settlements = settlements.filter((settlement) => {
        const settlementDate = new Date(settlement.settlement_date);
        const settlementMonth =
          settlementDate.getFullYear() +
          "-" +
          String(settlementDate.getMonth() + 1).padStart(2, "0");
        return settlementMonth === monthYear;
      });
    }

    return settlements;
  } catch (error) {
    console.error("Error fetching settlements:", error);
    throw error;
  }
};

// ===== REFUND OPERATIONS =====
export const addRefund = async (refundData) => {
  try {
    const docRef = await addDoc(collection(db, "refunds"), {
      ...refundData,
      created_at: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding refund:", error);
    throw error;
  }
};

export const getRefunds = async (monthYear = null) => {
  try {
    const collectionRef = collection(db, "refunds");
    const snapshot = await getDocs(collectionRef);
    let refunds = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (monthYear) {
      refunds = refunds.filter((refund) => {
        const refundDate = new Date(refund.refund_date);
        const refundMonth =
          refundDate.getFullYear() +
          "-" +
          String(refundDate.getMonth() + 1).padStart(2, "0");
        return refundMonth === monthYear;
      });
    }

    return refunds;
  } catch (error) {
    console.error("Error fetching refunds:", error);
    throw error;
  }
};

// ===== REPORT OPERATIONS =====
export const saveReport = async (reportId, reportData) => {
  try {
    await setDoc(doc(db, "reconciliation_reports", reportId), {
      ...reportData,
      generated_at: new Date(),
    });
    return reportId;
  } catch (error) {
    console.error("Error saving report:", error);
    throw error;
  }
};

export const getReport = async (reportId) => {
  try {
    const docSnap = await getDoc(doc(db, "reconciliation_reports", reportId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching report:", error);
    throw error;
  }
};

export const getLatestReport = async () => {
  try {
    const collectionRef = collection(db, "reconciliation_reports");
    const snapshot = await getDocs(collectionRef);
    const reports = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));

    return reports.length > 0 ? reports[0] : null;
  } catch (error) {
    console.error("Error fetching latest report:", error);
    throw error;
  }
};

// ===== UTILITY OPERATIONS =====
export const clearAllData = async () => {
  try {
    const collections = [
      "transactions",
      "settlements",
      "refunds",
      "reconciliation_reports",
    ];

    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
      }
    }

    return true;
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
};

export const getDataStats = async () => {
  try {
    const txns = await getTransactions();
    const settlements = await getSettlements();
    const refunds = await getRefunds();

    return {
      transactionCount: txns.length,
      settlementCount: settlements.length,
      refundCount: refunds.length,
      totalTransactionValue: txns.reduce((sum, t) => sum + (t.amount || 0), 0),
      totalSettlementValue: settlements.reduce(
        (sum, s) => sum + (s.settled_amount || 0),
        0,
      ),
    };
  } catch (error) {
    console.error("Error getting data stats:", error);
    throw error;
  }
};
