/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Store, 
  Plus, 
  Check, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  QrCode, 
  Smartphone, 
  Info, 
  Building2, 
  Briefcase, 
  Coins, 
  FileText,
  Percent,
  X,
  Clock,
  Calendar,
  Search,
  CreditCard,
  User,
  ChevronDown,
  ChevronUp,
  Edit
} from 'lucide-react';
import { Shop, Product, SalesOrder, Shift } from '../types';

interface AdminPortalProps {
  shops: Shop[];
  activeShopId: string;
  onSelectShop: (id: string) => void;
  onAddShop: (name: string, type: Shop['type'], currency: Shop['currency']) => void;
  onUpdateShopName: (id: string, name: string) => void;
  onDeleteShop: (id: string) => void;
  products: Product[];
  orders: SalesOrder[];
  shifts: Shift[];
  lang?: 'en' | 'ar';
  onResetDatabase?: () => void;
}

export default function AdminPortal({
  shops,
  activeShopId,
  onSelectShop,
  onAddShop,
  onUpdateShopName,
  onDeleteShop,
  products,
  orders,
  shifts,
  lang = 'en',
  onResetDatabase
}: AdminPortalProps) {
  // Portal sub-tabs: 'branches' or 'monitor'
  const [portalSubTab, setPortalSubTab] = useState<'branches' | 'monitor'>('monitor');

  // Inline Shop Renaming States
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState<string>('');

  // Search/Filters states for Daily Invoices Jaird
  const [searchDate, setSearchDate] = useState<string>(() => {
    // default to today's date formatted as YYYY-MM-DD in local time
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1050));
    return localToday.toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCashier, setFilterCashier] = useState('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'cash' | 'card'>('all');
  const [filterShop, setFilterShop] = useState('all');

  // Add Shop states
  const [newShopName, setNewShopName] = useState('');
  const [newShopType, setNewShopType] = useState<Shop['type']>('supermarket');
  const [newShopCurrency, setNewShopCurrency] = useState<Shop['currency']>('EGP');
  const [errorMe, setErrorMe] = useState('');
  const [successMe, setSuccessMe] = useState('');

  // Get active shop detail
  const activeShop = useMemo(() => {
    return shops.find(s => s.id === activeShopId) || shops[0];
  }, [shops, activeShopId]);

  const currencySymbol = activeShop?.currency === 'USD' ? '$' : (lang === 'ar' ? 'ج.م' : 'EGP');

  // Multi-shop analytics
  const analytics = useMemo(() => {
    // 1. Overall stats (Across all shops)
    let grandRevenue = 0;
    let grandCost = 0;
    let grandOrdersCount = orders.length;

    orders.forEach(order => {
      grandRevenue += order.total;
      order.items.forEach(item => {
        grandCost += (item.costPrice * item.quantity);
      });
    });

    const grandProfit = grandRevenue - grandCost;

    // 2. Stats per shop
    const shopAnalysis = shops.map(shop => {
      const shopOrders = orders.filter(o => o.shopId === shop.id || (!o.shopId && shop.id === 'shop_default'));
      const shopProducts = products.filter(p => p.shopId === shop.id || (!p.shopId && shop.id === 'shop_default'));
      const shopShifts = shifts.filter(s => s.shopId === shop.id || (!s.shopId && shop.id === 'shop_default'));

      let revenue = 0;
      let cost = 0;
      shopOrders.forEach(o => {
        revenue += o.total;
        o.items.forEach(item => {
          cost += (item.costPrice * item.quantity);
        });
      });

      return {
        id: shop.id,
        name: shop.name,
        type: shop.type,
        currency: shop.currency,
        revenue,
        profit: revenue - cost,
        productsCount: shopProducts.length,
        ordersCount: shopOrders.length,
        shiftsCount: shopShifts.length
      };
    });

    return {
      grandRevenue,
      grandProfit,
      grandOrdersCount,
      shopAnalysis
    };
  }, [shops, products, orders, shifts]);

  // Unique cashiers and shops list
  const cashiersList = useMemo(() => {
    const list = new Set<string>();
    orders.forEach(o => {
      if (o.cashierName) list.add(o.cashierName.trim());
    });
    return Array.from(list);
  }, [orders]);

  // Filtered orders for live monitoring / audits
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Date comparison
      if (searchDate) {
        const orderDate = order.createdAt.split('T')[0];
        if (orderDate !== searchDate) return false;
      }
      
      // 2. Shop filter
      if (filterShop !== 'all') {
        const orderShopId = order.shopId || 'shop_default';
        if (orderShopId !== filterShop) return false;
      }

      // 3. Payment Filter
      if (filterPayment !== 'all') {
        if (order.paymentMethod !== filterPayment) return false;
      }

      // 4. Cashier Filter
      if (filterCashier !== 'all') {
        if (order.cashierName !== filterCashier) return false;
      }

      // 5. Query Search (barcode, name, cashier or ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesCashier = order.cashierName.toLowerCase().includes(q);
        const matchesProduct = order.items.some(item => 
          item.name.toLowerCase().includes(q) || 
          item.barcode.includes(q)
        );
        if (!matchesId && !matchesCashier && !matchesProduct) return false;
      }

      return true;
    });
  }, [orders, searchDate, filterShop, filterPayment, filterCashier, searchQuery]);

  // Sum stats on the filtered order set
  const auditStats = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalCost = 0;

    filteredOrders.forEach(o => {
      totalSales += o.total;
      totalTax += o.tax || 0;
      totalDiscount += o.discount || 0;
      if (o.paymentMethod === 'cash') cashSales += o.total;
      else cardSales += o.total;

      o.items.forEach(item => {
        totalCost += (item.costPrice * item.quantity);
      });
    });

    return {
      totalSales,
      cashSales,
      cardSales,
      totalTax,
      totalDiscount,
      totalCost,
      netProfit: totalSales - totalCost,
      count: filteredOrders.length
    };
  }, [filteredOrders]);

  // Live Hourly sales tracker
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const isPm = i >= 12;
      const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
      const labelAr = `${displayHour} ${isPm ? 'مساًء' : 'صباحاً'}`;
      const labelEn = `${displayHour} ${isPm ? 'PM' : 'AM'}`;
      return {
        hour: i,
        label: lang === 'ar' ? labelAr : labelEn,
        total: 0,
        count: 0
      };
    });

    filteredOrders.forEach(order => {
      try {
        const timePart = order.createdAt.split('T')[1];
        if (timePart) {
          const hour = parseInt(timePart.split(':')[0], 10);
          if (hour >= 0 && hour < 24) {
            hours[hour].total += order.total;
            hours[hour].count += 1;
          }
        }
      } catch (err) {
        console.error(err);
      }
    });

    return hours.filter(h => h.count > 0);
  }, [filteredOrders, lang]);

  // Track expanded invoice cards
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Handle Form Submission for New Shop
  const handleCreateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      setErrorMe(lang === 'en' ? 'Shop name is required!' : 'يجب إدخال اسم المحل!');
      return;
    }

    onAddShop(newShopName.trim(), newShopType, newShopCurrency);
    setNewShopName('');
    setSuccessMe(lang === 'en' ? 'Shop created and saved successfully!' : 'تم إنشاء ومزامنة المحل الجديد للعمل!');
    setErrorMe('');

    setTimeout(() => {
      setSuccessMe('');
    }, 3000);
  };

  // QR Code generator URL
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'https://ai.studio/build';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentAppUrl)}&color=0-0-0&bgcolor=fff`;

  // Display label translation helper
  const getShopTypeLabel = (type: Shop['type']) => {
    switch (type) {
      case 'supermarket': return lang === 'en' ? 'Supermarket' : 'سوبر ماركت';
      case 'clothing': return lang === 'en' ? 'Clothing Store' : 'محل ملابس';
      case 'pharmacy': return lang === 'en' ? 'Pharmacy' : 'صيدلية وعناية';
      case 'spare_parts': return lang === 'en' ? 'Spare Parts' : 'قطع غيار سيارات';
      default: return lang === 'en' ? 'Retail Store' : 'نشاط تجاري آخر';
    }
  };

  // Render helpers
  const formatHourString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const getShopNameById = (shopId?: string) => {
    const s = shops.find(item => item.id === (shopId || 'shop_default'));
    return s ? s.name : (lang === 'en' ? 'Main Shop' : 'المحل الرئيسي');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER SUMMARY */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-black text-[#A7F3D0] rounded-xl">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-950 font-sans">
                {lang === 'en' ? 'Owner & Admin Workspace' : 'بوابة مالك المتجر والإدارة والمتابعة'}
              </h2>
              <p className="text-xs text-gray-550 mt-1 font-sans">
                {lang === 'en' 
                  ? 'Multi-branch operations monitoring, cash ledger audits, and cloud synchronization' 
                  : 'مراقبة مبيعات الفروع المختلفة، وإدارة العهد والأصناف، والتحليلات الفورية عبر الهاتف'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm font-sans">
            <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></span>
            <span>
              {lang === 'en' ? 'Active Store: ' : 'الفرع التشغيلي الحالي: '}
              <span className="font-extrabold uppercase text-gray-905">{activeShop?.name || 'Main branch'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* HORIZONTAL TABS SWITCHER FOR OWNER */}
      <div className="flex bg-[#E5E7EB]/50 p-1 rounded-2xl border border-[#E5E7EB] w-full max-w-lg mx-auto select-none gap-1">
        <button
          type="button"
          onClick={() => setPortalSubTab('monitor')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all duration-300 ${
            portalSubTab === 'monitor'
              ? 'bg-black text-[#A7F3D0] shadow-sm'
              : 'text-gray-500 hover:text-black hover:bg-white/50'
          }`}
        >
          <TrendingUp size={15} />
          <span>{lang === 'en' ? 'Live Monitor & Invoices Audit' : 'المراقبة وجرد الفواتير الحية'}</span>
        </button>
        <button
          type="button"
          onClick={() => setPortalSubTab('branches')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all duration-300 ${
            portalSubTab === 'branches'
              ? 'bg-black text-[#A7F3D0] shadow-sm'
              : 'text-gray-500 hover:text-black hover:bg-white/50'
          }`}
        >
          <Store size={15} />
          <span>{lang === 'en' ? 'Config Branches' : 'تهيئة وإدارة الفروع'}</span>
        </button>
      </div>

      {/* INTERACTIVE SUB-TABS VIEWS */}
      {portalSubTab === 'monitor' ? (
        <div className="space-y-6">
          
          {/* SEARCH & AUDITING DATE SLIDER / FILTER PANEL */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-sm space-y-4 font-sans text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 justify-start">
                  <Calendar size={16} className="text-[#059669]" />
                  {lang === 'en' ? 'Filter Daily Transactions Inventory' : 'جرد وتصفية فواتير المبيعات والأيام'}
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                  {lang === 'en' ? 'Audit any target date and view hourly breakdowns remotely' : 'ابحث بأي يوم لمتابعة مبيعات الكاشير وساعة البيع بالثانية'}
                </p>
              </div>

              {/* Day Preset Buttons */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const offset = today.getTimezoneOffset();
                    const localToday = new Date(today.getTime() - (offset * 60 * 1050));
                    setSearchDate(localToday.toISOString().split('T')[0]);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition ${
                    searchDate === new Date().toISOString().split('T')[0]
                      ? 'bg-black text-white border-black'
                      : 'bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {lang === 'en' ? 'Today' : 'اليوم'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const offset = yesterday.getTimezoneOffset();
                    const localYest = new Date(yesterday.getTime() - (offset * 60 * 1050));
                    setSearchDate(localYest.toISOString().split('T')[0]);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition ${
                    searchDate === new Date(Date.now() - 86450000).toISOString().split('T')[0]
                      ? 'bg-black text-white border-black'
                      : 'bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {lang === 'en' ? 'Yesterday' : 'الأنشطة أمس'}
                </button>
                <button
                  type="button"
                  onClick={() => setSearchDate('')}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition ${
                    searchDate === ''
                      ? 'bg-black text-white border-black'
                      : 'bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {lang === 'en' ? 'All (No limits)' : 'كل الأوقات'}
                </button>
              </div>
            </div>

            {/* Responsive Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              
              {/* Date Input */}
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-bold text-gray-500 uppercase">
                  {lang === 'en' ? 'Select Target Date' : 'تاريخ الجرد المستهدف'}
                </label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-xs focus:ring-1 focus:ring-black outline-none cursor-pointer"
                />
              </div>

              {/* Shop Scope Selector */}
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-bold text-gray-500 uppercase">
                  {lang === 'en' ? 'Filter by Branch' : 'تصفية حسب الفرع'}
                </label>
                <select
                  value={filterShop}
                  onChange={(e) => setFilterShop(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-none cursor-pointer font-bold"
                >
                  <option value="all">{lang === 'en' ? 'All Branches' : 'جميع الفروع والشركاء'}</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Cashier Selector */}
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-bold text-gray-500 uppercase">
                  {lang === 'en' ? 'Filter by Cashier' : 'تصفية حسب الكاشير'}
                </label>
                <select
                  value={filterCashier}
                  onChange={(e) => setFilterCashier(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-none cursor-pointer font-bold"
                >
                  <option value="all">{lang === 'en' ? 'All Cashiers' : 'جميع الموظفين'}</option>
                  {cashiersList.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-bold text-gray-500 uppercase">
                  {lang === 'en' ? 'Payment Way' : 'طريقة السداد / الدفع'}
                </label>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-none cursor-pointer font-bold"
                >
                  <option value="all">{lang === 'en' ? 'Cash & Visa' : 'جميع طرق السداد'}</option>
                  <option value="cash">{lang === 'en' ? 'Cash Only (كاش)' : 'كاش نقدي فقط'}</option>
                  <option value="card">{lang === 'en' ? 'Card Only (بطاقة)' : 'فيزا وبطاقات فقط'}</option>
                </select>
              </div>

              {/* Search text input */}
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-bold text-gray-500 uppercase">
                  {lang === 'en' ? 'Invoice keyword search' : 'بحث بالباركود أو اسم الصنف'}
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'en' ? 'Barcode, name..' : 'مثال: بندول، TKT-21...'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-black outline-none text-right"
                />
              </div>

            </div>
          </div>

          {/* DYNAMIC SUM STATISTICS CARDS FOR FILTERED AUDITING TARGETS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Audited Income Total */}
            <div className="bg-slate-950 text-white border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden text-right">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono font-bold text-emerald-400 tracking-wider">
                  {lang === 'en' ? 'Audited Income Net' : 'صافي المبيعات المحققة'}
                </span>
                <h4 className="text-lg md:text-xl font-black font-mono tracking-tight text-white mt-1">
                  {auditStats.totalSales.toFixed(2)}{' '}
                  <span className="text-xs font-sans font-semibold text-emerald-400">EGP</span>
                </h4>
              </div>
              <p className="text-[9px] text-gray-400 mt-2 font-sans">
                {lang === 'en' ? 'Sum of matching parameters' : 'إجمالي الدخل للفترة المحددة'}
              </p>
              <div className="absolute right-2 bottom-1 text-emerald-400/10 pointer-events-none">
                <DollarSign size={40} />
              </div>
            </div>

            {/* Expected Profits */}
            <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm text-right">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                  {lang === 'en' ? 'Expected Gross Profit' : 'الأرباح الكلية المقدرة'}
                </span>
                <h4 className="text-lg md:text-xl font-bold font-mono tracking-tight text-[#059669] mt-1">
                  {auditStats.netProfit.toFixed(2)}{' '}
                  <span className="text-xs font-sans font-medium text-gray-400">EGP</span>
                </h4>
              </div>
              <p className="text-[9px] text-[#059669] font-bold mt-2 font-sans flex items-center gap-1 justify-end">
                <Check size={10} />
                {lang === 'en' ? 'Excluding buying cost' : 'البيع مخصوم منه سعر الجملة الأصلي'}
              </p>
            </div>

            {/* Cash Drawer Amount */}
            <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm text-right">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                  {lang === 'en' ? 'Direct Cash Sales drawer' : 'إجمالي مبيعات الـكـاش'}
                </span>
                <h4 className="text-lg md:text-xl font-bold font-mono tracking-tight text-gray-900 mt-1">
                  {auditStats.cashSales.toFixed(2)}{' '}
                  <span className="text-xs font-sans font-medium text-gray-400">EGP</span>
                </h4>
              </div>
              <p className="text-[9px] text-gray-400 mt-2 font-sans">
                {lang === 'en' ? 'Cash stored physically in drawer flow' : 'المبلغ النقدى المفترض تواجده في الخزنة حالياً'}
              </p>
            </div>

            {/* Total Invoices Count */}
            <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm text-right">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                  {lang === 'en' ? 'Total Bill Invoices' : 'عدد العمليات والفواتير الصادرة'}
                </span>
                <h4 className="text-lg md:text-xl font-bold font-mono tracking-tight text-indigo-600 mt-1">
                  {auditStats.count}{' '}
                  <span className="text-xs font-sans font-medium text-gray-400">{lang === 'en' ? 'bills' : 'فاتورة'}</span>
                </h4>
              </div>
              <p className="text-[9px] text-gray-400 mt-2 font-sans">
                {lang === 'en' ? 'Track order count' : 'كفاءة وسرعة مبيعات الكاشير'}
              </p>
            </div>

          </div>

          {/* REALTIME HOURLY GRAPH WORKFLOW & OLD INVOICE LIST SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* HOURLY ACTIVITY TIMELINE: MONITOR CAREFULLY ON THE PHONE */}
            <div className="lg:col-span-12 md:col-span-12 xl:col-span-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 pb-2.5 border-b border-gray-100 justify-start">
                  <Clock size={14} className="text-[#059669] shrink-0" />
                  {lang === 'en' ? 'Real-Time Hourly Sales Monitor' : 'سجل حركة مبيعات اليوم بالساعة والزمان'}
                </h3>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed text-right">
                  {lang === 'en' 
                    ? 'Breakdown of transactions by hour for the selected date. Keeps your cash register audited.' 
                    : 'جدول زمني يوضح حجم وتوقيت المبيعات التي تم تسديدها لايف. ممتاز وصالح للمتابعة الحية من التليفون.'}
                </p>

                {hourlyActivity.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 font-sans space-y-2">
                    <Clock size={28} className="mx-auto text-gray-300" />
                    <p className="text-xs">{lang === 'en' ? 'No transactions checked out in this hour' : 'لم تسجل أي عمليات بيع في هذا التاريخ المحدد بعد'}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {hourlyActivity.map(h => {
                      const hourPercent = (h.total / (auditStats.totalSales || 1)) * 105;
                      return (
                        <div key={h.hour} className="border border-gray-150 p-2.5 rounded-xl hover:bg-emerald-50/10 transition space-y-1.5 text-right">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-extrabold text-[#059669]">{h.total.toFixed(2)} EGP</span>
                            <span className="font-bold text-gray-900 flex items-center gap-1">
                              {h.label}
                              <span className="w-1.5 h-1.5 bg-[#059669] rounded-full"></span>
                            </span>
                          </div>

                          <div className="flex justify-between text-[10px] text-gray-450 font-sans font-medium">
                            <span>{hourPercent.toFixed(1)}% {lang === 'en' ? 'of day' : 'حصة مبيعات اليوم'}</span>
                            <span>{h.count} {lang === 'en' ? 'completed order' : 'فواتير تم تسديدها'}</span>
                          </div>

                          {/* Visual Progress percentage bar */}
                          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-black rounded-full" 
                              style={{ width: `${Math.max(4, hourPercent)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIVE PHONE CONNECTION GUIDE AT BOT */}
              <div className="bg-slate-50 border border-dashed border-gray-200 p-3.5 rounded-xl mt-4 text-[10.5px] text-gray-500 flex items-start gap-2 select-none text-right">
                <Smartphone size={16} className="text-[#059669] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {lang === 'en'
                    ? 'Connect through 4G/WiFi data securely! This scoreboard updates and pulls live sales continuously.'
                    : 'يمكنك جرد هذا السجل من هاتفك الشخصي أثناء تنقلك. أي عملية تبيعها الكاشير الآن ستسمع وتنعكس في حساب تليفونك فورياً بالثواني والدقائق والمتابعة لايف.'}
                </p>
              </div>

            </div>

            {/* OLD INVOICES AUDITING ROW LIST (EXPANDABLE & DETAILED) */}
            <div className="lg:col-span-12 md:col-span-12 xl:col-span-7 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 font-sans">
                <span className="bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-indigo-150">
                  {filteredOrders.length} {lang === 'en' ? 'found' : 'فاتورة مؤرشفة'}
                </span>
                <h3 className="text-xs font-extrabold text-gray-905 uppercase tracking-wider flex items-center gap-1.5">
                  {lang === 'en' ? 'Audit Ledger List of Invoices' : 'أرشيف وجرد الفواتير التفصيلي بالأيام'}
                  <FileText size={14} className="text-[#059669] shrink-0" />
                </h3>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="py-24 text-center text-gray-400 font-sans space-y-3">
                  <Search size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs leading-normal text-center">
                    {lang === 'en' ? 'No historical bills matched your custom filter parameters' : 'لم نجد أي فواتير مطابقة للبحث أو لتاريخ اليوم المختار.'}<br />
                    <span className="text-[10px] text-gray-400 font-semibold">{lang === 'en' ? 'Select other days or clear filters' : 'تأكد من تاريخ الجرد بأعلى الصفحة للتنقل للأيام السابقة.'}</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredOrders.map(order => {
                    const isExpanded = expandedInvoiceId === order.id;
                    const orderDateStr = order.createdAt.split('T')[0];
                    const orderTimeStr = formatHourString(order.createdAt);
                    
                    return (
                      <div 
                        key={order.id} 
                        className={`border rounded-xl transition-all ${
                          isExpanded 
                            ? 'border-black bg-slate-50/50 ring-2 ring-black/5' 
                            : 'border-gray-200 hover:border-black/20 bg-white'
                        }`}
                      >
                        {/* Summary Header of Card */}
                        <div 
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : order.id)}
                          className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none text-right"
                        >
                          <div className="flex items-center gap-3 justify-between md:justify-start w-full md:w-auto">
                            <div className="p-1 px-1.5 text-gray-400 border border-gray-200 rounded-lg hover:text-black hover:bg-gray-100 transition order-first md:order-none">
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </div>

                            <div className="text-left md:text-right">
                              <div className="text-[9px] text-gray-400 font-bold uppercase">{lang === 'en' ? 'Bill Amount' : 'قيمة الفاتورة'}</div>
                              <div className="text-sm font-black font-mono text-gray-950">
                                {order.total.toFixed(2)}{' '}
                                <span className="text-[10px] font-sans font-medium text-gray-500">EGP</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 md:text-right">
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {getShopNameById(order.shopId)}
                              </span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                order.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {order.paymentMethod === 'cash' ? (lang === 'en' ? 'CASH' : 'نقدي كاش') : (lang === 'en' ? 'VISA CARD' : 'بطاقة فيزا')}
                              </span>
                              <span className="font-mono font-extrabold text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 select-all">{order.id}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-gray-500 font-sans justify-end">
                              <span className="flex items-center gap-1 font-mono text-gray-400 font-semibold">
                                {orderTimeStr} ({orderDateStr})
                                <Clock size={11} className="text-gray-400" />
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center gap-1 font-semibold text-gray-700">
                                {order.cashierName}
                                <User size={11} className="text-gray-400" />
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Invoice Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-gray-100 text-xs font-sans space-y-3.5 bg-white rounded-b-xl text-right">
                            
                            {/* Product Items Table inside order */}
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-12 gap-1 pb-1 border-b border-gray-100 font-bold text-gray-400 text-[10px] uppercase">
                                <span className="col-span-2 text-left">{lang === 'en' ? 'Total' : 'إجمالي'}</span>
                                <span className="col-span-1 text-center">{lang === 'en' ? 'Disc' : 'خصم'}</span>
                                <span className="col-span-2 text-center">{lang === 'en' ? 'Qty' : 'كمية'}</span>
                                <span className="col-span-2 text-center">{lang === 'en' ? 'Price' : 'سعر لقطعة'}</span>
                                <span className="col-span-5 text-right">{lang === 'en' ? 'Item Name' : 'اسم الصنف المنصرف'}</span>
                              </div>

                              <div className="divide-y divide-gray-50">
                                {order.items.map((item, index) => {
                                  return (
                                    <div key={index} className="grid grid-cols-12 gap-1 py-1.5 text-[11px] items-center text-gray-850 font-sans">
                                      <span className="col-span-2 text-left font-mono font-black text-gray-950">{item.total.toFixed(2)}</span>
                                      <span className="col-span-1 text-center font-mono text-red-500">-{item.discount}</span>
                                      <span className="col-span-2 text-center font-mono font-bold text-gray-900">x{item.quantity}</span>
                                      <span className="col-span-2 text-center font-mono">{item.sellingPrice.toFixed(2)}</span>
                                      <div className="col-span-5 flex flex-col items-end">
                                        <b className="font-extrabold text-gray-900 line-clamp-1">{item.name}</b>
                                        <span className="text-[9px] text-gray-400 font-mono">{item.barcode}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Ticket Price Breakdown and Profit Audit */}
                            <div className="bg-slate-50 p-3 rounded-lg border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px]">
                              <div className="space-y-1 font-mono text-left font-semibold text-gray-600 order-last sm:order-first">
                                <div>{lang === 'en' ? 'Subtotal: ' : 'المجموع الفرعي لأسعار المنتجات: '}<b>{order.subtotal.toFixed(2)} EGP</b></div>
                                <div>{lang === 'en' ? 'Overall Discount: ' : 'الخصم المطبق لزبون: '}<span className="text-red-500">-{order.discount.toFixed(2)} EGP</span></div>
                                <div>{lang === 'en' ? 'Net profit from bill: ' : 'صافي ربح الدرج الفعلي من الفاتورة: '}<span className="text-emerald-700 font-black">+{((order.total) - order.items.reduce((acc, x) => acc + (x.costPrice * x.quantity), 0)).toFixed(2)} EGP</span></div>
                              </div>

                              <div className="space-y-1 leading-normal text-gray-500 text-right">
                                <div>{lang === 'en' ? 'Check out Counter: ' : 'مسؤول المبيعات على الكاونتر: '}<b className="text-gray-800">{order.cashierName} (ID: {order.cashierId})</b></div>
                                <div>{lang === 'en' ? 'Shift Association: ' : 'رقم وردية الصندوق المرتبطة: '}<b className="text-gray-800 font-mono">{order.shiftId}</b></div>
                                <div>{lang === 'en' ? 'Exact Sale time: ' : 'توقيت المبيعة الدقيق بالثانية: '}<b className="text-gray-800 font-mono">{orderTimeStr} ({orderDateStr})</b></div>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        // Standard view: SHOP REGISTERING & ROSTER INLINE RENAME
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: MULTI-SHOP ANALYTICS TABLE */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* STATS SUMMARY BOX FOR SELECTED SHOP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Active Shop Income */}
              <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl flex flex-col justify-between font-sans shadow-xs hover:border-black/10 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                      {lang === 'en' ? 'Branch In-Store Income' : 'مبيعات الفرع المحدد'}
                    </span>
                    <div className="p-1 px-1.5 bg-[#F3F4F6] text-gray-700 rounded-md text-[9px] font-bold">
                      {getShopTypeLabel(activeShop?.type || 'supermarket')}
                    </div>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-950 font-mono tracking-tight">
                    {analytics.shopAnalysis.find(x => x.id === activeShopId)?.revenue.toFixed(2) || '0.00'}{' '}
                    <span className="text-sm font-sans font-medium text-gray-500">{currencySymbol}</span>
                  </h4>
                </div>
                <p className="text-[10px] text-gray-400 mt-4 font-sans border-t border-gray-50 pt-2 flex items-center gap-1.5 justify-end">
                  {lang === 'en' ? 'Scoped only for active store filter' : 'إحصائيات مبيعات هذا الفرع المحدد'}
                  <Info size={11} className="text-gray-400" />
                </p>
              </div>

              {/* Grand Total Revenue */}
              <div className="bg-[#FAFAFA] border border-[#E5E7EB] p-5 rounded-2xl flex flex-col justify-between font-sans shadow-xs hover:border-black/10 transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                      {lang === 'en' ? 'Grand Revenue (All Shops)' : 'الإيرادات الإجمالية لفروعك'}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>
                  <h4 className="text-2xl font-extrabold text-black font-mono tracking-tight">
                    {analytics.grandRevenue.toFixed(2)}{' '}
                    <span className="text-xs font-sans font-medium text-gray-500">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </h4>
                </div>
                <p className="text-[10px] text-gray-500 mt-4 font-sans border-t border-gray-100 pt-2 flex items-center gap-1.5 justify-end">
                  {lang === 'en' ? 'Consolidated income across all stores' : 'مجموع إيرادات جميع الأنشطة التجارية مجتمعة'}
                  <TrendingUp size={11} className="text-emerald-500" />
                </p>
              </div>

              {/* Net Profits */}
              <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl flex flex-col justify-between font-sans shadow-xs hover:border-[#A7F3D0] transition-all duration-300">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">
                      {lang === 'en' ? 'Overall Net Profit' : 'الأرباح الكلية الصافية'}
                    </span>
                    <div className="p-1.5 bg-[#ECFDF5] text-[#059669] rounded-lg">
                      <Coins size={12} />
                    </div>
                  </div>
                  <h4 className="text-2xl font-extrabold text-[#059669] font-mono tracking-tight">
                    {analytics.grandProfit.toFixed(2)}{' '}
                    <span className="text-xs font-sans font-medium text-[#059669]">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </h4>
                </div>
                <p className="text-[10px] text-[#059669] mt-4 font-sans border-t border-gray-100 pt-2 flex items-center gap-1.5 justify-end font-bold">
                  {lang === 'en' ? 'Subtracting raw products cost prices' : 'المتبقي بعد خصم تكلفة شراء جميع البضائع'}
                  <Check size={11} className="text-[#059669]" />
                </p>
              </div>
            </div>

            {/* REVENUE CONTRIBUTION GRAPH */}
            {analytics.grandRevenue > 0 && (
              <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl font-sans space-y-4 shadow-sm text-right">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="text-right w-full">
                    <h3 className="text-xs font-extrabold text-gray-905 uppercase tracking-wider flex items-center gap-2 justify-end">
                      {lang === 'en' ? 'Revenue Contribution Share' : 'النسبة المئوية لحصة مساهمة المحلات بالفروع'}
                      <Percent size={14} className="text-[#059669]" />
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {lang === 'en' ? 'Breakdown of total retail sales by individual location' : 'الحصة النسبية لإيرادات كل موقع من المبيعات العامة وكفاءتها المباشرة'}
                    </p>
                  </div>
                </div>
                
                {/* Combined visual bar graph */}
                <div className="w-full h-4 bg-[#F3F4F6] rounded-full overflow-hidden flex shadow-inner">
                  {analytics.shopAnalysis.map((shop, idx) => {
                    const percentage = (shop.revenue / (analytics.grandRevenue || 1)) * 100;
                    if (percentage <= 0) return null;
                    
                    const bgColors = [
                      'bg-gray-950',
                      'bg-[#059669]',
                      'bg-[#3B82F6]',
                      'bg-[#D97706]',
                      'bg-[#8B5CF6]',
                    ];
                    const bgColor = bgColors[idx % bgColors.length];
                    
                    return (
                      <div 
                        key={shop.id}
                        style={{ width: `${percentage}%` }}
                        className={`${bgColor} h-full transition-all duration-500`}
                        title={`${shop.name}: ${percentage.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {analytics.shopAnalysis.map((shop, idx) => {
                    const realPercentage = (shop.revenue / (analytics.grandRevenue || 1)) * 100;
                    const bgColors = [
                      'bg-gray-950',
                      'bg-[#059669]',
                      'bg-[#3B82F6]',
                      'bg-[#D97706]',
                      'bg-[#8B5CF6]',
                    ];
                    const borderAndTextColors = [
                      'border-gray-200 bg-gray-50/50 text-gray-900',
                      'border-emerald-100 bg-[#ECFDF5]/30 text-[#059669]',
                      'border-blue-100 bg-[#EFF6FF]/30 text-[#3B82F6]',
                      'border-amber-100 bg-[#FFFBEB]/30 text-[#D97706]',
                      'border-violet-100 bg-[#F5F3FF]/30 text-[#8B5CF6]',
                    ];
                    const dotBg = bgColors[idx % bgColors.length];
                    const cardStyle = borderAndTextColors[idx % borderAndTextColors.length];
                    
                    return (
                      <div key={shop.id} className={`flex flex-col p-3 rounded-xl border ${cardStyle} transition-all text-right`}>
                        <div className="flex items-center gap-1.5 justify-end min-w-0">
                          <span className="text-[11px] font-bold truncate text-gray-800">{shop.name}</span>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dotBg}`} />
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between font-mono">
                          <span className="text-[9.5px] text-gray-500 font-semibold font-sans">
                            {shop.revenue.toFixed(1)} {(shop.currency === 'USD' ? '$' : (lang === 'ar' ? 'ج.م' : 'EGP'))}
                          </span>
                          <span className="text-sm font-bold">{realPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACTIVE SHOPS LIST & COMPARISON WITH RENAMING SUPPORT */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between font-sans">
                <span className="bg-gray-100 text-gray-800 border border-gray-200 text-[10px] py-1 px-2.5 rounded-full font-mono font-bold">
                  {shops.length} {lang === 'en' ? 'shops' : 'أنشطة مسجلة'}
                </span>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  {lang === 'en' ? 'My Shops & Branches Register' : 'سجل فروع مشروعك التجاري وتعديل الأسماء'}
                  <Store size={16} className="text-gray-700" />
                </h3>
              </div>

              <div className="divide-y divide-gray-150 font-sans">
                {analytics.shopAnalysis.map(shop => {
                  const isActive = shop.id === activeShopId;
                  const shopCurrencySymbol = shop.currency === 'USD' ? '$' : (lang === 'ar' ? 'ج.م' : 'EGP');
                  
                  return (
                    <div 
                      key={shop.id} 
                      className={`p-5 hover:bg-gray-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isActive ? 'bg-[#ECFDF5]/15 border-r-4 border-r-[#059669]' : ''}`}
                    >
                      <div className="space-y-1.5 text-right w-full md:w-auto">
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          
                          {editingShopId === shop.id ? (
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-gray-200" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingShopName}
                                onChange={(e) => setEditingShopName(e.target.value)}
                                className="text-xs px-2 py-1 border border-gray-300 rounded font-semibold focus:ring-1 focus:ring-black outline-none w-44"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingShopName.trim()) {
                                    onUpdateShopName(shop.id, editingShopName.trim());
                                    setEditingShopId(null);
                                  }
                                }}
                                className="px-2 py-1 bg-black text-[#A7F3D0] rounded text-[10px] font-bold"
                              >
                                {lang === 'en' ? 'Save' : 'حفظ'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingShopId(null)}
                                className="px-2 py-1 bg-gray-200 text-gray-650 rounded text-[10px] font-bold"
                              >
                                {lang === 'en' ? 'Cancel' : 'إلغاء'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingShopId(shop.id);
                                  setEditingShopName(shop.name);
                                }}
                                className="p-1 px-2 text-[9.5px] font-bold text-indigo-650 hover:text-indigo-800 bg-indigo-50 border border-indigo-150 rounded hover:bg-indigo-100/50 transition flex items-center gap-1 shrink-0"
                              >
                                <Edit size={10} />
                                <span>{lang === 'en' ? 'Rename' : 'تعديل الاسم'}</span>
                              </button>
                              <span className="font-extrabold text-sm text-gray-905">{shop.name}</span>
                            </div>
                          )}

                          <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[9px] font-semibold font-sans">
                            {getShopTypeLabel(shop.type)}
                          </span>
                          {isActive && (
                            <span className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                              <Check size={8} /> {lang === 'en' ? 'ACTIVE' : 'الفرع النشط حالياً'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 font-sans justify-end">
                          <span>{lang === 'en' ? 'Currency: ' : 'العملة الأساسية: '}<b className="text-gray-650 font-mono font-bold">{shop.currency}</b></span>
                          <span className="text-gray-300">•</span>
                          <span>{lang === 'en' ? 'Shifts Closed: ' : 'الورديات المغلقة: '}<b className="text-gray-700 font-mono">{shop.shiftsCount}</b></span>
                          <span className="text-gray-300">•</span>
                          <span>{lang === 'en' ? 'Invoices: ' : 'الفواتير الصادرة: '}<b className="text-gray-700 font-mono">{shop.ordersCount}</b></span>
                          <span className="text-gray-350">•</span>
                          <span>{lang === 'en' ? 'Products: ' : 'الأصناف المتوفرة: '}<b className="text-gray-700 font-mono">{shop.productsCount}</b></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 justify-between md:justify-end">
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400 font-sans">{lang === 'en' ? 'Sales Revenue' : 'المبيعات الكلية'}</div>
                          <div className="text-sm font-bold font-mono text-gray-950">
                            {shop.revenue.toFixed(2)} {shopCurrencySymbol}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 select-none">
                          {!isActive ? (
                            <button
                              type="button"
                              onClick={() => onSelectShop(shop.id)}
                              className="bg-black hover:bg-gray-800 text-white text-[10px] font-semibold py-1.5 px-3 rounded-lg transition"
                            >
                              {lang === 'en' ? 'Activate / Switch' : 'تفعيل وانتقال'}
                            </button>
                          ) : (
                            <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-emerald-200">
                              {lang === 'en' ? 'Currently Selected' : 'نشط ومعروض'}
                            </div>
                          )}

                          {shop.id !== 'shop_default' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(lang === 'en' ? 'Are you sure you want to delete this shop and exclude its data?' : 'هل أنت متأكد من رغبتك في حذف هذا المحل بالكامل وبياناته؟')) {
                                  onDeleteShop(shop.id);
                                }
                              }}
                              className="p-2 text-gray-405 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SHOP OWNER MOBILE CONNECT MODULE - EXTREMELY POLISHED */}
            <div className="bg-gradient-to-br from-gray-950 to-gray-900 text-white p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-center gap-6 font-sans shadow-lg text-right">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 justify-end">
                  <h3 className="font-extrabold text-[#A7F3D0] text-xs uppercase tracking-widest leading-none">
                    {lang === 'en' ? 'Real-Time Remote Control & Sync' : 'متابعة المبيعات فورياً من تليفونك'}
                  </h3>
                  <div className="p-1.5 bg-[#A7F3D0] rounded-lg text-black">
                    <Smartphone className="w-5 h-5 text-gray-955" />
                  </div>
                </div>
                <h4 className="text-lg font-bold text-white tracking-tight">
                  {lang === 'en' ? 'What does this QR Code do?' : 'ما فائدة رمز الاستجابة السريعة (QR Code) هنا؟'}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  {lang === 'en' 
                    ? 'This POS uses cloud-native synchronization. Scanning this QR code lets you open this exact, secure Dashboard on your smartphone or tablet! You can watch live cashier transactions, check drawer balance, audit closing shifts, and update inventory prices remotely from anywhere, without being physically inside the shop.' 
                    : 'يتيح لك مسح الرمز بكاميرا هاتفك فتح نفس لوحة التحكم والورديات مباشرة على تليفونك الشخصي لتمكين الإدارة اللاسلكية أثناء تنقلك وسفرك! نظرًا لأن النظام يدعم المزامنة اللحظية الفورية والعمل بدون إنترنت، فإن أي فاتورة بيع يصدرها كاشير المحل الآن ستظهر فوراً في حساب تليفونك لمتابعة درج النقدية وجرد الأرباح أثناء تنقلك وسفره.'}
                </p>
                
                <div className="bg-gray-900 border border-gray-800 p-3.5 rounded-xl space-y-2">
                  <p className="text-[10px] text-gray-400 font-mono overflow-ellipsis overflow-hidden select-all whitespace-nowrap bg-neutral-950 p-2 rounded border border-gray-800/80 font-semibold text-center">
                    <span className="text-[#A7F3D0] font-bold">{lang === 'en' ? 'Owner Link: ' : 'رابط مالك المشروع المباشر: '}</span> 
                    {currentAppUrl}
                  </p>
                  <div className="text-[10.5px] text-[#A7F3D0] flex items-start gap-1.5 justify-end">
                    <span>
                      {lang === 'en' 
                        ? 'Secure PWA enabled. Any update you do on your telephone automatically synchronizes live across computer targets!' 
                        : 'ميزة الـ PWA مفعلة. أي تحديث أو جرد تقوم به من هاتفك سينعكس تلقائياً في شاشة الكاشير بالمتجر!'}
                    </span>
                    <Info size={12} className="shrink-0 mt-0.5 text-[#10B981]" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border-4 border-gray-850 flex flex-col items-center justify-center text-black shrink-0 relative shadow-2xl">
                <img src={qrCodeUrl} alt="App QR Connect" className="w-[150px] h-[150px]" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="gray"/><text x="10" y="75" fill="black">QR Code Active</text></svg>';
                }} />
                <div className="mt-2.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-500 font-mono text-center">
                  {lang === 'en' ? 'Scan to view on phone!' : 'امسح الرمز للتجربة!'}
                </div>
                <div className="absolute -top-2.5 px-3 py-0.5 bg-black rounded-full text-[8.5px] font-extrabold text-[#A7F3D0] border border-gray-800 shadow-sm">
                  {lang === 'en' ? 'SMART REMOTE' : 'الربط السريع'}
                </div>
              </div>
            </div>

            {/* DATABASE RESET MODULE */}
            {onResetDatabase && (
              <div id="database-reset-card" className="bg-red-50 border border-red-200 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 font-sans text-right">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <h3 className="font-extrabold text-red-700 text-xs uppercase tracking-widest leading-none">
                      {lang === 'en' ? 'Database Administration & Reset' : 'إدارة وحذف قاعدة البيانات المباشرة'}
                    </h3>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 tracking-tight">
                    {lang === 'en' ? 'Clear Local Database & Start Fresh' : 'مسح شامل لقاعدة البيانات وجرد المصنع'}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-sans">
                    {lang === 'en' 
                      ? 'This will clear all transactions, invoices, products, custom branches, and shifts from the browser local storage database. Wiped data is permanent.' 
                      : 'سيقوم هذا الإجراء بمسح وحذف كافة العمليات والبيانات الفورية بما في ذلك الفواتير، الأصناف، الفروع التشغيلية، والورديات من قاعدة البيانات المحلية للجهاز بشكل نهائي ثم إعادة تعيين المحل الافتراضي ليكون (الفتح لقطع غيار الأجهزة المنزلية).'}
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    id="btn-wipe-database"
                    type="button"
                    onClick={() => {
                      if (confirm(lang === 'en' ? 'CRITICAL: Are you absolutely sure you want to permanently clear the database?' : 'تنبيه حرج جداً: هل أنت متأكد تماماً من رغبتك في حذف وقص كافة بيانات الصندوق والأصناف والبدء من الصفر؟')) {
                        onResetDatabase();
                        alert(lang === 'en' ? 'Database Cleared and Reset to Al-Fath successfully!' : 'تم مسح وقص قاعدة البيانات وإعادة تعيين النظام لـ (الفتح لقطع غيار الأجزاء المنزلية) بنجاح!');
                      }
                    }}
                    className="bg-red-650 hover:bg-red-700 text-white text-xs font-extrabold py-3 px-5 rounded-xl border border-red-700 shadow-xs cursor-pointer transition active:scale-95"
                  >
                    {lang === 'en' ? 'Wipe & Clear Database' : 'حذف وإعادة ضبط المصنع'}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: REGISTER AND CONFIGURE NEW SHOPS & CURRENCY */}
          <div className="lg:col-span-4 space-y-6 text-right">
            <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl space-y-4 font-sans shadow-sm">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-955 text-sm flex items-center gap-1.5 justify-end">
                  {lang === 'en' ? 'Establish a New Store Branch' : 'افتتاح وتسجيل فرع محل جديد'}
                  <Plus size={16} className="text-[#059669]" />
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                  {lang === 'en' ? 'Add sub-stores with dynamic default currencies' : 'أضف نشاطك ومحلاتك الأخرى مع ربط العملات الخاصة بها'}
                </p>
              </div>

              <form onSubmit={handleCreateShop} className="space-y-4 text-xs font-sans font-medium text-gray-700">
                <div className="space-y-1.5 text-right font-sans">
                  <label className="text-xs font-bold text-gray-750 block">
                    {lang === 'en' ? 'Shop / Branch Name *' : 'اسم المحل / النشاط الجديد *'}
                  </label>
                  <input
                    type="text"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Al-Nour Pharmacy' : 'مثال: صيدلية النور بالتجمع'}
                    className="w-full bg-gray-50/50 border border-[#E5E7EB] focus:border-black focus:bg-white rounded-lg p-2.5 transition text-xs font-medium outline-none text-right"
                  />
                </div>

                <div className="space-y-1.5 text-right font-sans">
                  <label className="text-xs font-bold text-gray-755 block">
                    {lang === 'en' ? 'Shop Business Type *' : 'نوع وطبيعة النشاط التجاري *'}
                  </label>
                  <select
                    value={newShopType}
                    onChange={(e) => setNewShopType(e.target.value as Shop['type'])}
                    className="w-full bg-gray-50/50 border border-[#E5E7EB] focus:border-black focus:bg-white rounded-lg p-2.5 transition text-xs font-medium cursor-pointer outline-none text-right"
                  >
                    <option value="supermarket">{lang === 'en' ? 'Supermarket / Grocery' : 'سوبر ماركت / بقالة وتموينات'}</option>
                    <option value="clothing">{lang === 'en' ? 'Clothing & Apparel' : 'محل ملابس وأحذية وأقمشة'}</option>
                    <option value="pharmacy">{lang === 'en' ? 'Pharmacy & Drug Store' : 'صيدلية ومستحضرات تجميل'}</option>
                    <option value="spare_parts">{lang === 'en' ? 'Spare Parts & Car Tools' : 'محل قطع غيار واكسسوارات'}</option>
                    <option value="other">{lang === 'en' ? 'Other Retail Business' : 'نشاط تجاري / معرض آخر'}</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-right font-sans">
                  <label className="text-xs font-bold text-gray-750 block">
                    {lang === 'en' ? 'Default Currency *' : 'العملة الأساسية للمعاملات في هذا المحل *'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewShopCurrency('EGP')}
                      className={`py-2 px-3 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${newShopCurrency === 'EGP' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-[#E5E7EB] hover:bg-gray-100'}`}
                    >
                      <Coins size={12} />
                      <span>{lang === 'en' ? 'EGP (ج.م)' : 'الجنيه المصري (ج.م)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewShopCurrency('USD')}
                      className={`py-2 px-3 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${newShopCurrency === 'USD' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-[#E5E7EB] hover:bg-gray-100'}`}
                    >
                      <DollarSign size={12} />
                      <span>{lang === 'en' ? 'USD ($)' : 'الدولار الأمريكي ($)'}</span>
                    </button>
                  </div>
                </div>

                {errorMe && (
                  <div className="p-2.5 bg-red-50 text-red-650 rounded-lg text-[11px] font-sans border border-red-100">
                    {errorMe}
                  </div>
                )}

                {successMe && (
                  <div className="p-2.5 bg-[#ECFDF5] text-[#059669] rounded-lg text-[11px] font-sans border border-[#A7F3D0]">
                    {successMe}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-extrabold rounded-lg text-xs transition uppercase tracking-wider shadow-sm"
                >
                  {lang === 'en' ? 'Initialize Store Branch' : 'افتتاح وتشغيل فرع المحل'}
                </button>
              </form>
            </div>

            {/* ACTIVE SHOP SPECIFIC CONFIGURATION DETAILS */}
            <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl space-y-4 font-sans shadow-sm text-right">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 justify-end">
                  {lang === 'en' ? 'Branch Custom Metadata' : 'الخصائص التشغيلية للفرع النشط'}
                  <Info size={16} className="text-gray-700 shrink-0 font-sans" />
                </h3>
              </div>

              <div className="space-y-2.5 text-xs text-gray-650 font-sans leading-relaxed">
                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="font-mono text-[9px] text-gray-800 font-semibold select-all">db_{activeShopId.slice(-6)}</span>
                  <span className="text-gray-400 font-bold">{lang === 'en' ? 'Database Index:' : 'معرف الفرع المعزول:'}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-gray-800 font-extrabold uppercase">{getShopTypeLabel(activeShop?.type || 'supermarket')}</span>
                  <span className="text-gray-400 font-bold">{lang === 'en' ? 'Market Domain:' : 'هيئة النشاط والبيع:'}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-gray-900 font-extrabold uppercase">{activeShop?.currency || 'EGP'} ({currencySymbol})</span>
                  <span className="text-gray-400 font-bold">{lang === 'en' ? 'Currency Standard:' : 'معيار العملة الأساسية:'}</span>
                </div>
                
                <p className="text-[10.5px] text-gray-400 font-sans text-center border-t border-gray-50 pt-2.5 leading-normal">
                  {lang === 'en' ? 'Any added products, customers, and receipts are uniquely encapsulated under this branch.' : 'أي صنف مخزون أو فواتير كاشير يتم جردها وعزلها بالكامل تحت اسم هذا الفرع لتسهيل التقارير.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
