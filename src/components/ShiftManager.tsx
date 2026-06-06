/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  DollarSign, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  CheckCircle, 
  Plus, 
  ArrowRight, 
  FolderLock, 
  Layers,
  FileText,
  User,
  Activity,
  Award,
  Terminal,
  RefreshCw,
  X
} from 'lucide-react';
import { Shift, SalesOrder } from '../types';

interface ShiftManagerProps {
  activeShift: Shift | null;
  onOpenShift: (openingCash: number, cashierName: string) => void;
  onCloseShift: (actualCash: number) => void;
  historicalShifts: Shift[];
  orders: SalesOrder[];
  lang?: 'en' | 'ar';
}

export default function ShiftManager({ activeShift, onOpenShift, onCloseShift, historicalShifts, orders, lang = 'en' }: ShiftManagerProps) {
  // Opening shift state
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [cashierNameInput, setCashierNameInput] = useState('Store Clerk');
  
  // Closing shift state
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');

  // 1. COMPUTE ACTIVE SHIFT TRANSACTION COUNTS LIVE FROM ORDERS
  const activeShiftStats = useMemo(() => {
    if (!activeShift) return { count: 0, cashSales: 0, cardSales: 0, vodafoneSales: 0 };

    const shiftOrders = orders.filter(o => o.shiftId === activeShift.id);
    let cashSales = 0;
    let cardSales = 0;
    let vodafoneSales = 0;

    shiftOrders.forEach(o => {
      if (o.paymentMethod === 'card') {
        cardSales += o.total;
      } else if (o.paymentMethod === 'vodafone') {
        vodafoneSales += o.total;
      } else {
        cashSales += o.total;
      }
    });

    return {
      count: shiftOrders.length,
      cashSales,
      cardSales,
      vodafoneSales
    };
  }, [activeShift, orders]);

  // Compute expected cash live
  const expectedCashTally = useMemo(() => {
    if (!activeShift) return 0;
    // Expected cash = Opening Cash + Cash sales (Card sales are separate in bank)
    return activeShift.openingCash + activeShiftStats.cashSales;
  }, [activeShift, activeShiftStats]);

  // Triggering open shift
  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const float = parseFloat(openingCashInput);
    if (isNaN(float) || float < 0) {
      alert('Float opening cash cannot be negative or empty!');
      return;
    }
    if (!cashierNameInput.trim()) {
      alert('Cashier Clerk name must be specified!');
      return;
    }

    onOpenShift(float, cashierNameInput.trim());
    setOpeningCashInput('');
  };

  // Triggering close shift
  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(actualCashInput);
    if (isNaN(actual) || actual < 0) {
      alert('Actual counted cash cannot be negative!');
      return;
    }

    onCloseShift(actual);
    setActualCashInput('');
    setIsClosingShift(false);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-100 pb-5">
        <h2 id="shift-heading" className="text-2xl font-semibold tracking-tight text-gray-901">
          {lang === 'en' ? 'Session Register & Shift Ledger (الوردية)' : 'سجل جلسات الصندوق والورديات'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {lang === 'en' 
            ? 'Regulate drawers float limits and perform cash reconciliation audits to prevent fraud' 
            : 'تنظيم حدود الصندوق النقدي وإجراء تدقيق الأرصدة لمنع الأخطاء والاحتيال'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: ACTIVE DRAWER SESSION DESPATCH */}
        <div className="lg:col-span-8 space-y-5">
          {activeShift ? (
            /* ACTIVE DRAWER WORKSPACE */
            <div id="active-shift-workspace" className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 font-sans">
                  <div className="p-2.5 bg-gray-50 text-black border border-gray-100 rounded-lg">
                    <Unlock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {lang === 'en' ? 'Shift Register is ACTIVE' : 'جلسة الوردية والدرج مفتوحة الآن'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lang === 'en' ? 'Session launched at:' : 'وقت البدء والافتتاح:'} {new Date(activeShift.openedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsClosingShift(true)}
                  className="px-4 py-2 bg-black hover:bg-black/95 text-white font-semibold rounded-lg text-xs transition animate-none font-sans"
                >
                  {lang === 'en' ? '🔒 Terminate Shift & Match Cash' : '🔒 إغلاق وتصفية الوردية ومطابقة النقد'}
                </button>
              </div>

              {/* SHIFT TALLY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                <div className="bg-gray-50/50 p-4 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">{lang === 'en' ? 'Cashier Operator' : 'الكاشير المسؤول'}</span>
                  <div className="text-sm font-extrabold text-gray-800 mt-1.5 flex items-center gap-1.5">
                    <User size={14} className="text-black" />
                    <span>{activeShift.cashierName}</span>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-xl border border-[#E5E7EB] font-mono">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase font-sans">{lang === 'en' ? 'Drawer Float (Opening Cash)' : 'درج رأس المال الافتتاحي'}</span>
                  <div className="text-md font-extrabold text-gray-901 mt-1.5">
                    ${activeShift.openingCash.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-xl border border-[#E5E7EB] font-mono">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase font-sans">{lang === 'en' ? 'Transaction Volumes' : 'مبيعات الوردية'}</span>
                  <div className="text-md font-extrabold text-black mt-1.5">
                    {activeShiftStats.count} {lang === 'en' ? 'checkouts matches' : 'فواتير مكتملة'}
                  </div>
                </div>
              </div>

              {/* SALES ACCRUAL PANEL */}
              <div className="border border-[#E5E7EB] bg-gray-50/50 rounded-xl p-5 space-y-4 font-sans">
                <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest font-sans">{lang === 'en' ? 'Real-time Sales Accrual Breakdown' : 'المبيعات اللحظية المتراكمة بالدرج'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="space-y-1 bg-white p-3.5 rounded-lg border border-[#E5E7EB]">
                    <span className="text-gray-400 uppercase text-[9px] font-bold font-sans">{lang === 'en' ? 'Cash Sales (Drawer In)' : 'المبيعات النقدية (الدرج)'}</span>
                    <h3 className="text-md font-extrabold text-[#059669] mt-0.5">{activeShiftStats.cashSales.toFixed(2)} EGP</h3>
                  </div>
                  <div className="space-y-1 bg-white p-3.5 rounded-lg border border-[#E5E7EB]">
                    <span className="text-gray-400 uppercase text-[9px] font-bold font-sans">{lang === 'en' ? 'Visa / Card Sales (Bank In)' : 'مبيعات الشبكة (البنك)'}</span>
                    <h3 className="text-md font-extrabold text-[#2563EB] mt-0.5">{activeShiftStats.cardSales.toFixed(2)} EGP</h3>
                  </div>
                  <div className="space-y-1 bg-white p-3.5 rounded-lg border border-[#E5E7EB]">
                    <span className="text-gray-400 uppercase text-[9px] font-bold font-sans">{lang === 'en' ? 'Vodafone Cash (Digital Wallet)' : 'فودافون كاش (محفظة)'}</span>
                    <h3 className="text-md font-extrabold text-[#DC2626] mt-0.5">{activeShiftStats.vodafoneSales.toFixed(2)} EGP</h3>
                  </div>
                  <div className="space-y-1 bg-black text-white p-3.5 rounded-lg border border-transparent">
                    <span className="text-gray-300 uppercase text-[9px] font-bold font-sans">{lang === 'en' ? 'EXPECTED DRAWER CASH' : 'النقد المتوقع في الدرج والمسؤلية'}</span>
                    <h3 className="text-md font-extrabold text-white mt-0.5">{expectedCashTally.toFixed(2)} EGP</h3>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                  <Terminal size={12} className="text-black text-xs shrink-0" />
                  <span>
                    {lang === 'en' 
                      ? 'Only cash sales increment physical expected drawer totals. Credits like Card and Vodafone Cash are securely registered as independent digital transactions.' 
                      : 'المبيعات النقدية فقط هي التي تزيد من توتال النقد الفعلي الملموس بالخزنة، بينما مبيعات فودافون كاش والفيزا يتم تحصيلها وتوثيقها بشكل رقمي خارج عهدة الدرج الملموسة.'}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            /* DRAWER BLOCK - OPEN SHIFT ENTRY FORM */
            <div id="shift-opening-form" className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#FEF2F2] text-[#DC2626] rounded-xl border border-[#FEE2E2]">
                  <Lock size={22} className="shrink-0 animate-none" />
                </div>
                <div className="font-sans">
                  <h3 className="text-sm font-semibold text-[#DC2626] uppercase font-mono tracking-wider">
                    {lang === 'en' ? 'Terminal Register Session Lock' : 'نظام نقطة البيع مقفل'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {lang === 'en' 
                      ? 'Point-Of-Sale (POS) cashiering is restricted because there is no open drawer float register. This enforces financial safety, cashier integrity, and discrepancy mitigation.' 
                      : 'عمليات الصندوق والدفع المتكاملة مقفلة الآن لعدم وجود وردية نشطة. الرجاء فتح وردية جديدة وبدء جلسة كاشير ومطابقة العهدة لبدء العمل بأمان.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleOpenSubmit} className="space-y-4 border-t border-gray-100 pt-5 font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Clerk input */}
                  <div className="space-y-1">
                    <label htmlFor="shift-operator-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'Cashier / Operator name *' : 'اسم الكاشير المستلم لعهدة الوردية *'}
                    </label>
                    <input
                      id="shift-operator-input"
                      type="text"
                      required
                      value={cashierNameInput}
                      onChange={(e) => setCashierNameInput(e.target.value)}
                      placeholder={lang === 'en' ? 'Enter Operator full name...' : 'مثال: أحمد محمد، كاشير الأمانة...'}
                      className="w-full px-3 py-2 border border-gray-250 focus:border-black rounded-lg text-xs outline-none"
                    />
                  </div>

                  {/* Cash float input */}
                  <div className="space-y-1">
                    <label htmlFor="shift-float-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'Opening Cash Float ($) *' : 'رأس مال الصندوق الفردي الافتتاحي ($) *'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">$</span>
                      <input
                        id="shift-float-input"
                        type="number"
                        step="0.01"
                        required
                        value={openingCashInput}
                        onChange={(e) => setOpeningCashInput(e.target.value)}
                        placeholder="e.g., 200.00"
                        className="w-full pl-6 pr-3 py-2 border border-gray-255 focus:border-black rounded-lg text-xs outline-none focus:ring-1 focus:ring-black text-slate-805 text-left"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-black hover:bg-black/99 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Unlock size={14} className="animate-none" />
                  {lang === 'en' ? 'Acknowledge & Launch Daily Shift (الوردية)' : 'الموافقة وبدء وردية جديدة بالصندوق'}
                </button>
              </form>
            </div>
          )}

          {/* ACTIVE DRAWER AUDITS POLICY SUMMARY */}
          <div className="bg-black text-gray-205 p-5 rounded-xl flex gap-4 items-center">
            <FolderLock size={24} className="text-[#D97706] shrink-0" />
            <div className="space-y-1 text-xs font-sans">
              <h4 className="font-bold text-white uppercase tracking-wider text-[10.5px] font-mono">
                {lang === 'en' ? 'Fraud Prevention Compliance Notice' : 'معايير إدارة ومطابقة عهدة الورديات'}
              </h4>
              <p className="text-gray-300 leading-relaxed text-[11px]">
                {lang === 'en' 
                  ? 'Upon daily closing, cashiers must perform a physical bill count. Discrepancy counts are archived globally in Firestore logs. Consistent discrepancy triggers direct operational reviews. All updates are tamper-isolated.' 
                  : 'عند إغلاق الوردية، يجب على الكاشير عد النقود الفعلية بالخزنة وإدخالها. يتم توثيق وحفظ العجز والزيادة تلقائيًا بقاعدة البيانات، ويمنع تماماً التلاعب بالسجلات التاريخية للورديات.'}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HISTORICAL SHIFTS RECONCILIATION */}
        <div id="historical-shifts-audit-log" className="lg:col-span-4 bg-white border border-[#E5E7EB] p-4 rounded-xl flex flex-col justify-stretch font-sans">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <FolderLock size={16} className="text-black" />
              {lang === 'en' ? 'Recent Reconciliations Audit' : 'سجلات تدقيق ومطابقة الورديات'}
            </h3>
            <span className="bg-gray-100 text-gray-600 text-[10px] font-mono py-0.5 px-2 rounded-full">
              {historicalShifts.length} {lang === 'en' ? 'items' : 'عمليات'}
            </span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {historicalShifts.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                <FolderLock className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                <span>{lang === 'en' ? 'No shift history registered yet' : 'لم تنفذ أي مطابقة وردية بالعهد بعد'}</span>
              </div>
            ) : (
              historicalShifts.map(shift => {
                const discValue = shift.discrepancy || 0;
                let discrepancyBadge = null;

                if (discValue === 0) {
                  discrepancyBadge = <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">{lang === 'en' ? 'Matched ($0)' : 'مطابق تماماً ($٠)'}</span>;
                } else if (discValue < 0) {
                  discrepancyBadge = <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">{lang === 'en' ? `Shortage ($${Math.abs(discValue).toFixed(2)})` : `عجز ($${Math.abs(discValue).toFixed(2)})`}</span>;
                } else {
                  discrepancyBadge = <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]">{lang === 'en' ? `Excess (+$${discValue.toFixed(2)})` : `زيادة (+$${discValue.toFixed(2)})`}</span>;
                }

                return (
                  <div key={shift.id} className="bg-gray-50/50 hover:bg-gray-50 p-2.5 rounded-lg border border-[#E5E7EB] text-xs text-slate-705 flex flex-col gap-2 font-sans">
                    <div className="flex justify-between items-start font-sans">
                      <div>
                        <span className="font-bold text-gray-901">{shift.cashierName}</span>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(shift.openedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        {discrepancyBadge}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500 border-t border-gray-100/50 pt-2">
                      <div>{lang === 'en' ? 'Float Opening:' : 'رأس مال الافتتاح:'} <span className="font-bold text-gray-700">{shift.openingCash.toFixed(2)} {lang === 'en' ? 'EGP' : 'ج.م'}</span></div>
                      <div>{lang === 'en' ? 'Expected Closing:' : 'توتال الدرج المتوقع:'} <span className="font-bold text-gray-700">{shift.expectedCash.toFixed(2)} {lang === 'en' ? 'EGP' : 'ج.م'}</span></div>
                      <div>{lang === 'en' ? 'Actual Count:' : 'النقد المدخل يدوياً:'} <span className="font-bold text-gray-700">{shift.actualCash?.toFixed(2) || 'N/A'} {lang === 'en' ? 'EGP' : 'ج.م'}</span></div>
                      <div className="text-black font-bold">{lang === 'en' ? 'Cash/VF Sales:' : 'مبيعات كاش/فودافون:'} <span className="text-emerald-700">{shift.cashSales.toFixed(2)}</span> / <span className="text-red-650">{shift.vodafoneSales?.toFixed(2) || '0.00'}</span> {lang === 'en' ? 'EGP' : 'ج.م'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* SHIFT MATCH CLOSING POPUP MODAL */}
      <AnimatePresence>
        {isClosingShift && activeShift && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-[#E5E7EB] max-w-sm w-full overflow-hidden"
            >
              <div className="bg-black text-white p-5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 justify-start">
                  <Unlock size={14} className="text-[#059669] animate-none" />
                  {lang === 'en' ? 'Drawer Reconciliation Audit' : 'مطابقة عهدة الصندوق والدرج'}
                </h3>
                <button onClick={() => setIsClosingShift(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCloseSubmit} className="p-5 space-y-4 text-xs font-sans">
                <div className="text-gray-500 font-medium leading-relaxed font-sans">
                  {lang === 'en' ? (
                    <span>Hi <span className="font-bold text-black">{activeShift.cashierName}</span>, please count all raw physical bank bills and coins inside the cash drawer (العفار / الخزنة) and specify the precise value. Only cash counts!</span>
                  ) : (
                    <span>مرحباً يا <span className="font-bold text-black">{activeShift.cashierName}</span>، يرجى عد ومطابقة الأوراق والقطع النقدية الملموسة والعملات المتوفرة في صندوق الكاشير لإقفال الوردية الحالية المعتمدة.</span>
                  )}
                </div>

                <div className="bg-gray-50 border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5 font-mono">
                  <div className="flex justify-between font-sans">
                    <span className="text-gray-500 text-[10px] uppercase font-bold">{lang === 'en' ? 'Float Opening Cash:' : 'رأس مال البداية (العهد):'}</span>
                    <span className="text-gray-700 font-bold">${activeShift.openingCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-gray-500 text-[10px] uppercase font-bold">{lang === 'en' ? 'Plus Cash-Sales Checked:' : 'صندوق مبيعات الكاش الإضافي:'}</span>
                    <span className="text-gray-700 font-bold">${activeShiftStats.cashSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 text-xs text-slate-900 font-bold font-sans">
                    <span>{lang === 'en' ? 'EXPECTED IN DRAWER:' : 'المجموع النقدي المتوقع بالمطابقة:'}</span>
                    <span className="text-black">${expectedCashTally.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 font-sans">
                  <label htmlFor="actual-cash-counted-input" className="text-xs font-semibold text-gray-700">
                    {lang === 'en' ? 'Actual Physically Counted Cash ($) *' : 'النقد الفعلي الملموس بالدرج حالياً ($) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">$</span>
                    <input
                      id="actual-cash-counted-input"
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      value={actualCashInput}
                      onChange={(e) => setActualCashInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-3 py-2 border border-gray-200 focus:border-black rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Live discrepancy notification math */}
                {actualCashInput && (
                  <div className={`p-3 rounded-lg border flex justify-between items-center text-[11px] font-mono leading-relaxed ${
                    parseFloat(actualCashInput) - expectedCashTally === 0 
                      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                      : parseFloat(actualCashInput) - expectedCashTally < 0 
                        ? 'bg-[#FEF2F2] border-[#FEE2E2] text-[#DC2626] font-bold'
                        : 'bg-[#FFFBEB] border-[#FEF3C7] text-[#D97706]'
                  }`}>
                    <span className="font-sans">{lang === 'en' ? 'Discrepancy:' : 'الفروقات (عجز أو زيادة):'}</span>
                    <span className="font-extrabold font-sans">
                      {parseFloat(actualCashInput) - expectedCashTally === 0 
                        ? (lang === 'en' ? 'PERFECT MATCH ($0)' : 'مطابق تماماً ($٠)') 
                        : parseFloat(actualCashInput) - expectedCashTally < 0 
                          ? (lang === 'en' ? `SHORTAGE (-$${Math.abs(parseFloat(actualCashInput) - expectedCashTally).toFixed(2)})` : `عجز قدّره (-$${Math.abs(parseFloat(actualCashInput) - expectedCashTally).toFixed(2)})`) 
                          : (lang === 'en' ? `EXCESS DRAWER (+$${(parseFloat(actualCashInput) - expectedCashTally).toFixed(2)})` : `زيادة في الدرج قدّرها (+$${(parseFloat(actualCashInput) - expectedCashTally).toFixed(2)})`)}
                    </span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2 font-sans">
                  <button
                    type="button"
                    onClick={() => setIsClosingShift(false)}
                    className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-655 font-semibold rounded-lg text-xs transition animate-none font-sans"
                  >
                    {lang === 'en' ? 'Go Back' : 'تراجع'}
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-1.5 bg-black hover:bg-black/98 text-white font-bold rounded-lg text-xs transition font-sans"
                  >
                    {lang === 'en' ? 'Confirm Drawer Match & Lock' : 'تأكيد مطابقة عهدة الصندوق والدرج'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
