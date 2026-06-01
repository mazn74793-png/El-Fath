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
  Activity
} from 'lucide-react';
import { SyncItem } from '../types';

interface SyncHubProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  syncQueue: SyncItem[];
  onTriggerSync: () => void;
  lang?: 'en' | 'ar';
}

export default function SyncHub({ isOnline, onToggleOnline, syncQueue, onTriggerSync, lang = 'en' }: SyncHubProps) {
  const [activeTab, setActiveTab] = useState<'monitor' | 'schema' | 'rules'>('monitor');
  const [isSyncing, setIsSyncing] = useState(false);

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
      </AnimatePresence>
    </div>
  );
}
