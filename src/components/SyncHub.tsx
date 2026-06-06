/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  FileText, 
  ShieldCheck, 
  Code, 
  Check, 
  Server, 
  Layers, 
  Cpu, 
  Share2, 
  Terminal,
  Activity,
  Download,
  Upload,
  FileJson,
  ShieldAlert
} from 'lucide-react';
import { SyncItem } from '../types';

interface SyncHubProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  syncQueue: SyncItem[];
  onTriggerSync: () => void;
  lang?: 'en' | 'ar';
  onRestoreDatabase: (restoredData: any) => void;
}

export default function SyncHub({ isOnline, onToggleOnline, syncQueue, onTriggerSync, lang = 'en', onRestoreDatabase }: SyncHubProps) {
  const [activeTab, setActiveTab] = useState<'monitor' | 'schema' | 'rules' | 'backup'>('monitor');
  const [isSyncing, setIsSyncing] = useState(false);

  // Backup & Restore states
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  // Stats for backup display
  const backupStats = React.useMemo(() => {
    return {
      shopsCount: JSON.parse(localStorage.getItem('pos_shops') || '[]').length,
      productsCount: JSON.parse(localStorage.getItem('pos_products') || '[]').length,
      ordersCount: JSON.parse(localStorage.getItem('pos_orders') || '[]').length,
      repairsCount: JSON.parse(localStorage.getItem('pos_repairs') || '[]').length,
      shiftsCount: JSON.parse(localStorage.getItem('pos_historical_shifts') || '[]').length,
    };
  }, [activeTab]);

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        backupDateLabel: new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US'),
        shops: JSON.parse(localStorage.getItem('pos_shops') || '[]'),
        activeShopId: localStorage.getItem('pos_active_shop_id') || '',
        products: JSON.parse(localStorage.getItem('pos_products') || '[]'),
        orders: JSON.parse(localStorage.getItem('pos_orders') || '[]'),
        activeShift: JSON.parse(localStorage.getItem('pos_active_shift') || 'null'),
        historicalShifts: JSON.parse(localStorage.getItem('pos_historical_shifts') || '[]'),
        repairs: JSON.parse(localStorage.getItem('pos_repairs') || '[]')
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      
      const formattedDate = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `Al_Fath_App_Backup_${formattedDate}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Error exporting backup', e);
      alert(lang === 'ar' ? 'حدث خطأ أثناء تصدير النسخة الاحتياطية' : 'Error exporting backup file');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error(lang === 'ar' ? 'بنية الملف غير صالحة' : 'Invalid file object structure');
        }

        // Validate basic keys inside Al Fath backup
        const hasShops = Array.isArray(parsed.shops);
        const hasProducts = Array.isArray(parsed.products);
        
        if (!hasShops && !hasProducts) {
          throw new Error(lang === 'ar' ? 'هذا الملف لا يبدو كنسخة احتياطية صالحة لبرنامج الفتح' : 'This JSON is not recognized as Al-Fath backup');
        }

        // Trigger parent callback to restore
        onRestoreDatabase(parsed);
        setImportSuccess(true);
        
        setTimeout(() => {
          setImportSuccess(false);
        }, 4000);
      } catch (err: any) {
        console.error('Import error:', err);
        setImportError(err.message || (lang === 'ar' ? 'فشل قراءة وتحليل ملف النسخ الاحتياطي' : 'Failed to parse backup JSON file'));
      }
    };

    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // Quick manual sync execution trigger
  const handleSyncClick = () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setTimeout(() => {
      onTriggerSync();
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 id="synchub-heading" className="text-2xl font-semibold tracking-tight text-gray-901">
            {lang === 'en' ? 'Firestore Synchronization & Schema Hub' : 'مركز مزامنة ومخطط قاعدة بيانات فايرستور'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'en' 
              ? 'Regulate offline key-value storage queues and match cloud collection schemas' 
              : 'تنظيم طوابير التخزين المؤقت المحلي ومطابقة مخطط السحابة'}
          </p>
        </div>
        <div className="flex bg-gray-100 border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'monitor' ? 'bg-white text-gray-950 font-extrabold shadow-none' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {lang === 'en' ? 'Terminal Monitor' : 'شاشة المراقبة'}
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'schema' ? 'bg-white text-gray-950 font-extrabold shadow-none' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {lang === 'en' ? 'Firestore Blueprint' : 'مخطط قاعدة البيانات'}
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'rules' ? 'bg-white text-gray-950 font-extrabold shadow-none' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {lang === 'en' ? 'Zero-Trust Rules' : 'جدار الحماية والأمان'}
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'backup' ? 'bg-white text-gray-950 font-extrabold shadow-none' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {lang === 'en' ? 'Backup & Restore' : 'النسخ الاحتياطي والاسترجاع'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'monitor' && (
          <motion.div
            key="tab-monitor"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* NETWORK STATUS CARD */}
            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-150 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl border ${isOnline ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2] animate-pulse'}`}>
                      {isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-950">
                        {lang === 'en' ? 'PWA Network Status:' : 'حالة اتصال التطبيق والشبكة (PWA):'}{' '}
                        <span className={isOnline ? 'text-[#059669] font-extrabold' : 'text-[#DC2626] font-extrabold'}>
                          {isOnline 
                            ? (lang === 'en' ? 'ONLINE' : 'متصل بالإنترنت مباشر') 
                            : (lang === 'en' ? 'OFFLINE-FIRST MODE' : 'وضع عدم الاتصال بالإنترنت')}
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5 font-sans">
                        {isOnline 
                          ? (lang === 'en' ? 'Syncing transactions to cloud Firestore db instantly.' : 'مزامنة الفواتير والعمليات مع قاعدة بيانات Firestore السحابية فورياً.') 
                          : (lang === 'en' ? 'Registering mutations locally in browser state queues.' : 'العمليات تسجل وتخزن محلياً في الذاكرة المؤقتة للمتصفح الآن.')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onToggleOnline}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 font-sans ${
                      isOnline 
                        ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]' 
                        : 'bg-black text-white hover:opacity-90'
                    }`}
                  >
                    {isOnline 
                      ? (lang === 'en' ? 'Disconnect Online' : 'قطع الاتصال السحابي') 
                      : (lang === 'en' ? 'Reconnect Online' : 'إعادة الاتصال بالشبكة')}
                  </button>
                </div>

                {/* DB SYNC QUEUE DETAILS */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5 font-sans">
                      <Database size={15} className="text-black" />
                      {lang === 'en' ? 'Pending Mutations Queue for Background Sync' : 'قائمة العمليات المحلية بانتظار المزامنة الخلفية'}
                    </span>
                    {isOnline && syncQueue.length > 0 && (
                      <button
                        onClick={handleSyncClick}
                        disabled={isSyncing}
                        className="px-3 py-1 bg-white border border-[#E5E7EB] hover:border-black hover:text-black text-gray-600 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition shadow-none"
                      >
                        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                        {lang === 'en' ? 'Trigger Re-Sync Now' : 'مزامنة الطابور الآن'}
                      </button>
                    )}
                  </div>

                  {syncQueue.length === 0 ? (
                    <div className="border border-dashed border-gray-200 bg-gray-50/50 rounded-lg p-10 flex flex-col justify-center items-center text-xs text-gray-400 font-sans">
                      <Check className="w-8 h-8 text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-full p-1.5 mb-2 h-fit animate-none" />
                      <span className="font-semibold text-gray-700">{lang === 'en' ? 'Local Cache Matches Firestore Cloud Store' : 'جميع البيانات المحلية متطابقة ومؤمنة بالدرج السحابي'}</span>
                      <p className="text-[10px] text-gray-400 mt-1">{lang === 'en' ? 'Zero pending mutations in sync database' : 'لا يوجد أي عمليات تغيير تالفة أو معلقة بالصندوق'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-250 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      {syncQueue.map(item => (
                        <div key={item.id} className="p-3 bg-white hover:bg-gray-50/50 transition text-xs flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 font-bold uppercase text-[9px] rounded font-mono border ${
                              item.action === 'create' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' :
                              item.action === 'update' ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]' : 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]'
                            }`}>
                              {item.action}
                            </span>
                            <div>
                              <span className="font-semibold text-gray-800 font-mono">
                                /{item.collection}/{item.documentId}
                              </span>
                              <p className="text-[10px] text-gray-400 mt-0.5">Payload keys: {Object.keys(item.payload).join(', ')}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* OFFLINE CAPABILITY DETAILS */}
              <div className="bg-black text-slate-100 p-5 rounded-xl space-y-3 font-sans">
                <div className="flex gap-2 items-center">
                  <Cpu size={18} className="text-[#D97706]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-gray-400">{lang === 'en' ? 'Offline architecture' : 'بروتوكول المعالجة دون اتصال (Offline-First)'}</span>
                </div>
                <h4 className="text-sm font-bold text-white leading-tight font-sans">{lang === 'en' ? 'State Isolation & LocalStorage Pipeline' : 'عزل الحالات ومزامنة البيانات في طابور محلي مغلق'}</h4>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  {lang === 'en' 
                    ? 'Mutating products or executing checkouts while offline schedules requests as transactional operations inside indexed sync logs. Uniquely identified mutation payloads are locked, preventing split inventory states. Once reconnected, a background service securely flushes payloads inside single batch requests.' 
                    : 'عند إضافة صنف أو بيع فاتورة والشبكة مقطوعة، يسجل السيستم التغييرات محلياً في عهد مشفرة بالكامل. يتم ضمان سلامة تسلسل المخزون وتفادي التضارب أو البيع المزدوج، وحين يعود الإنترنت مجدداً يقوم خادم المزامنة برفع التعديلات دفعة واحدة وبأمان.'}
                </p>
              </div>
            </div>

            {/* SYNC TERMINAL PANEL */}
            <div className="lg:col-span-4 bg-white border border-[#E5E7EB] p-4 rounded-xl flex flex-col justify-stretch font-sans">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                <Terminal size={15} className="text-black" />
                <h3 className="font-bold text-gray-901 text-sm font-sans uppercase tracking-wider">{lang === 'en' ? 'Synchronizer Log' : 'مراقب حركة المزامنة اليومية'}</h3>
              </div>

              <div id="sync-console-logs" className="bg-black text-slate-300 font-mono text-[10px] p-3 rounded-lg flex-1 overflow-y-auto max-h-[420px] lg:max-h-full space-y-2.5">
                <div className="text-gray-500">{lang === 'en' ? '// Terminal logs listening...' : '// جاري استماع ومراقبة عمليات المزامنة...'}</div>
                <div>&gt; [SYSTEM] {lang === 'en' ? 'Bootstrapping Offline PWA core' : 'تهيئة نواة التطبيق للعمل دون اتصال بالإنترنت'}</div>
                <div>&gt; [CACHE] {lang === 'en' ? 'LocalStorage inventory files matched' : 'تم العثور على ملفات المتصفح ومطابقة التخزين المؤقت محلياً'}</div>
                <div>&gt; [SYNC] {lang === 'en' ? 'Handshake established with Firestore node' : 'تم تأمين المصافحة والاتصال بنقطة فايرستور السحابية'}</div>
                {syncQueue.map((item, i) => (
                  <div key={item.id} className="text-[#D97706] font-mono">
                    &gt; [QUEUE] {lang === 'en' ? `Cached mutations #${i+1}: Mutation ${item.action.toUpperCase()} queued for /${item.collection}` : `[طابور المزامنة] عملية تعديلية #${i+1}: حركة ${item.action.toUpperCase()} معلّقة لجدول /${item.collection}`}
                  </div>
                ))}
                {isOnline && syncQueue.length > 0 && (
                  <div className="text-emerald-400 font-bold animate-pulse">
                    &gt; [SYNC] {lang === 'en' ? 'Network online. Ready to flush sync queue!' : 'الشبكة متصلة الآن. جاري دفع وترحيل العمليات المعلقة في طابور المزامنة!'}
                  </div>
                )}
                {isOnline && syncQueue.length === 0 && (
                  <div className="text-sky-300 font-semibold text-[9.5px]">
                    &gt; [OK] {lang === 'en' ? 'Local database in perfect harmony with Firestore database.' : 'الحالة آمنة تماماً. قاعدة البيانات المحلية ومنصة Firestore متطابقان.'}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* FIRESTORE SCHEMAS TAB */}
        {activeTab === 'schema' && (
          <motion.div
            key="tab-schema"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-[#E5E7EB] p-5 rounded-xl space-y-6"
          >
            <div className="flex justify-between items-start flex-col sm:flex-row gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 font-sans">
                  {lang === 'en' ? 'Firestore NoSQL Scalable Document Schema' : 'مخططات مستندات Firestore NoSQL السحابية المرنة'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-sans">
                  {lang === 'en' ? 'Scale optimized collection architecture mapping millions of transactional rows' : 'البنية الهيكلية المحسّنة لإدارة وتخزين ملايين العمليات والمستندات الفورية بجداول ديناميكية'}
                </p>
              </div>
              <div className="flex gap-2 text-xs font-mono font-bold bg-black text-white p-1 px-3 rounded-md">
                <Server size={14} className="text-white shrink-0 mt-0.5" />
                <span>{lang === 'en' ? 'Enterprise Architecture' : 'بنية أنظمة المنشآت والشركات'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-relaxed text-xs">
              <div className="space-y-4">
                <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-2 font-sans">
                  <h4 className="font-bold text-black uppercase text-[10px] tracking-wider font-mono">
                    {lang === 'en' ? 'products List collection' : 'مجموعة المنتجات (products List)'}
                  </h4>
                  <p className="text-gray-600 font-sans leading-relaxed">
                    {lang === 'en' 
                      ? 'Stores master products items. Each item is identified uniquely by its universal barcode or custom uuid. Lightning-fast NoSQL gets can be mapped strictly to barcodes.' 
                      : 'تخزن البيانات الأساسية للمنتجات. يسجل الصنف برقم باركود فريد يسهل دمج أدوات المسح الضوئي للكاشير والبحث السريع بقاعدة بيانات NoSQL.'}
                  </p>
                  <pre className="bg-gray-50 border border-gray-100 p-2 text-[9.5px] rounded-md overflow-x-auto text-gray-500 font-mono">
{`products/{productId} => {
  id: string,
  barcode: string,
  name: string,
  costPrice: number,
  sellingPrice: number,
  quantity: number,
  safetyStock: number,
  expirationDate?: string
}`}
                  </pre>
                </div>

                <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-2 font-sans">
                  <h4 className="font-bold text-black uppercase text-[10px] tracking-wider font-mono">
                    {lang === 'en' ? 'shifts logs collection' : 'مجموعة ورديات الكاشير (shifts logs)'}
                  </h4>
                  <p className="text-gray-600 font-sans leading-relaxed">
                    {lang === 'en' 
                      ? 'Saves cashier daily sessions float logs for strict audits. Discrepancies are permanently sealed when status switches to `closed`.' 
                      : 'تحتفظ بسجلات تدقيق عهد ومطابقة صناديق الكاشير. يتم قفل وغلق سجل الوردية والعهد التاريخية فورياً مع رصد العجز أو الزيادة.'}
                  </p>
                  <pre className="bg-gray-50 border border-gray-100 p-2 text-[9.5px] rounded-md overflow-x-auto text-gray-500 font-mono">
{`shifts/{shiftId} => {
  id: string,
  cashierId: string,
  openedAt: string,
  openingCash: number,
  cashSales: number,
  expectedCash: number,
  actualCash?: number,
  status: 'open' | 'closed'
}`}
                  </pre>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-2 font-sans">
                  <h4 className="font-bold text-black uppercase text-[10px] tracking-wider font-mono">
                    {lang === 'en' ? 'sales_orders collection' : 'مجموعة فواتير المبيعات (sales_orders)'}
                  </h4>
                  <p className="text-gray-600 font-sans leading-relaxed">
                    {lang === 'en' 
                      ? 'Fully denormalized ticket rows. Saves the complete item snapshot on transaction checkout (brand names, current prices, cost price), creating a history ledger that is resilient to future product modifications.' 
                      : 'تحفظ صوراً تاريخية كاملة للمبيعات غير قابلة للتعديل والمسح لتسهيل الجرد السنوي. تسجل الأسعار والتكلفة عند الشراء لحماية التدقيق من تعديلات الأصناف اللاحقة.'}
                  </p>
                  <pre className="bg-gray-50 border border-gray-100 p-2 text-[9.5px] rounded-md overflow-x-auto text-gray-500 font-mono">
{`sales_orders/{orderId} => {
  id: string,
  cashierId: string,
  shiftId: string,
  items: Array<{productId, name, sellingPrice, qty}>,
  subtotal: number,
  tax: number,
  total: number,
  paymentMethod: 'cash' | 'card',
  createdAt: timestamp
}`}
                  </pre>
                </div>

                <div className="bg-gray-50 border border-[#E5E7EB] rounded-xl p-4 space-y-2.5 font-sans">
                  <h4 className="font-bold text-black uppercase text-[10px] tracking-wider flex items-center justify-start gap-1 font-sans">
                    <Layers size={12} className="text-black" />
                    {lang === 'en' ? 'NoSQL Relationship Mapping Rules' : 'قواعد وهندسة ربط وثائق الـ NoSQL'}
                  </h4>
                  <p className="text-gray-600 text-[11.5px] leading-relaxed font-sans">
                    {lang === 'en' ? (
                      <>
                        1. <b>Denormalized Compliance</b>: Product Cost & Sales prices are cloned into line items inside <i>sales_orders</i>. This handles history audits perfectly if product values shift tomorrow.
                        <br /><br />
                        2. <b>No Arrays in Parents</b>: Unbounded lists, like sales orders, are registered as discrete collections referencing parent parameters, never as fields inside users or shifts. This protects Firestore's 1MB document size envelope.
                      </>
                    ) : (
                      <>
                        ١. <b>استقرار الأسعار (Denormalization)</b>: يتم نسخ أسعار الشراء والبيع والخصومات الحالية داخل الفاتورة نفسها بدلاً من الإشارة لمرجع خارجي، لضمان دقة التقارير كأرشيف تاريخي مالي ثابت.
                        <br /><br />
                        ٢. <b>تفادي أحجام المستندات المتضخمة</b>: تدرج الفواتير والعمليات كمستندات مستقلة تحتوي معرف الوردية أو الكاشير، وتجنب وضعها كمصفوفة داخل الحساب، التزاماً بحد المستند الأقصى لـ Firestore (١ ميجابايت).
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SECURITY RULES TAB */}
        {activeTab === 'rules' && (
          <motion.div
            key="tab-rules"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-[#E5E7EB] p-5 rounded-xl space-y-5 font-sans"
          >
            <div>
              <h3 className="text-sm font-semibold text-gray-905 flex items-center gap-1.5 justify-start font-sans">
                <ShieldCheck size={18} className="text-black" />
                {lang === 'en' ? 'Zero-Trust Attribute-Based Security Rules' : 'قواعد الجدار الناري والحماية بمبدأ الثقة المعدومة (Zero-Trust)'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-sans">
                {lang === 'en' 
                  ? 'Robust firestore.rules setup protecting operations against identity theft, state shortcuts, and shadow payload modifications.' 
                  : 'مجموعة قواعد حماية وحوكمة ملفات firestore.rules لمنع الاختراقات وتعديل البيانات المالية الحساسة أو انتحال هويات موظفي الخزنة.'}
              </p>
            </div>

            <pre className="bg-black text-[#A7F3D0] font-mono text-[9.5px] p-4 rounded-xl border border-transparent leading-relaxed overflow-x-auto max-h-[380px]">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Default deny block
    match /{document=**} {
      allow read, write: if false;
    }

    // IsSignedIn check
    function isSignedIn() { return request.auth != null; }

    // Read details about current operator's role
    function getUserData() {
      return get(/databases/\$(database)/documents/users/\$(request.auth.uid)).data;
    }

    function isManager() {
      return isSignedIn() && (getUserData().role == 'manager' || getUserData().role == 'admin');
    }

    // products Collection rules
    match /products/{productId} {
      allow read: if isSignedIn();
      allow create: if isManager() && isValidProduct(request.resource.data);
      allow update: if isManager() && isValidProduct(request.resource.data);
    }

    // sales_orders - strictly immutable logs
    match /sales_orders/{orderId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.cashierId == request.auth.uid;
      allow update, delete: if false; // Block all updates on financial logs
    }
}`}
            </pre>
          </motion.div>
        )}

        {/* BACKUP & RESTORE TAB */}
        {activeTab === 'backup' && (
          <motion.div
            key="tab-backup"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-6"
          >
            {/* EXPORT / IMPORT CONTROLS */}
            <div className="xl:col-span-8 space-y-6 text-right" dir="rtl">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Database size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-950 font-sans">
                      {lang === 'en' ? 'Local Storage Manual Backups' : 'النسخ الاحتياطي اليدوي لقاعدة البيانات المحلية'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lang === 'en' 
                        ? 'Export structural snapshots of your point of sale memory instantly' 
                        : 'احفظ نسخة من المعطيات الحالية لجهازك محلياً في ملف واحد لضمان استمرارية العمل'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* EXPORT CARD */}
                  <div className="border border-slate-200 hover:border-black transition p-5 rounded-2xl bg-[#FAFAFA]/50 flex flex-col justify-between space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Download size={18} className="text-[#059669]" />
                        <h4 className="text-sm font-bold text-gray-950">
                          {lang === 'en' ? 'Export Data Backup (JSON)' : 'تصدير نسخة احتياطية جديدة (JSON)'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed font-sans">
                        {lang === 'en' 
                          ? 'Downloads your current inventory, cashier shift ledger, repair bookings, and sales invoices in a single lightweight data file.' 
                          : 'يقوم فورياً بتحميل ملف يحتوي على كامل بيانات الفروع، المنتجات، الفواتير، عمليات الصيانة، والورديات الحالية.'}
                      </p>
                    </div>

                    <button
                      onClick={handleExportBackup}
                      className="w-full py-3 bg-black text-white hover:bg-neutral-900 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={14} />
                      {lang === 'en' ? 'Download Backup File' : 'تحميل ملف النسخة الاحتياطية'}
                    </button>
                  </div>

                  {/* IMPORT CARD */}
                  <div className="border border-slate-200 hover:border-[#1D4ED8] transition p-5 rounded-2xl bg-[#FAFAFA]/50 flex flex-col justify-between space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Upload size={18} className="text-[#1D4ED8]" />
                        <h4 className="text-sm font-bold text-gray-950">
                          {lang === 'en' ? 'Restore Data Backup (JSON)' : 'استرجاع البيانات من نسخة احتياطية'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed font-sans">
                        {lang === 'en' 
                          ? 'Restore an existing backup JSON file. Caution: Uploading a valid file will safely overwrite your current device state.' 
                          : 'قم باسترجاع ملف النسخة الاحتياطية الخاص بك. ملاحظة: سيؤدي رفع الملف إلى استباق وتحديث قاعدة البيانات الحالية.'}
                      </p>
                    </div>

                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <button
                        type="button"
                        className="w-full py-3 bg-white border border-[#E5E7EB] hover:border-blue-500 text-gray-901 hover:text-[#1D4ED8] rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-2"
                      >
                        <Upload size={14} />
                        {lang === 'en' ? 'Upload Backup File' : 'رفع واسترجاع نسخة ملف الاحتياط'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* FEEDBACK STATUSES */}
                {importSuccess && (
                  <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center gap-3 text-xs text-[#059669] font-sans antialiased">
                    <Check className="shrink-0 w-5 h-5 p-1 bg-[#D1FAE5] rounded-full text-[#059669]" />
                    <span>
                      {lang === 'ar' 
                        ? 'تم استرجاع قاعدة البيانات، صيانة الأجهزة، المنتجات، والورديات بنجاح تام وتحديثها على الشاشة فوراً!' 
                        : 'Database state snapshot restored and hotloaded perfectly!'}
                    </span>
                  </div>
                )}

                {importError && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl flex items-center gap-3 text-xs text-[#DC2626] font-sans">
                    <ShieldAlert className="shrink-0 w-5 h-5 text-[#DC2626]" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* VISUAL STATS SCOPE */}
                <div className="border border-slate-100 bg-[#FAFAFA] rounded-2xl p-4 space-y-3">
                  <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase font-mono text-right">
                    {lang === 'en' ? 'Current Local Payload Metrics' : 'مؤشرات حمولة البيانات النشطة حالياً بالذاكرة لقاعدة البيانات'}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" dir="rtl">
                    <div className="bg-white p-3 rounded-xl border border-gray-150 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-medium text-gray-500">{lang === 'ar' ? 'الفروع' : 'Shops'}</span>
                      <strong className="text-lg text-black mt-1 font-mono font-black">{backupStats.shopsCount}</strong>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-150 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-medium text-gray-500">{lang === 'ar' ? 'المنتجات والقطع' : 'Products'}</span>
                      <strong className="text-lg text-black mt-1 font-mono font-black">{backupStats.productsCount}</strong>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-150 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-medium text-gray-500">{lang === 'ar' ? 'فواتير البيع' : 'Sales'}</span>
                      <strong className="text-lg text-black mt-1 font-mono font-black">{backupStats.ordersCount}</strong>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-150 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-medium text-gray-500">{lang === 'ar' ? 'أجهزة الصيانة' : 'Repairs'}</span>
                      <strong className="text-lg text-black mt-1 font-mono font-black">{backupStats.repairsCount}</strong>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-150 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-medium text-gray-500">{lang === 'ar' ? 'الورديات المغلقة' : 'Shifts'}</span>
                      <strong className="text-lg text-black mt-1 font-mono font-black">{backupStats.shiftsCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DOCUMENTATION PANEL */}
            <div className="xl:col-span-4 space-y-6 text-right" dir="rtl">
              <div className="bg-[#111111] text-slate-100 rounded-2xl p-6 space-y-6 shadow-lg border border-neutral-850 leading-relaxed font-sans text-xs">
                <div className="flex gap-2 items-center border-b border-neutral-800 pb-4 justify-start">
                  <FileJson size={20} className="text-amber-500" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                    {lang === 'en' ? 'How Al-Fath Backup System Works' : 'شرح ومبادئ عمل نظام النسخ الاحتياطي'}
                  </h4>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-white flex items-center gap-1.5 justify-start">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block shrink-0" />
                      <span>{lang === 'en' ? '1. Where is my data kept?' : '١. أين وكيف يتم حفظ حركات وبيانات التطبيق؟'}</span>
                    </h5>
                    <p className="text-slate-300 pr-3 leading-relaxed">
                      {lang === 'en' 
                        ? 'Your app runs offline-first. Data is safely stored inside your device’s LocalStorage sandbox. If online sync is active, it replicates to secure cloud Firestore servers.' 
                        : 'يتم حفظ جميع عملياتك محلياً بشكل فوري على ذاكرة جهازك الحالية (LocalStorage)، مما يتيح للكاشير العمل بسرعة البرق ودون اتصال بالإنترنت. عند تشغيل وضع المزامنة (Online)، يتم ترحيل الفواتير فورياً إلى قاعدة بيانات Firestore السحابية الآمنة.'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="font-bold text-white flex items-center gap-1.5 justify-start">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block shrink-0" />
                      <span>{lang === 'en' ? '2. Why do I need manual backup?' : '٢. ما هي أهمية النسخ الاحتياطي اليدوي بملف خارجي؟'}</span>
                    </h5>
                    <p className="text-slate-300 pr-3 leading-relaxed">
                      {lang === 'en' 
                        ? 'Browsers may occasionally purge local database indices due to disk cleanups, device resets, or privacy sweepers. A backup file keeps you 100% safe.' 
                        : 'ذاكرة المتصفح قد تتعرض للفرمتة العشوائية أو المسح والتهيئة في بعض الحالات مثل (تنظيف الذاكرة المؤقتة للكمبيوتر، الفيروسات، تحديث أنظمة التشغيل، أو تهيئة الويندوز). تحميل ملف الاحتياط (.json) وحفظه يضمن لك حزام أمان بقرص خارجي أو فلاشة أو على السحابة.'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="font-bold text-white flex items-center gap-1.5 justify-start">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block shrink-0" />
                      <span>{lang === 'en' ? '3. What are the storage limits?' : '٣. ما هي حدود السعة والاستخدام الأقصى؟'}</span>
                    </h5>
                    <p className="text-slate-300 pr-3 leading-relaxed font-sans">
                      {lang === 'en' 
                        ? 'Your offline disk allows up to 5MB - 10MB of storage. This easily stores over 80,000 spare parts items and 150,000 cash operations. Meanwhile, cloud Firestore has no storage limits for your corporate history.' 
                        : 'توفر الذاكرة المحلية سعة افتراضية كافية لحفظ أكثر من ٥٠,٠٠٠ صنف وقطع غيار بالإضافة إلى ١٠٠,٠٠٠ عملية مبيعات وصيانة بشكل آمن تماماً وبسرعة فائقة. بينما لا يحتاج التخزين السحابي لـ Firestore إلى القلق بخصوص الحجم حيث يتسع لمليارات المستندات بدون حدود.'}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-950/40 text-amber-300 p-4 border border-amber-900/40 rounded-xl flex gap-2.5">
                  <ShieldAlert size={18} className="shrink-0 text-amber-400 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-right">
                    <strong>{lang === 'en' ? 'Operational Safety Caution' : 'توصية وقائية هامة:'}</strong>
                    <p className="mt-0.5 opacity-90">
                      {lang === 'en' 
                        ? 'Restoring overwrites current local states. Please make sure to download a backup of your current setup before restoring an older file!' 
                        : 'عملية الاسترجاع تستبدل المعطيات الحالية مباشرة. ننصح بتحميل نسخة لبياناتك الحالية كخطوة احترازية قبل البدء برفع أي ملف مؤرشف قديم تفادياً لفقدان الفواتير الجديدة.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
