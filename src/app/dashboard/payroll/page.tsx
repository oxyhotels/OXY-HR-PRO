'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { DollarSign, Cpu, FileDown, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface PayrollRecord {
  _id: string;
  month: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  netSalary: number;
  status: 'Draft' | 'Paid';
  payslipPath?: string;
  paymentDate?: string;
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    designation: string;
  };
}

export default function PayrollPage() {
  const { user } = useAuthStore();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [calcLoading, setCalcLoading] = useState(false);
  const [payLoadingId, setPayLoadingId] = useState<string | null>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/history?month=${selectedMonth}`);
      setPayrolls(res.data.payrolls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  const handleRunCalculation = async () => {
    setCalcLoading(true);
    try {
      await api.post('/payroll/calculate', { month: selectedMonth });
      alert('Payroll calculation sheets completed successfully for all active staff.');
      fetchPayroll();
    } catch (err: any) {
      alert(err.message || 'Calculation failed');
    } finally {
      setCalcLoading(false);
    }
  };

  const handlePayout = async (id: string) => {
    setPayLoadingId(id);
    try {
      await api.put(`/payroll/${id}/pay`, {});
      fetchPayroll();
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setPayLoadingId(null);
    }
  };

  const isHR = user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Payroll & Payslips</h1>
          <p className="text-slate-400 text-xs mt-1">Manage monthly pay cycles, deductions, and issue PDF receipts.</p>
        </div>

        {/* Calculation triggers */}
        {isHR && (
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-xs text-white"
            />
            <button
              onClick={handleRunCalculation}
              disabled={calcLoading}
              className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {calcLoading ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
              Compute Pay run
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Pay Period</th>
                  <th className="p-4">Base & Adjustments</th>
                  <th className="p-4">Overtime Wages</th>
                  <th className="p-4">Net Payout</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payrolls.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      {rec.employee?.firstName} {rec.employee?.lastName}
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">{rec.employee?.designation} ({rec.employee?.department})</div>
                    </td>
                    <td className="p-4 font-mono text-[11px]">{rec.month}</td>
                    <td className="p-4 space-y-0.5">
                      <div>Base: <span className="font-semibold text-slate-200">₹{rec.baseSalary}</span></div>
                      <div className="text-[10px] text-slate-500">Allow: +₹{rec.allowances} | Deduct: -₹{rec.deductions}</div>
                    </td>
                    <td className="p-4">
                      {rec.overtimeHours > 0 ? (
                        <div>
                          <span className="font-semibold text-slate-200">₹{rec.overtimePay}</span>
                          <div className="text-[10px] text-slate-500 font-mono">({rec.overtimeHours} hours at 1.5x)</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">No overtime logged</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-gold font-mono text-sm">
                      ₹{rec.netSalary.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        rec.status === 'Paid' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {rec.status === 'Paid' ? (
                          <>
                            <CheckCircle size={10} />
                            Paid
                          </>
                        ) : (
                          'Draft Sheet'
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {rec.status === 'Paid' && rec.payslipPath ? (
                        <a
                          href={`http://localhost:5000${rec.payslipPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-gold hover:text-gold-light font-bold text-[10px] uppercase border border-gold/20 hover:border-gold/60 px-2 py-1 rounded transition-colors"
                        >
                          <FileDown size={12} />
                          PDF
                        </a>
                      ) : isHR ? (
                        <button
                          onClick={() => handlePayout(rec._id)}
                          disabled={payLoadingId === rec._id}
                          className="bg-green-600 hover:bg-green-500 text-white font-bold px-2.5 py-1.5 rounded text-[10px] uppercase transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {payLoadingId === rec._id ? <Loader2 size={10} className="animate-spin" /> : <CreditCard size={10} />}
                          Pay Now
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))}

                {payrolls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-500">
                      No payroll records loaded. Select month and run computation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
