/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  ShieldAlert, 
  Clock, 
  Activity, 
  ArrowRight,
  TrendingDown,
  Percent,
  Layers
} from 'lucide-react';
import { Product, SalesOrder, Shift } from '../types';

interface DashboardProps {
  products: Product[];
  orders: SalesOrder[];
  activeShift: Shift | null;
  onNavigate: (tab: string) => void;
  lang?: 'en' | 'ar';
  currencySymbol?: string;
}

export default function Dashboard({ products, orders, activeShift, onNavigate, lang = 'en', currencySymbol }: DashboardProps) {
  const symbol = currencySymbol || (lang === 'ar' ? 'ج.م' : 'EGP');
  const today = new Date();

  const getArabicDayName = (dayIndex: number): string => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex];
  };

  const getSystemDateString = () => {
    const todayObj = new Date();
    if (lang === 'ar') {
      const dayName = getArabicDayName(todayObj.getDay());
      const arabicDate = todayObj.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return `${dayName}، ${arabicDate}`;
    } else {
      return todayObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // 1. CALCULATE METRICS
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let cardSalesTotal = 0;
    let cashSalesTotal = 0;
    const productSalesCount: Record<string, number> = {};

    orders.forEach(order => {
      totalRevenue += order.total;
      if (order.paymentMethod === 'card') {
        cardSalesTotal += order.total;
      } else {
        cashSalesTotal += order.total;
      }

      order.items.forEach(item => {
        // Track quantities sold
        productSalesCount[item.productId] = (productSalesCount[item.productId] || 0) + item.quantity;
        // Cost of goods sold
        totalCost += item.costPrice * item.quantity;
      });
    });

    const netProfit = totalRevenue - totalCost;
    const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Smart Alerts: Low Stock
    const lowStockItems = products.filter(p => p.quantity <= p.safetyStock);

    // Smart Alerts: Near Expiration (within 60 days of 2026-05-30)
    const expirationAlerts = products.filter(p => {
      if (!p.expirationDate) return false;
      const expDate = new Date(p.expirationDate);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 60; // critical or near-critical
    }).map(p => {
      const expDate = new Date(p.expirationDate!);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        product: p,
        daysToExpiry: diffDays,
        status: diffDays < 0 ? 'expired' : diffDays <= 15 ? 'critical' : diffDays <= 30 ? 'soon' : 'warning'
      };
    });

    // Dead Stock Analysis: items with positive quantity but zero historical sales inside orders
    const deadStockItems = products.filter(p => {
      const hasSales = Object.keys(productSalesCount).includes(p.id);
      return !hasSales && p.quantity > 0;
    });

    const deadStockValue = deadStockItems.reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);

    return {
      totalRevenue,
      netProfit,
      profitMarginPercent,
      cashSalesTotal,
      cardSalesTotal,
      lowStockCount: lowStockItems.length,
      expirationCount: expirationAlerts.length,
      lowStockItems,
      expirationAlerts,
      deadStockItems,
      deadStockValue,
      productSalesCount
    };
  }, [products, orders]);

  // 2. DATA FOR CHARTS: Top Selling Items Breakdown
  const topSellingDetails = useMemo(() => {
    return Object.entries(metrics.productSalesCount)
      .map(([id, val]) => {
        const prod = products.find(p => p.id === id);
        const quantity = Number(val);
        return {
          name: prod ? prod.name : 'Unknown Product',
          qty: quantity,
          revenue: quantity * (prod ? prod.sellingPrice : 0),
          category: prod ? prod.category : 'General'
        };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [metrics.productSalesCount, products]);

  // 3. CATEGORY CHARTING DATA
  const categorySummary = useMemo(() => {
    const summary: Record<string, { revenue: number; profit: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod ? prod.category : 'Uncategorized';
        if (!summary[cat]) {
          summary[cat] = { revenue: 0, profit: 0 };
        }
        const itemProfit = (item.sellingPrice - item.costPrice) * item.quantity - item.discount;
        summary[cat].revenue += item.total;
        summary[cat].profit += itemProfit;
      });
    });

    return Object.entries(summary).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      profit: parseFloat(data.profit.toFixed(2))
    })).sort((a, b) => b.revenue - a.revenue);
  }, [orders, products]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER SUMMARY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h2 id="dashboard-heading" className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">
            {lang === 'en' ? 'Enterprise Operations Control' : 'لوحة تحكم العمليات التشغيلية'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'en' ? `Live updates for ${getSystemDateString()}` : `التحديثات الحية لـ ${getSystemDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeShift ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ECFDF5] text-[#059669] rounded-full border border-[#A7F3D0] text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-[#059669] rounded-full animate-ping"></span>
              {lang === 'en' 
                ? `Active Shift: ${activeShift.cashierName} (Drawer Balance: ${(activeShift.openingCash + activeShift.cashSales).toFixed(2)} ${symbol})`
                : `الوردية النشطة: ${activeShift.cashierName} (رصيد الدرج: ${(activeShift.openingCash + activeShift.cashSales).toFixed(2)} ${symbol})`}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FEF2F2] text-[#DC2626] rounded-full border border-[#FEE2E2] text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-[#DC2626] rounded-full"></span>
              {lang === 'en' ? 'Register Offline • No Active Shift' : 'صندوق الكاشير مغلق • لا توجد وردية نشطة'}
            </div>
          )}
        </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* TOTAL REVENUE */}
        <motion.div 
          id="stat-revenue"
          whileHover={{ y: -1 }}
          className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-black transition-colors duration-200"
        >
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              {lang === 'en' ? 'Gross Income' : 'إجمالي المبيعات'}
            </span>
            <div className="p-2.5 bg-[#F3F4F6] text-black rounded-xl">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-semibold text-gray-950">{metrics.totalRevenue.toFixed(2)} {symbol}</h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-black font-semibold bg-[#F3F4F6] w-fit px-2.5 py-1 rounded-full">
              <TrendingUp size={12} />
              <span>{lang === 'en' ? 'Target Achieved' : 'تم استهداف النجاح'}</span>
            </div>
          </div>
        </motion.div>

        {/* NET PROFIT */}
        <motion.div 
          id="stat-profit"
          whileHover={{ y: -1 }}
          className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-black transition-colors duration-200"
        >
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              {lang === 'en' ? 'Net Profit' : 'صافي الأرباح'}
            </span>
            <div className="p-2.5 bg-[#ECFDF5] text-[#059669] rounded-xl font-bold">
              <Percent size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-semibold text-gray-950">{metrics.netProfit.toFixed(2)} {symbol}</h3>
            <p className="text-xs text-gray-500 mt-2">
              {lang === 'en' ? 'Margin efficiency: ' : 'كفاءة الهامش: '}
              <span className="font-semibold text-[#059669]">{metrics.profitMarginPercent.toFixed(1)}%</span>
            </p>
          </div>
        </motion.div>

        {/* LOW STOCK ALERT */}
        <motion.div 
          id="stat-low-stock"
          whileHover={{ y: -1 }}
          onClick={() => onNavigate('inventory')}
          className="bg-white p-6 rounded-2xl border border-[#E5E7EB] cursor-pointer hover:border-black transition-colors duration-200"
        >
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              {lang === 'en' ? 'Restock Alerts' : 'تنبيهات إعادة الطلب'}
            </span>
            <div className={`p-2.5 rounded-xl ${metrics.lowStockCount > 0 ? 'bg-[#FEF2F2] text-[#DC2626] animate-pulse' : 'bg-gray-50 text-gray-400'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-semibold text-gray-950">
              {metrics.lowStockCount} {lang === 'en' ? 'items' : 'منتجات'}
            </h3>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              {metrics.lowStockCount > 0 ? (
                <span className="text-[#DC2626] font-semibold flex items-center gap-1">
                  {lang === 'en' ? 'CRITICAL: Below safety stock' : 'حرج: تحت حد الأمان المسموح'}
                </span>
              ) : (
                <span className="text-[#059669] font-semibold">
                  {lang === 'en' ? 'Inventory fully optimized' : 'المخزون مكتمل ومحسن'}
                </span>
              )}
            </p>
          </div>
        </motion.div>

        {/* NEAR EXPIRATION SENSORS */}
        <motion.div 
          id="stat-expiry"
          whileHover={{ y: -1 }}
          className="bg-white p-6 rounded-2xl border border-[#E5E7EB] hover:border-black transition-colors duration-200"
        >
          <div className="flex justify-between items-start">
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
              {lang === 'en' ? 'Expiry Sensors' : 'مستشعرات الصلاحية'}
            </span>
            <div className={`p-2.5 rounded-xl ${metrics.expirationCount > 0 ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-gray-50 text-gray-400'}`}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-semibold text-gray-950">
              {metrics.expirationCount} {lang === 'en' ? 'alerts' : 'تنبيهات صالحة'}
            </h3>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.expirationCount > 0 ? (
                <span className="text-[#D97706] font-semibold">
                  {lang === 'en' ? 'Near-term (30-60 days) risk' : 'مخاطر قريبة في (٣٠ - ٦٠ يوم)'}
                </span>
              ) : (
                <span className="text-[#059669] font-semibold">
                  {lang === 'en' ? 'All dates highly compliant' : 'كل تواريخ الصلاحية مطابقة معتمدة'}
                </span>
              )}
            </p>
          </div>
        </motion.div>
      </div>

      {/* 3. ALERTS & OPERATIONAL INTELLIGENCE */}
      {(metrics.lowStockCount > 0 || metrics.expirationCount > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-sans">
          {/* LOW STOCK ACTION LIST */}
          {metrics.lowStockCount > 0 && (
            <div id="low-stock-critical-list" className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2] text-xs font-semibold rounded-full uppercase tracking-wider">LIVE</div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {lang === 'en' ? 'Critical Restock Triggers' : 'حالات إعادة الطلب الحرجة'}
                  </h3>
                </div>
                <button onClick={() => onNavigate('inventory')} className="text-xs text-black hover:underline flex items-center gap-1 font-medium bg-[#F3F4F6] px-3 py-1 rounded-full">
                  {lang === 'en' ? 'Go to Refill' : 'تعبئة المخزون'} <ArrowRight size={12} className={lang === 'ar' ? 'rotate-180' : ''} />
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-1">
                {metrics.lowStockItems.map(item => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
                      <p className="text-gray-400 font-mono mt-0.5">{item.barcode}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[#DC2626] font-semibold bg-[#FEF2F2] px-2.5 py-1 rounded-full border border-[#FEE2E2] font-mono text-[10px]">
                        {lang === 'en' ? `Qty: ${item.quantity} / Min: ${item.safetyStock}` : `الكمية: ${item.quantity} / حد الأمان: ${item.safetyStock}`}
                      </div>
                      <p className="text-gray-400 mt-1">
                        {lang === 'en' ? 'Cost unit: ' : 'كلفة الوحدة: '}{item.costPrice.toFixed(2)} {symbol}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEAR EXPIRATION CRITICAL */}
          {metrics.expirationCount > 0 && (
            <div id="near-expiry-critical-list" className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] text-xs font-semibold rounded-full uppercase tracking-wider">DANGER</div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {lang === 'en' ? 'Sensory Pharmacy Expirations' : 'تواريخ الصلاحية وتلف الأدوية'}
                  </h3>
                </div>
                <button onClick={() => onNavigate('inventory')} className="text-xs text-black hover:underline flex items-center gap-1 font-medium bg-[#F3F4F6] px-3 py-1 rounded-full">
                  {lang === 'en' ? 'Inspect All' : 'فحص الكل'} <ArrowRight size={12} className={lang === 'ar' ? 'rotate-180' : ''} />
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-1">
                {metrics.expirationAlerts.map(alert => (
                  <div key={alert.product.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-semibold text-gray-900 line-clamp-1">{alert.product.name}</h4>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-gray-400 font-mono">{alert.product.barcode}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500 font-medium">
                          {lang === 'en' ? 'Expiry: ' : 'انتهاء: '}{alert.product.expirationDate}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {alert.daysToExpiry < 0 ? (
                        <span className="px-2 py-1 bg-[#DC2626] text-white rounded-full font-bold uppercase tracking-wider text-[9px]">
                          {lang === 'en' ? `EXPIRED (${Math.abs(alert.daysToExpiry)}d)` : `منتهي الصلاحية (${Math.abs(alert.daysToExpiry)} يوم)`}
                        </span>
                      ) : alert.daysToExpiry <= 15 ? (
                        <span className="px-2.5 py-1 bg-[#FEF2F2] text-[#DC2626] rounded-full border border-[#FEE2E2] font-bold text-[9px] uppercase tracking-wider">
                          {lang === 'en' ? `CRITICAL (${alert.daysToExpiry} days)` : `حرج (${alert.daysToExpiry} يوم)`}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-[#FFFBEB] text-[#D97706] rounded-full border border-[#FEF3C7] font-bold text-[9px]">
                          {alert.daysToExpiry} {lang === 'en' ? 'days' : 'أيام'}
                        </span>
                      )}
                      <p className="text-gray-400 mt-1 font-mono">
                        {lang === 'en' ? `Qty: ${alert.product.quantity} left` : `الكمية المتبقية: ${alert.product.quantity}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. DATA VISUALIZATIONS BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
        
        {/* TOP SELLING CHART (SVG DRIVEN) */}
        <div id="chart-top-selling" className="bg-white border border-[#E5E7EB] p-6 rounded-2xl lg:col-span-7">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Product Volume Movement' : 'حركة مبيعات المنتجات'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'en' ? 'Top performing items by volume sold' : 'المنتجات الأعلى أداء مقارنة بالكمية'}
              </p>
            </div>
            <div className="p-1 px-3 bg-[#F3F4F6] rounded-full text-[10px] text-black font-semibold uppercase tracking-wider select-none border border-transparent">
              {lang === 'en' ? 'Sales Ledger Analysis' : 'تحليل حركة دفتر المبيعات'}
            </div>
          </div>

          {topSellingDetails.length === 0 ? (
            <div className="h-[210px] flex flex-col justify-center items-center text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-100">
              <Activity className="w-8 h-8 text-gray-300 animate-pulse mb-2" />
              <span>
                {lang === 'en' ? 'Checkout transactions to view live analytics charts' : 'قم بإنهاء مبيعات من الكاشير لمشاهدة رسوم البياني التحليلية'}
              </span>
            </div>
          ) : (
            <div className="space-y-4 h-[210px] flex flex-col justify-between">
              {topSellingDetails.map((item, index) => {
                const maxQty = Math.max(...topSellingDetails.map(x => x.qty));
                const widthPercent = (item.qty / maxQty) * 100;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-800 truncate max-w-[250px]" title={item.name}>
                        {index + 1}. {item.name}
                      </span>
                      <span className="text-gray-500 font-mono">
                        {item.qty} {lang === 'en' ? 'units' : 'وحدات'} &middot; <span className="text-gray-800">{item.revenue.toFixed(2)} {symbol}</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#F3F4F6] h-2 rounded-full overflow-hidden flex">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          index === 0 ? 'bg-black' :
                          index === 1 ? 'bg-[#4B5563]' :
                          index === 2 ? 'bg-[#9CA3AF]' :
                          index === 3 ? 'bg-[#D1D5DB]' : 'bg-[#E5E7EB]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CATEGORY BREAKDOWN BARS */}
        <div id="chart-category-perf" className="bg-white border border-[#E5E7EB] p-6 rounded-2xl lg:col-span-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Revenue & Profit Margins' : 'الإيرادات وهامش الأرباح'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'en' ? 'Performance mapped to category sectors' : 'توزيع الأداء العام لكل فئة أعمال'}
              </p>
            </div>
            <Layers size={16} className="text-gray-400" />
          </div>

          {categorySummary.length === 0 ? (
            <div className="h-[210px] flex flex-col justify-center items-center text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-100">
              <Layers className="w-8 h-8 text-gray-300 mb-2" />
              <span>
                {lang === 'en' ? 'No categories listed in transactions yet.' : 'لا وجزد لعمليات بيع مصنفة حالياً.'}
              </span>
            </div>
          ) : (
            <div className="space-y-3.5 h-[210px] overflow-y-auto pr-1">
              {categorySummary.map(cat => {
                const maxRev = Math.max(...categorySummary.map(x => x.revenue));
                const revWidth = (cat.revenue / maxRev) * 100;
                const profitMargin = cat.revenue > 0 ? (cat.profit / cat.revenue) * 100 : 0;
                return (
                  <div key={cat.category} className="text-xs space-y-1 bg-[#FAFAFA] p-2.5 rounded-xl border border-[#E5E7EB]/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-850 truncate" title={cat.category}>{cat.category}</span>
                      <div className="flex gap-2 items-center font-mono font-bold text-gray-700">
                        <span>{lang === 'en' ? 'Rev' : 'إيراد'}: {cat.revenue.toFixed(1)} {symbol}</span>
                        <span className="text-[#059669]">{lang === 'en' ? 'Net' : 'صافي'}: {cat.profit.toFixed(1)} {symbol}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden relative mt-1.5">
                      <div 
                        className="h-full bg-black" 
                        style={{ width: `${revWidth}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                      <span>{lang === 'en' ? 'Profitability Ratio' : 'نسبة الربحية الكلية'}</span>
                      <span className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-1.5 rounded-full text-[9px] font-bold">{profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. DEAD STOCK AGENT REPORT */}
      <div id="dead-stock-agent-panel" className="bg-black text-white rounded-2xl p-6 flex flex-col md:flex-row gap-5 items-stretch font-sans">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D97706] animate-pulse"></span>
            <span className="text-[10px] tracking-wider uppercase font-bold text-[#9CA3AF] font-mono">
              {lang === 'en' ? 'Liquidity Risk Intelligence' : 'ذكاء مخاطر التدفق المالي'}
            </span>
          </div>
          <h3 className="text-base font-medium text-white tracking-tight">
            {lang === 'en' ? 'Dead Stock Audit' : 'تدقيق مخزون البضائع الراكدة'}
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            {lang === 'en' ? (
              <>
                Dead stock locks cash flow and risks critical waste. We identified <span className="text-white bg-[#D97706] px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">{metrics.deadStockItems.length} items</span> in your inventory with positive quantities but ZERO recorded sales in the order book.
              </>
            ) : (
              <>
                السلع الراكدة تحبس التدفقات النقدية وقد تتلف. رصدنا <span className="text-white bg-[#D97706] px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">{metrics.deadStockItems.length} منتجات</span> في مخزنك متوفرة تجارياً ولكن بمبيعات صفرية مطلقة بسجل الفواتير.
              </>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333333]">
              <p className="text-[10px] text-gray-400 uppercase font-mono font-medium">
                {lang === 'en' ? 'Total Capital Locked' : 'إجمالي التدفق المقيد'}
              </p>
              <h4 className="text-lg font-semibold text-white mt-1">{metrics.deadStockValue.toFixed(2)} {symbol}</h4>
            </div>
            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333333]">
              <p className="text-[10px] text-gray-400 uppercase font-mono font-medium">
                {lang === 'en' ? 'Discharge Suggestion' : 'مقترح لتصريف السلع'}
              </p>
              <h4 className="text-[11px] font-semibold text-[#FEF3C7] mt-1.5">
                {lang === 'en' ? 'Deploy discounts • Expiring bundle' : 'تفعيل خصومات ترويجية • تجميع عروض تالفة'}
              </h4>
            </div>
          </div>
        </div>

        <div className="w-full md:w-[320px] bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">
            {lang === 'en' ? 'Locked Inventory Items' : 'العناصر الراكدة المقيدة'}
          </h4>
          <div className="divide-y divide-[#333333] max-h-[140px] overflow-y-auto pr-1 flex-1">
            {metrics.deadStockItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                {lang === 'en' ? '0 locked stock found. Good inventory speed!' : 'لا توجد منتجات راكدة. حركة المخزون ممتازة!'}
              </div>
            ) : (
              metrics.deadStockItems.slice(0, 4).map(item => (
                <div key={item.id} className="py-2 flex justify-between items-center text-[11px]">
                  <span className="truncate text-gray-300 max-w-[170px]" title={item.name}>{item.name}</span>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[#D97706] font-bold">
                      {item.quantity} {lang === 'en' ? 'in-store' : 'في المخزن'}
                    </span>
                    <p className="text-[9px] text-gray-500 font-mono">
                      {lang === 'en' ? 'Cost' : 'كلفة'}: {(item.costPrice * item.quantity).toFixed(2)} {symbol}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => onNavigate('inventory')} className="w-full mt-2 py-2 bg-[#222222] hover:bg-[#333333]/80 text-[11px] text-white rounded-lg font-medium transition flex items-center justify-center gap-1.5 border border-[#333333]">
            {lang === 'en' ? 'Open Inventory Manager' : 'فتح كتالوج وإدارة المخزون'} <ArrowRight size={12} className={lang === 'ar' ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
