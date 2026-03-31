import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  Activity,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  TrendingDown,
  Loader,
} from "lucide-react";
import { generateTestData } from "../utils/testDataGenerator";
import {
  reconcileData,
  generateReportSummary,
} from "../services/reconciliationService";
import * as firestoreService from "../services/firestoreService";
import * as assumptions from "../utils/assumptions";
import {
  formatCurrency,
  formatDate,
  exportToJSON,
  exportToCSV,
} from "../utils/reportFormatter";

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [showViewData, setShowViewData] = useState(false);
  const [viewData, setViewData] = useState(null);

  // Fetch data stats
  const fetchStats = async () => {
    try {
      const data = await firestoreService.getDataStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      toast.error("Failed to fetch statistics");
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Step 1: Generate Test Data
  const handleGenerateTestData = async () => {
    setLoading(true);
    const toastId = toast.loading("Generating test data...");
    const firebaseMsgId = toast.loading(
      "📡 Data is being stored in Firebase... This may take a moment",
      { duration: Infinity }, // Keep visible until manually dismissed
    );
    try {
      const testData = generateTestData();
      setViewData(testData);
      toast.loading("Clearing existing data...", { id: toastId });

      // Clear existing data first
      await firestoreService.clearAllData();

      // Add transactions
      toast.loading("Adding transactions (151)...", { id: toastId });
      for (const txn of testData.transactions) {
        await firestoreService.addTransaction(txn);
      }

      // Add settlements
      toast.loading("Adding settlements (145)...", { id: toastId });
      for (const settlement of testData.settlements) {
        await firestoreService.addSettlement(settlement);
      }

      // Add refunds
      toast.loading("Adding refunds (15)...", { id: toastId });
      for (const refund of testData.refunds) {
        await firestoreService.addRefund(refund);
      }

      toast.success("Test data generated successfully! ✓", { id: toastId });
      toast.success("✅ All data stored in Firebase!", { id: firebaseMsgId });
      setCurrentStep(2);
      await fetchStats();
    } catch (err) {
      console.error("Error generating test data:", err);
      toast.error("Failed to generate test data: " + err.message, {
        id: toastId,
      });
      toast.error("❌ Firebase storage failed", { id: firebaseMsgId });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Run Reconciliation
  const handleRunReconciliation = async () => {
    setLoading(true);
    const toastId = toast.loading("Running reconciliation...");
    const processingId = toast.loading(
      "⚙️ Processing data from Firebase... Please wait",
      { duration: Infinity }, // Keep visible until manually dismissed
    );
    try {
      toast.loading("Fetching transactions...", { id: toastId });
      const transactions = await firestoreService.getTransactions();

      toast.loading("Fetching settlements...", { id: toastId });
      const settlements = await firestoreService.getSettlements();

      toast.loading("Fetching refunds...", { id: toastId });
      const refunds = await firestoreService.getRefunds();

      toast.loading("Matching & analyzing gaps...", { id: toastId });
      const reconciliationResults = await reconcileData(
        transactions,
        settlements,
        refunds,
      );
      const summary = generateReportSummary(reconciliationResults);

      toast.loading("Saving report...", { id: toastId });
      const reportData = {
        month_year: "2024-01",
        summary,
        details: reconciliationResults,
        assumptions: assumptions.ASSUMPTIONS,
      };

      await firestoreService.saveReport("latest_report", reportData);
      setReport(reportData);
      setCurrentStep(3);
      toast.success("Reconciliation completed! ✓", { id: toastId });
      toast.success("✅ Report ready!", { id: processingId });
    } catch (err) {
      console.error("Error running reconciliation:", err);
      toast.error("Failed to run reconciliation: " + err.message, {
        id: toastId,
      });
      toast.error("❌ Processing failed", { id: processingId });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Export Report
  const handleExportReport = () => {
    if (report) {
      exportToJSON(report, `reconciliation_report_${report.month_year}.json`);
      toast.success("Report downloaded! ✓");
    }
  };

  // Clear all data
  const handleClearData = async () => {
    if (confirm("Are you sure you want to clear all data?")) {
      setLoading(true);
      const toastId = toast.loading("Clearing all data...");
      try {
        await firestoreService.clearAllData();
        setCurrentStep(1);
        setReport(null);
        setStats(null);
        toast.success("All data cleared! ✓", { id: toastId });
      } catch (err) {
        toast.error("Failed to clear data: " + err.message, { id: toastId });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg p-8 mb-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-blue-900 mb-2">
                💰 Payment Reconciliation System
              </h1>
              <p className="text-gray-600">
                Identify gaps between platform transactions and bank settlements
              </p>
            </div>
            <BarChart3 size={64} className="text-blue-900" />
          </div>
        </div>

        {/* Multi-Step Progress */}
        <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
          <div className="flex justify-between items-center">
            {[
              { num: 1, label: "Generate Data" },
              { num: 2, label: "Run Reconciliation" },
              { num: 3, label: "View Report" },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-4 flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep >= step.num
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {currentStep > step.num ? "✓" : step.num}
                </div>
                <span className="text-gray-700 font-semibold hidden sm:inline">
                  {step.label}
                </span>
                {step.num < 3 && (
                  <div
                    className={`flex-1 h-1 transition-all ${
                      currentStep > step.num ? "bg-blue-900" : "bg-gray-200"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Generate Test Data */}
        {currentStep >= 1 && (
          <div className="bg-white rounded-lg p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
              <Activity size={24} className="text-blue-900" />
              Step 1: Generate Test Data
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-900">
                <div className="text-sm text-gray-600">Transactions</div>
                <div className="text-2xl font-bold text-blue-900">150+1</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-900">
                <div className="text-sm text-gray-600">Settlements</div>
                <div className="text-2xl font-bold text-blue-900">145</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-900">
                <div className="text-sm text-gray-600">Refunds</div>
                <div className="text-2xl font-bold text-blue-900">15</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900 text-sm">
                ⚠️ <strong>Test data includes 4 intentional gaps:</strong>
              </p>
              <ul className="text-sm text-gray-700 mt-2 ml-4 space-y-1">
                <li>✓ 5 transactions settling next month (timing mismatch)</li>
                <li>✓ 4 rounding differences (₹0.01 variation)</li>
                <li>✓ 1 duplicate transaction in platform</li>
                <li>✓ 1 refund with no original transaction</li>
              </ul>
            </div>

            <button
              onClick={handleGenerateTestData}
              disabled={loading}
              className={`w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                "🚀 Generate Test Data"
              )}
            </button>

            {/* View Data Button - Appears after data generation */}
            {currentStep >= 2 && viewData && (
              <button
                onClick={() => setShowViewData(!showViewData)}
                className="w-full bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors mt-3 text-sm"
              >
                {showViewData
                  ? "👁️ Hide Generated Data"
                  : "👁️ View Generated Data"}
              </button>
            )}

            {/* View Data Modal */}
            {showViewData && viewData && (
              <div className="bg-white rounded-lg p-6 border border-gray-200 mt-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4">
                  Generated Test Data
                </h3>

                {/* Transactions Table */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    Transactions ({viewData.transactions.length})
                  </h4>
                  <div className="overflow-x-auto bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            ID
                          </th>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            Amount
                          </th>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewData.transactions.slice(0, 10).map((txn, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-200 hover:bg-gray-100"
                          >
                            <td className="px-2 py-2 text-gray-700">
                              {txn.transaction_id}
                            </td>
                            <td className="px-2 py-2 text-gray-700">
                              {formatCurrency(txn.amount)}
                            </td>
                            <td className="px-2 py-2 text-gray-700">
                              {txn.transaction_date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {viewData.transactions.length > 10 && (
                      <div className="text-center text-gray-600 py-2 text-xs">
                        +{viewData.transactions.length - 10} more
                        transactions...
                      </div>
                    )}
                  </div>
                </div>

                {/* Settlements Table */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    Settlements ({viewData.settlements.length})
                  </h4>
                  <div className="overflow-x-auto bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            ID
                          </th>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            Amount
                          </th>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewData.settlements
                          .slice(0, 10)
                          .map((settlement, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-200 hover:bg-gray-100"
                            >
                              <td className="px-2 py-2 text-gray-700">
                                {settlement.settlement_id}
                              </td>
                              <td className="px-2 py-2 text-gray-700">
                                {formatCurrency(settlement.amount)}
                              </td>
                              <td className="px-2 py-2 text-gray-700">
                                {settlement.settlement_date}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {viewData.settlements.length > 10 && (
                      <div className="text-center text-gray-600 py-2 text-xs">
                        +{viewData.settlements.length - 10} more settlements...
                      </div>
                    )}
                  </div>
                </div>

                {/* Refunds Table */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    Refunds ({viewData.refunds.length})
                  </h4>
                  <div className="overflow-x-auto bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            ID
                          </th>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            Amount
                          </th>
                          <th className="text-left px-2 py-2 text-gray-700 font-semibold">
                            TXN ID
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewData.refunds.slice(0, 10).map((refund, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-200 hover:bg-gray-100"
                          >
                            <td className="px-2 py-2 text-gray-700">
                              {refund.refund_id}
                            </td>
                            <td className="px-2 py-2 text-gray-700">
                              {formatCurrency(refund.amount)}
                            </td>
                            <td className="px-2 py-2 text-gray-700">
                              {refund.original_transaction_id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {viewData.refunds.length > 10 && (
                      <div className="text-center text-gray-600 py-2 text-xs">
                        +{viewData.refunds.length - 10} more refunds...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Run Reconciliation */}
        {currentStep >= 2 && stats && (
          <div className="bg-white rounded-lg p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
              <RefreshCw size={24} className="text-blue-900" />
              Step 2: Run Reconciliation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-900">
                <div className="text-sm text-gray-600">Platform Total</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(stats.totalTransactionValue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.transactionCount} txns
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-900">
                <div className="text-sm text-gray-600">Bank Total</div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(stats.totalSettlementValue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.settlementCount} settlements
                </div>
              </div>
            </div>

            <button
              onClick={handleRunReconciliation}
              disabled={loading}
              className={`w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Reconciling...
                </>
              ) : (
                "🔄 Run Reconciliation"
              )}
            </button>
          </div>
        )}

        {/* Step 3: View Report */}
        {currentStep >= 3 && report && (
          <div className="bg-white rounded-lg p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
              <CheckCircle size={24} className="text-blue-900" />
              Step 3: Reconciliation Report
            </h2>

            {/* Variance Summary */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6 border-l-4 border-blue-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Total Variance</div>
                  <div className="text-3xl font-bold text-blue-900">
                    {formatCurrency(
                      report.details.variance_comparison.difference,
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {report.details.variance_comparison.variance_percentage}%
                    variance
                  </div>
                </div>
                <TrendingDown size={48} className="text-blue-900" />
              </div>
            </div>

            {/* Gap Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: "Matched ✅",
                  value: report.summary.matched_count,
                  color: "bg-gray-50 border-blue-900 text-blue-900",
                },
                {
                  label: "Missing in Bank ❌",
                  value: report.summary.missing_in_bank_count,
                  color: "bg-gray-50 border-blue-900 text-blue-900",
                },
                {
                  label: "Missing in Platform ❌",
                  value: report.summary.missing_in_platform_count,
                  color: "bg-gray-50 border-blue-900 text-blue-900",
                },
                {
                  label: "Duplicates 🔁",
                  value:
                    report.summary.duplicates_platform_count +
                    report.summary.duplicates_bank_count,
                  color: "bg-gray-50 border-blue-900 text-blue-900",
                },
                {
                  label: "Rounding Issues 🔢",
                  value: report.summary.rounding_issues_count,
                  color: "bg-gray-50 border-blue-900 text-blue-900",
                },
                {
                  label: "Refund Errors 💸",
                  value: report.summary.refund_errors_count,
                  color: "bg-gray-50 border-blue-900 text-blue-900",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`${item.color} rounded-lg p-4 border-l-4 font-semibold`}
                >
                  <div className="text-sm text-gray-700">{item.label}</div>
                  <div className="text-3xl font-bold mt-2">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Timing Mismatch Issues */}
            {report.details.timing_mismatches.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6 mb-6 border-l-4 border-blue-900">
                <h3 className="text-lg font-bold text-blue-900 mb-3">
                  ⏱️ Timing Mismatches (
                  {report.details.timing_mismatches.length})
                </h3>
                <div className="space-y-2 text-sm">
                  {report.details.timing_mismatches
                    .slice(0, 3)
                    .map((item, idx) => (
                      <div key={idx} className="text-gray-700">
                        {item.transaction_id}: Settled on{" "}
                        {item.settlement_month} (transaction:
                        {item.transaction_month})
                      </div>
                    ))}
                  {report.details.timing_mismatches.length > 3 && (
                    <div className="text-gray-600 italic">
                      +{report.details.timing_mismatches.length - 3} more...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Duplicate Transactions */}
            {report.details.duplicates_in_platform.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6 mb-6 border-l-4 border-blue-900">
                <h3 className="text-lg font-bold text-blue-900 mb-3">
                  🔁 Duplicate Transactions (
                  {report.details.duplicates_in_platform.length})
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {report.details.duplicates_in_platform.map((item, idx) => (
                    <div key={idx}>
                      {item.transaction_id} appears {item.count} times
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refund Errors */}
            {report.details.refund_errors.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6 mb-6 border-l-4 border-blue-900">
                <h3 className="text-lg font-bold text-blue-900 mb-3">
                  💸 Refund Errors ({report.details.refund_errors.length})
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {report.details.refund_errors.map((item, idx) => (
                    <div key={idx}>
                      {item.refund_id}: {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleExportReport}
                disabled={loading}
                className={`flex-1 bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Download size={18} />
                Download Report
              </button>
              <button
                onClick={handleClearData}
                disabled={loading}
                className={`bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors flex items-center justify-center gap-2 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
