/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeData } from './firebase';

import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  FolderLock, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Menu, 
  X,
  Store,
  Compass,
  LayoutDashboard,
  Shield,
  User,
  Calendar,
  Download,
  Laptop,
  ExternalLink,
  Smartphone,
  Info,
  Maximize,
  Minimize,
  Wrench,
  Bell
} from 'lucide-react';

import { Product, SalesOrder, Shift, SyncItem, Shop, RepairOrder } from './types';
import { INITIAL_PRODUCTS } from './data';

// Component imports
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import ShiftManager from './components/ShiftManager';
import SyncHub from './components/SyncHub';
import AdminPortal from './components/AdminPortal';
import Repairs from './components/Repairs';
export default function App() {

  // Always default strictly to cashier upon page entry/reload to prevent unauthorized entry
  const [userRole, setUserRole] = useState<'admin' | 'cashier'>('cashier');

  // Progressive Web App (PWA) installation state managers
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    return !localStorage.getItem('pos_pwa_banner_dismissed');
  });
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installTab, setInstallTab] = useState<'android' | 'ios' | 'pc'>('android');
  // Always default strictly to the 'pos' cashier tab upon page entry/reload
  const [activeTab, setActiveTab] = useState('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>(() => {
    const saved = localStorage.getItem('pos_language');
    return (saved === 'ar' || saved === 'en') ? saved : 'ar'; // Change default to Arabic for local user context
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error enabling fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error disabling fullscreen:', err);
      });
    }
  };

  // Secure PIN verification for switching back to Admin/Owner Mode
  const [pinInput, setPinInput] = useState('');
  const [isPromptingPin, setIsPromptingPin] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Bind physical keyboard events to typing the manager PIN
  useEffect(() => {
    if (!isPromptingPin) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setPinError(false);
        setPinInput(prev => {
          const next = prev + e.key;
          if (next.length === 4) {
            if (next === '2222') {
              setUserRole('admin');
              localStorage.setItem('pos_user_role', 'admin');
              setActiveTab('dashboard');
              setIsPromptingPin(false);
              return '';
            } else {
              setPinError(true);
              return '';
            }
          }
          return next;
        });
      } else if (e.key === 'Backspace') {
        setPinError(false);
        setPinInput(p => p.slice(0, -1));
      } else if (e.key === 'Escape') {
        setIsPromptingPin(false);
        setPinInput('');
        setPinError(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPromptingPin]);

  // Enforce tab access control for cashier
  useEffect(() => {
    if (userRole === 'cashier' && activeTab !== 'pos' && activeTab !== 'shifts' && activeTab !== 'repairs') {
      setActiveTab('pos');
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('pos_language', lang);
  }, [lang]);

  // Core synchronized persistent states
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [historicalShifts, setHistoricalShifts] = useState<Shift[]>([]);
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  
  // Multi-shop/branch states
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShopId, setActiveShopId] = useState<string>(() => {
    return localStorage.getItem('pos_active_shop_id') || 'shop_default';
  });

  // Browser-native network state sensor for authentic status tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncQueue: SyncItem[] = [];

  // 1. INITIAL FIRESTORE REAL-TIME SUBSCRIPTIONS
  useEffect(() => {
    // A. Shops Subscription: Realtime Sync across devices
    const unsubscribeShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
      const loadedShops: Shop[] = [];
      snapshot.forEach((doc) => {
        loadedShops.push(doc.data() as Shop);
      });
      if (loadedShops.length === 0) {
        // First-time setup: Seed default shop to Firestore
        const defaultShop: Shop = {
          id: 'shop_default',
          name: lang === 'ar' ? 'الفتح لقطع غيار الأجهزة المنزلية' : 'Al-Fath Home Appliances Spares',
          type: 'spare_parts',
          currency: 'EGP',
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'shops', 'shop_default'), defaultShop)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, 'shops/shop_default'));
      } else {
        setShops(loadedShops);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shops');
    });

    // B. Products Subscription: Realtime Sync across devices
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const loadedProducts: Product[] = [];
      snapshot.forEach((doc) => {
        loadedProducts.push(doc.data() as Product);
      });
      if (loadedProducts.length === 0) {
        // Seed default catalog initially to Firestore
        INITIAL_PRODUCTS.forEach((p) => {
          const prod = { ...p, shopId: p.shopId || 'shop_default' };
          setDoc(doc(db, 'products', prod.id), prod)
            .catch(err => handleFirestoreError(err, OperationType.WRITE, `products/${prod.id}`));
        });
      } else {
        setProducts(loadedProducts);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    // C. Sales Orders Subscription: Realtime Sync across devices
    const unsubscribeOrders = onSnapshot(collection(db, 'sales_orders'), (snapshot) => {
      const loadedOrders: SalesOrder[] = [];
      snapshot.forEach((doc) => {
        loadedOrders.push(doc.data() as SalesOrder);
      });
      loadedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(loadedOrders);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales_orders');
    });

    // D. Repairs Subscription: Realtime Sync across devices
    const unsubscribeRepairs = onSnapshot(collection(db, 'repairs'), (snapshot) => {
      const loadedRepairs: RepairOrder[] = [];
      snapshot.forEach((doc) => {
        loadedRepairs.push(doc.data() as RepairOrder);
      });
      loadedRepairs.sort((a, b) => new Date(b.updatedAt || b.receivedDate).getTime() - new Date(a.updatedAt || a.receivedDate).getTime());
      setRepairs(loadedRepairs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'repairs');
    });

    return () => {
      unsubscribeShops();
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeRepairs();
    };
  }, [lang]);

  // E. Shifts Subscription linked to activeShopId (updates upon shop toggle)
  useEffect(() => {
    const unsubscribeShifts = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      const loadedShifts: Shift[] = [];
      snapshot.forEach((doc) => {
        loadedShifts.push(doc.data() as Shift);
      });
      
      // Sort descending by openedAt
      loadedShifts.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      
      const openShifts = loadedShifts.filter(s => s.status === 'open');
      const activeShopOpenShift = openShifts.find(s => s.shopId === activeShopId) || null;
      
      setActiveShift(activeShopOpenShift);
      setHistoricalShifts(loadedShifts.filter(s => s.status === 'closed'));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shifts');
    });

    return () => unsubscribeShifts();
  }, [activeShopId]);

  // 2. HELPER TO SAVE CONFIGURATIONS (Internal settings like activeShopId)
  const saveState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // 3. HANDLERS FOR PRODUCTS INVENTORY
  const handleAddProduct = async (newProductData: Omit<Product, 'id' | 'updatedAt'>) => {
    const generatedId = "prod_" + Math.random().toString(36).substr(2, 9);
    const newProduct: Product = {
      ...newProductData,
      id: generatedId,
      updatedAt: new Date().toISOString(),
      shopId: activeShopId
    };
    try {
      await setDoc(doc(db, 'products', generatedId), sanitizeData(newProduct));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${generatedId}`);
    }
  };

  const handleUpdateProduct = async (updatedProd: Product) => {
    try {
      await setDoc(doc(db, 'products', updatedProd.id), sanitizeData({
        ...updatedProd,
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${updatedProd.id}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  // 3B. HANDLERS FOR REPAIRS & MAINTENANCE
  const handleAddRepair = async (newRepairData: Omit<RepairOrder, 'id' | 'receivedDate' | 'updatedAt'>) => {
    const generatedId = "repair_" + Math.random().toString(36).substr(2, 9);
    const newRepair: RepairOrder = {
      ...newRepairData,
      id: generatedId,
      receivedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'repairs', generatedId), sanitizeData(newRepair));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `repairs/${generatedId}`);
    }
  };

  const handleUpdateRepair = async (updatedRep: RepairOrder) => {
    try {
      await setDoc(doc(db, 'repairs', updatedRep.id), sanitizeData({
        ...updatedRep,
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `repairs/${updatedRep.id}`);
    }
  };

  const handleDeleteRepair = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'repairs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `repairs/${id}`);
    }
  };

  // 4. HANDLERS FOR SHIFTS MANAGEMENT
  const handleOpenShift = async (openingCash: number, cashierName: string) => {
    const newShiftId = "shift_" + Math.random().toString(36).substr(2, 9);
    const newShift: Shift = {
      id: newShiftId,
      cashierId: "cashier_" + Math.random().toString(36).substr(2, 5),
      cashierName,
      openedAt: new Date().toISOString(),
      openingCash,
      cashSales: 0,
      cardSales: 0,
      vodafoneSales: 0,
      expectedCash: openingCash,
      status: 'open',
      shopId: activeShopId
    };
    try {
      await setDoc(doc(db, 'shifts', newShiftId), newShift);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `shifts/${newShiftId}`);
    }
  };

  const handleCloseShift = async (actualCash: number) => {
    if (!activeShift) return;

    const activeShiftOrders = orders.filter(o => o.shiftId === activeShift.id);
    const cashSalesTotal = activeShiftOrders
      .filter(o => o.paymentMethod === 'cash')
      .reduce((acc, o) => acc + o.total, 0);
    const cardSalesTotal = activeShiftOrders
      .filter(o => o.paymentMethod === 'card')
      .reduce((acc, o) => acc + o.total, 0);
    const vodafoneSalesTotal = activeShiftOrders
      .filter(o => o.paymentMethod === 'vodafone')
      .reduce((acc, o) => acc + o.total, 0);

    const expectedCash = activeShift.openingCash + cashSalesTotal;
    const discrepancy = actualCash - expectedCash;

    const closedShift: Shift = {
      ...activeShift,
      closedAt: new Date().toISOString(),
      cashSales: cashSalesTotal,
      cardSales: cardSalesTotal,
      vodafoneSales: vodafoneSalesTotal,
      expectedCash,
      actualCash,
      discrepancy,
      status: 'closed'
    };

    try {
      await setDoc(doc(db, 'shifts', closedShift.id), sanitizeData(closedShift));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shifts/${closedShift.id}`);
    }
  };

  // 5. HANDLERS: POS ORDER PROCESS CHECKOUT (STOCK AUTO-DEDUCTION)
  const handleCheckoutOrder = async (orderDraft: Omit<SalesOrder, 'id' | 'createdAt'>) => {
    const orderId = "TKT-" + Math.floor(100000 + Math.random() * 900000);
    const newOrder: SalesOrder = {
      ...orderDraft,
      id: orderId,
      createdAt: new Date().toISOString(),
      shopId: activeShopId
    };

    try {
      // Create new sales order document in Firestore
      await setDoc(doc(db, 'sales_orders', orderId), sanitizeData(newOrder));

      // Mutate and decrement product inventories directly inside the cloud db
      for (const item of orderDraft.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const remainingQty = Math.max(0, prod.quantity - item.quantity);
          await setDoc(doc(db, 'products', prod.id), sanitizeData({
            ...prod,
            quantity: remainingQty,
            updatedAt: new Date().toISOString()
          }));
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sales_orders/${orderId}`);
    }
  };

  // Multi-shop/branch manager handlers
  const handleSelectShop = (id: string) => {
    setActiveShopId(id);
    saveState('pos_active_shop_id', id);
  };

  const handleAddShop = async (name: string, type: Shop['type'], currency: Shop['currency']) => {
    const newShopId = "shop_" + Math.random().toString(36).substr(2, 9);
    const newShop: Shop = {
      id: newShopId,
      name,
      type,
      currency,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'shops', newShopId), newShop);
      setActiveShopId(newShopId);
      saveState('pos_active_shop_id', newShopId);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `shops/${newShopId}`);
    }
  };

  const handleDeleteShop = async (id: string) => {
    if (id === 'shop_default') return;
    try {
      await deleteDoc(doc(db, 'shops', id));
      if (activeShopId === id) {
        setActiveShopId('shop_default');
        saveState('pos_active_shop_id', 'shop_default');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `shops/${id}`);
    }
  };

  const handleUpdateShopName = async (id: string, name: string) => {
    const shop = shops.find(s => s.id === id);
    if (!shop) return;
    try {
      await setDoc(doc(db, 'shops', id), {
        ...shop,
        name
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shops/${id}`);
    }
  };

  const handleResetDatabase = async () => {
    try {
      // 1. Delete all current products from Firestore
      for (const p of products) {
        await deleteDoc(doc(db, 'products', p.id));
      }
      // 2. Delete all current orders from Firestore
      for (const o of orders) {
        await deleteDoc(doc(db, 'sales_orders', o.id));
      }
      // 3. Delete all current repairs from Firestore
      for (const r of repairs) {
        await deleteDoc(doc(db, 'repairs', r.id));
      }
      // 4. Delete all current shifts from Firestore
      if (activeShift) {
        await deleteDoc(doc(db, 'shifts', activeShift.id));
      }
      for (const s of historicalShifts) {
        await deleteDoc(doc(db, 'shifts', s.id));
      }

      // 5. Seed default shop and products
      const defaultShop: Shop = {
        id: 'shop_default',
        name: 'الفتح لقطع غيار الأجهزة المنزلية',
        type: 'spare_parts',
        currency: 'EGP',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'shops', 'shop_default'), defaultShop);

      const freshProducts = INITIAL_PRODUCTS.map(p => ({ ...p, shopId: 'shop_default' }));
      for (const p of freshProducts) {
        await setDoc(doc(db, 'products', p.id), p);
      }

      setActiveShopId('shop_default');
      saveState('pos_active_shop_id', 'shop_default');
    } catch (err) {
      console.error('Error resetting database', err);
    }
  };

  const handleRestoreDatabase = async (restoredData: any) => {
    if (!restoredData || typeof restoredData !== 'object') {
      throw new Error(lang === 'ar' ? 'ملف غير صالح' : 'Invalid file format');
    }

    try {
      const newShops = Array.isArray(restoredData.shops) ? restoredData.shops : [];
      const newProducts = Array.isArray(restoredData.products) ? restoredData.products : [];
      const newOrders = Array.isArray(restoredData.orders) ? restoredData.orders : [];
      const newHistoricalShifts = Array.isArray(restoredData.historicalShifts) ? restoredData.historicalShifts : [];
      const newRepairs = Array.isArray(restoredData.repairs) ? restoredData.repairs : [];

      // Bulk upload to Firestore
      for (const s of newShops) {
        await setDoc(doc(db, 'shops', s.id), s);
      }
      for (const p of newProducts) {
        await setDoc(doc(db, 'products', p.id), p);
      }
      for (const o of newOrders) {
        await setDoc(doc(db, 'sales_orders', o.id), o);
      }
      for (const s of newHistoricalShifts) {
        await setDoc(doc(db, 'shifts', s.id), s);
      }
      if (restoredData.activeShift) {
        await setDoc(doc(db, 'shifts', restoredData.activeShift.id), restoredData.activeShift);
      }
      for (const r of newRepairs) {
        await setDoc(doc(db, 'repairs', r.id), r);
      }
    } catch (err) {
      console.error('Error restoring database backup', err);
      throw err;
    }
  };

  const getArabicDayName = (dayIndex: number): string => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex];
  };

  const getSystemDateString = () => {
    const today = new Date();
    if (lang === 'ar') {
      const dayName = getArabicDayName(today.getDay());
      const arabicDate = today.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return `${dayName}، ${arabicDate}`;
    } else {
      return today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // 6. SYNCHRONIZE OFFLINE DATA MUTATIONS FLUSH
  const handleTriggerSyncFlush = () => {
    // All Firestore operations synchronize automatically in the background
    localStorage.removeItem('pos_sync_queue');
  };

  const activeShop = shops.find(s => s.id === activeShopId);
  const currencySymbol = activeShop?.currency === 'USD' ? '$' : (lang === 'ar' ? 'ج.م' : 'EGP');

  // Filter scoped states for currently operating active branch
  const activeScopedProducts = products.filter(p => p.shopId === activeShopId);
  const activeScopedOrders = orders.filter(o => o.shopId === activeShopId);
  const activeScopedShift = activeShift && activeShift.shopId === activeShopId ? activeShift : null;
  const activeScopedHistoricalShifts = historicalShifts.filter(s => s.shopId === activeShopId);
  const activeScopedRepairs = repairs.filter(r => r.shopId === activeShopId);
  const pendingRepairsCount = activeScopedRepairs.filter(r => r.status !== 'delivered').length;

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-hidden">
      
      {/* 0. TOP APP INSTALLATION BANNER */}
      {showInstallBanner && (
        <div id="install-pwa-banner" className="bg-indigo-950 text-white py-2 px-4 flex items-center justify-between gap-4 shrink-0 shadow-md border-b border-indigo-900 font-sans z-40 text-xs transition duration-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
              <span className="font-extrabold text-white text-[11px] md:text-xs">
                {lang === 'ar' ? 'تثبيت تطبيق الفتح POS للمحلات على جهازك 📱📲' : 'Install Al-Fath POS App for your business 📱📲'}
              </span>
              <span className="text-[10px] text-indigo-200 font-medium hidden md:inline">
                {lang === 'ar' ? 'لفتح التطبيق بمظهر مستقل ملء الشاشة، سرعة فائقة ودعم قارئ الباركود الصوتي' : 'Get standard full-screen desktop/mobile capability, standalone performance & direct launch.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowInstallModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] md:text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Download size={12} className="shrink-0" />
              <span>{lang === 'ar' ? 'تثبيت الآن' : 'Install Now'}</span>
            </button>
            <button
              onClick={() => {
                setShowInstallBanner(false);
                localStorage.setItem('pos_pwa_banner_dismissed', 'true');
              }}
              className="text-indigo-200 hover:text-white p-1 transition cursor-pointer"
              title={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main flex row layout */}
      <div className="flex flex-1 h-full overflow-hidden">
      <aside 
        id="app-navigation-sidebar"
        className={`bg-white text-[#1A1A1A] w-64 border-r border-[#E5E7EB] shrink-0 transform lg:transform-none transition-transform duration-200 ease-in-out fixed lg:relative z-40 h-full top-0 bottom-0 start-0 flex flex-col justify-between ${
          isSidebarOpen ? 'translate-x-0' : (lang === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')
        }`}
      >
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-emerald-50/20">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-xs border border-emerald-600/30 bg-slate-950 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt={lang === 'en' ? 'Al-Fath POS Logo' : 'شعار الفتح POS'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-gray-950 leading-none uppercase">
                  {lang === 'en' ? 'AL-FATH POS' : 'الفتح POS'}
                </h1>
                <span className="text-[9px] tracking-wider uppercase text-emerald-600 font-extrabold">
                  {lang === 'en' ? 'Home Appliances Spares' : 'قطع غيار الأجهزة المنزلية'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-[#6B7280] hover:text-black transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav List */}
          <nav className="px-3.5 space-y-1.5 text-xs">
            {userRole === 'admin' && (
              <button
                 onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                 className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition ${
                   activeTab === 'dashboard' ? 'bg-[#F3F4F6] text-black font-semibold border border-transparent' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F9FAFB]'
                 }`}
              >
                <LayoutDashboard size={16} />
                <span>{lang === 'en' ? 'Business Control' : 'لوحة تحكم الأعمال'}</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('pos'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition ${
                activeTab === 'pos' ? 'bg-[#F3F4F6] text-black font-semibold border border-transparent' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F9FAFB]'
              }`}
            >
              <ShoppingCart size={16} />
              <span>{lang === 'en' ? 'Cashier POS Terminal' : 'جهاز الكاشير نقطة البيع'}</span>
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => { setActiveTab('inventory'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition ${
                  activeTab === 'inventory' ? 'bg-[#F3F4F6] text-black font-semibold border border-transparent' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F9FAFB]'
                }`}
              >
                <Package size={16} />
                <span>{lang === 'en' ? 'Inventory Catalog' : 'دليل وجدولة المخزون'}</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('shifts'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition ${
                activeTab === 'shifts' ? 'bg-[#F3F4F6] text-black font-semibold border border-transparent' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F9FAFB]'
              }`}
            >
              <FolderLock size={16} />
              <span>{lang === 'en' ? 'Shift Ledger (الوردية)' : 'سجل ورديات الصندوق'}</span>
            </button>

            <button
              onClick={() => { setActiveTab('repairs'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium transition ${
                activeTab === 'repairs' ? 'bg-[#F3F4F6] text-black font-semibold border border-transparent' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F9FAFB]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wrench size={16} />
                <span>{lang === 'en' ? 'Device Repairs / Maintenance' : 'إدارة صيانة الأجهزة والعملاء'}</span>
              </div>
              {pendingRepairsCount > 0 && (
                <span className="bg-rose-500 text-white font-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce shrink-0" title={lang === 'ar' ? 'أجهزة صيانة قيد الانتظار' : 'Pending Repairs'}>
                  {pendingRepairsCount}
                </span>
              )}
            </button>

            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => { setActiveTab('admin_portal'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition ${
                    activeTab === 'admin_portal' ? 'bg-[#F3F4F6] text-black font-semibold border border-transparent' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <Store size={16} />
                  <span>{lang === 'en' ? 'Admin & Shops Settings' : 'بوابة الإدارة والمحلات'}</span>
                </button>

                <button
                  onClick={() => { setActiveTab('synchub'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition ${
                    activeTab === 'synchub' ? 'bg-[#F3F4F6] text-black font-semibold border border-transparent' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <RefreshCw size={16} />
                  <span>{lang === 'en' ? 'Sync & Architecture' : 'بنية ومزامنة السحابة'}</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Sync Indicator Card & Language Selection inside Footer */}
        <div id="footer-language-sync" className="p-4 border-t border-[#E5E7EB] space-y-3 bg-[#FAFAFA]">
          
          {/* SECURE ROLE SWITCHER COMPONENT */}
          <div className="bg-white p-3 rounded-xl border border-[#E5E7EB] space-y-2 text-xs border-r-4 border-r-indigo-605 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-gray-800 text-[11px]">
                {lang === 'en' ? 'Interface Mode' : 'واجهة استخدام النظام'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold select-none uppercase ${
                userRole === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {userRole === 'admin' 
                  ? (lang === 'en' ? 'Manager' : 'المدير') 
                  : (lang === 'en' ? 'Cashier' : 'الكاشير')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 mt-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200 select-none">
              <button
                type="button"
                onClick={() => {
                  if (userRole !== 'cashier') {
                    setUserRole('cashier');
                    localStorage.setItem('pos_user_role', 'cashier');
                    setActiveTab('pos');
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md transition text-[10px] font-bold cursor-pointer ${
                  userRole === 'cashier' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                <User size={12} />
                <span>{lang === 'en' ? 'Cashier' : 'كاشير مبسط'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (userRole !== 'admin') {
                    setIsPromptingPin(true);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md transition text-[10px] font-bold cursor-pointer ${
                  userRole === 'admin' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 hover:text-black'
                }`}
              >
                <Shield size={12} />
                <span>{lang === 'en' ? 'Manager' : 'مدير الأعمال'}</span>
              </button>
            </div>
          </div>

          {/* App Install Trigger Button */}
          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/70 text-emerald-950 font-extrabold text-[10.5px] rounded-xl transition active:scale-98 cursor-pointer select-none"
          >
            <Download size={12} className="text-emerald-700 shrink-0 animate-bounce" />
            <span>{lang === 'ar' ? 'تثبيت تطبيق الفتح الفوري 📲' : 'Install Standalone App 📲'}</span>
          </button>

          {/* Language Selector */}
          <div className="flex bg-[#E5E7EB]/50 p-0.5 rounded-lg border border-[#E5E7EB] text-[10px] font-semibold select-none">
            <button
              onClick={() => setLang('en')}
              className={`flex-1 py-1.5 px-2 rounded-md transition duration-150 ${lang === 'en' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-500 hover:text-black'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('ar')}
              className={`flex-1 py-1.5 px-2 rounded-md transition duration-150 ${lang === 'ar' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-500 hover:text-black'}`}
            >
              العربية
            </button>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-3 text-xs select-none">
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {lang === 'en' ? 'Sync Node' : 'عقدة المزامنة'}
              </span>
              <p className="font-semibold text-black mt-1 leading-none">
                {isOnline 
                  ? (lang === 'en' ? 'Online Synced' : 'متصل ومزامن') 
                  : (lang === 'en' ? 'Offline-first queue' : 'قائمة ذكية منفصلة')}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#059669] animate-pulse' : 'bg-[#DC2626]'}`}></div>
          </div>
          <p className="text-[9.5px] text-[#9CA3AF] text-center font-mono">
            {lang === 'en' ? 'Sahl POS • Local Server active' : 'سهل POS • الكاشير المحلي مفعّل'}
          </p>
        </div>
      </aside>

      {/* Backdrop for mobile overlays */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs z-30 lg:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* 2. RIGHT COMPARTMENT WORKSPACE VIEWPORT */}
      <div id="workspace-viewport" className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Operational Bar */}
        <header className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1 bg-white border border-[#E5E7EB] rounded-lg text-gray-500 hover:bg-[#F9FAFB] transition"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 select-none">
              <Store className="text-black w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-gray-800 text-xs font-bold uppercase font-sans">
                {lang === 'en' 
                  ? `Active Shop: ${activeShop?.name || 'Main branch'} • Local Port: 3000` 
                  : `المحل النشط: ${activeShop?.name || 'الفرع الرئيسي'} • منفذ الكاشير: 3000`}
              </span>
            </div>
          </div>

          {/* Real-time Dynamic Date & Day Badge */}
          <div id="topbar-live-date-badge" className="hidden md:flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 text-indigo-950 px-4 py-1.5 rounded-full text-xs font-bold leading-none select-none font-sans">
            <Calendar size={13} className="text-indigo-600 shrink-0" />
            <span>
              {getSystemDateString()}
            </span>
          </div>

          {/* Quick status line */}
          <div className="flex items-center gap-3.5 text-xs font-sans font-bold select-none">
            {/* Fullscreen Trigger Button */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-950 transition active:scale-95 py-1.5 px-3 rounded-full text-[11px] font-bold cursor-pointer"
              title={lang === 'ar' ? 'تشغيل ملء الشاشة' : 'Toggle Fullscreen'}
            >
              {isFullscreen ? <Minimize size={13} className="text-indigo-650" /> : <Maximize size={13} className="text-indigo-650" />}
              <span>{lang === 'ar' ? (isFullscreen ? 'نافذة عادية' : 'شاشة كاملة 🖥️') : (isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 🖥️')}</span>
            </button>

            {isOnline ? (
              <div className="flex items-center gap-1.5 text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
                <Wifi size={12} className="shrink-0" />
                <span>{lang === 'en' ? 'LOCAL CACHE SYNCED' : 'تمت مزامنة الكاش المحلي'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#DC2626] bg-[#FEF2F2] border border-[#FEE2E2] px-3 py-1 rounded-full text-[10px] font-bold tracking-wider animate-pulse">
                <WifiOff size={12} className="shrink-0" />
                <span>{lang === 'en' ? 'OFFLINE QUEUE ACTIVE' : 'نشط: مخزن العمليات المحلي'}</span>
              </div>
            )}
          </div>
        </header>

        {/* Core dynamic viewport based on tab selection */}
        <main 
          tabIndex={0} 
          className="flex-1 px-6 py-5 focus:outline-hidden overflow-y-auto"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  products={activeScopedProducts}
                  orders={activeScopedOrders}
                  activeShift={activeScopedShift}
                  onNavigate={setActiveTab}
                  lang={lang}
                  // @ts-ignore
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === 'pos' && (
                <POS 
                  products={activeScopedProducts}
                  activeShift={activeScopedShift}
                  onCheckout={handleCheckoutOrder}
                  onNavigate={setActiveTab}
                  lang={lang}
                  // @ts-ignore
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === 'inventory' && (
                <Inventory 
                  products={activeScopedProducts}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  activeShiftId={activeScopedShift ? activeScopedShift.id : null}
                  lang={lang}
                  // @ts-ignore
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === 'shifts' && (
                <ShiftManager 
                  activeShift={activeScopedShift}
                  onOpenShift={handleOpenShift}
                  onCloseShift={handleCloseShift}
                  historicalShifts={activeScopedHistoricalShifts}
                  orders={activeScopedOrders}
                  lang={lang}
                  // @ts-ignore
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === 'admin_portal' && (
                <AdminPortal
                  shops={shops}
                  activeShopId={activeShopId}
                  onSelectShop={handleSelectShop}
                  onAddShop={handleAddShop}
                  onUpdateShopName={handleUpdateShopName}
                  onDeleteShop={handleDeleteShop}
                  products={products}
                  orders={orders}
                  shifts={historicalShifts}
                  lang={lang}
                  onResetDatabase={handleResetDatabase}
                />
              )}

              {activeTab === 'synchub' && (
                <SyncHub 
                  isOnline={isOnline}
                  onToggleOnline={() => setIsOnline(!isOnline)}
                  syncQueue={syncQueue}
                  onTriggerSync={handleTriggerSyncFlush}
                  lang={lang}
                  onRestoreDatabase={handleRestoreDatabase}
                />
              )}

              {activeTab === 'repairs' && (
                <Repairs
                  repairs={repairs}
                  onAddRepair={handleAddRepair}
                  onUpdateRepair={handleUpdateRepair}
                  onDeleteRepair={handleDeleteRepair}
                  lang={lang}
                  activeShopId={activeShopId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>

      {/* 3. APP INSTALLATION INSTRUCTIONS MODAL */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-150 flex flex-col font-sans"
            >
              {/* Header */}
              <div className="bg-indigo-950 text-white p-5 relative flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                    {lang === 'ar' ? 'تثبيت مجاني بالكامل • PWA' : 'Fully Free Setup • PWA'}
                  </div>
                  <h3 className="text-base font-black tracking-tight leading-none text-white">
                    {lang === 'ar' ? 'تحميل تطبيق الفتح كاشير لجهازك' : 'Download Al-Fath Cashier App'}
                  </h3>
                  <p className="text-[11px] text-indigo-200 mt-1">
                    {lang === 'ar' 
                      ? 'قم بتحويل متصفحك لتطبيق منفصل سريع ومستقل بلمسة واحدة!' 
                      : 'Run directly as a standalone application on your device with native display.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition cursor-pointer self-start"
                  title={lang === 'ar' ? 'إغلاق' : 'Close'}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation Tabs for Platform */}
              <div className="grid grid-cols-3 border-b border-gray-100 bg-gray-50/50 p-1.5 gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setInstallTab('android')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                    installTab === 'android' 
                      ? 'bg-white text-emerald-750 shadow-xs border border-gray-100 font-extrabold' 
                      : 'text-gray-500 hover:text-black hover:bg-white/40'
                  }`}
                >
                  <Smartphone size={13} className="shrink-0" />
                  <span>{lang === 'ar' ? 'أندرويد / سامسونج' : 'Android'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstallTab('ios')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                    installTab === 'ios' 
                      ? 'bg-white text-indigo-750 shadow-xs border border-gray-100 font-extrabold' 
                      : 'text-gray-500 hover:text-black hover:bg-white/40'
                  }`}
                >
                  <Smartphone size={13} className="shrink-0" />
                  <span>{lang === 'ar' ? 'آيفون / سفاري' : 'iPhone iOS'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstallTab('pc')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                    installTab === 'pc' 
                      ? 'bg-white text-orange-750 shadow-xs border border-gray-100 font-extrabold' 
                      : 'text-gray-500 hover:text-black hover:bg-white/40'
                  }`}
                >
                  <Laptop size={13} className="shrink-0" />
                  <span>{lang === 'ar' ? 'كمبيوتر / لابتوب' : 'PC / Laptop'}</span>
                </button>
              </div>

              {/* Instructions Detail Body */}
              <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[310px] font-sans">
                {/* Embedded IFrame alert help */}
                <div className="bg-amber-50 border border-amber-250 p-4 rounded-2xl text-xs space-y-2 text-right" dir="rtl">
                  <p className="font-extrabold text-amber-950 flex items-center gap-1.5 justify-end">
                    <span>⚠️</span>
                    <span>توضيح هام بخصوص تنزيل وتثبيت التطبيق على جهازك:</span>
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                    بسبب سياسات حماية متصفح Chrome، يتم حجب خيار التنزيل التلقائي لـ PWA عندما يكون الكاشير مفتوحاً داخل نافذة المعاينة والتحرير بنظام AI Studio.
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    لكي يظهر لك خيار التثبيت والتحميل المباشر فورا: اضغط على الزر التالي ليفتح الكاشير مستقل تماماً بملء المتصفح، وسيظهر لك خيار التنزيل في شريط العنوان أعلى متصفحك أو بهاتفك في ثانية واحدة!
                  </p>
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-amber-600 hover:bg-amber-750 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-98 text-center cursor-pointer mt-1"
                  >
                    <ExternalLink size={12} />
                    <span>افتح الكاشير مستقل للتحميل والتثبيت الفوري 📲</span>
                  </a>
                </div>

                {installTab === 'android' && (
                  <div className="space-y-3.5 animate-fade-in text-right">
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-950 p-3 rounded-xl border border-emerald-100 text-xs text-right">
                      <Info size={14} className="text-emerald-600 shrink-0" />
                      <p className="font-semibold leading-tight">
                        {lang === 'ar' 
                          ? 'أفضل متصفح لتثبيت التطبيق على أندرويد هو Google Chrome.' 
                          : 'Google Chrome is highly recommended for installing PWAs on Android.'}
                      </p>
                    </div>

                    <ol className="space-y-3 text-xs text-gray-700 leading-relaxed text-right">
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-emerald-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">١</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'اضغط على زر خيارات المتصفح (النقاط الثلاثة العمودية ⠇) في شريط البحث العلوي لمتصفح Chrome.' 
                            : 'Tap on the Chrome options menu (three vertical dots ⠇) near the URL bar.'}
                        </p>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-emerald-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٢</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'اضغط على خيار "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية" (Add to Home screen).' 
                            : 'Select "Install App" or "Add to Home screen" from the menu options.'}
                        </p>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-emerald-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٣</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'أكد العملية بالضغط على زر "تثبيت" وسيظهر التطبيق على شاشتك فوراً باسم الفتح كاشير.' 
                            : 'Confirm by pressing "Install" and the app icon will be added to your screen.'}
                        </p>
                      </li>
                    </ol>
                  </div>
                )}

                {installTab === 'ios' && (
                  <div className="space-y-3.5 animate-fade-in text-right">
                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-950 p-3 rounded-xl border border-indigo-100 text-xs text-right">
                      <Info size={14} className="text-indigo-650 shrink-0" />
                      <p className="font-semibold leading-tight">
                        {lang === 'ar' 
                          ? 'يجب استخدام متصفح Safari الافتراضي لتثبيت التطبيق على أجهزة آبل (Apple iPhone).' 
                          : 'Apple iOS requires launching the website inside Safari to register standalones.'}
                      </p>
                    </div>

                    <ol className="space-y-3 text-xs text-gray-700 leading-relaxed text-right">
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">١</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'اضغط على زر "مشاركة" (سهم يشير للأعلى داخل مربع 📤) الموجود في شريط الأدوات السفلي لمتصفح Safari.' 
                            : 'Tap the "Share" action box (box with upward arrow 📤) in Safari toolbar.'}
                        </p>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٢</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'قم بالتمرير للأسفل في القائمة المفتوحة واضغط على "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).' 
                            : 'Scroll downwards in the shared menu sheet and click "Add to Home Screen".'}
                        </p>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٣</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'اضغط على زر "إضافة" (Add) في الزاوية العلوية اليمنى. سيظهر التطبيق كأنه تطبيق آبل حقيقي فوري!' 
                            : 'Click "Add" in the top right window corner. Your device now hosts the custom POS!'}
                        </p>
                      </li>
                    </ol>
                  </div>
                )}

                {installTab === 'pc' && (
                  <div className="space-y-3.5 animate-fade-in text-right">
                    <div className="flex items-center gap-2 bg-orange-50 text-orange-950 p-3 rounded-xl border border-orange-100 text-xs text-right">
                      <Info size={14} className="text-orange-600 shrink-0" />
                      <p className="font-semibold leading-tight">
                        {lang === 'ar' 
                          ? 'يمكن تثبيته كبرنامج كمبيوتر مستقل بملء الشاشة عبر متصفحات Chrome أو Microsoft Edge.' 
                          : 'PWAs run beautifully on Windows, macOS, and Linux PCs.'}
                      </p>
                    </div>

                    {/* Direct Standalone Download for Win7 32-bit */}
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2 mt-2">
                      <p className="text-xs font-bold text-slate-900">
                        {lang === 'ar' 
                          ? '💻 تحميل برنامج الفتح كامل برابط مباشر (لويندوز 7 وما فوق - نواة 32/64 بت):' 
                          : '💻 Pre-packaged Desktop Application (for Win 7 and above - 32/64 bit):'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {lang === 'ar'
                          ? 'لقد قمنا بتجميع ملفات برنامج الكاشير مسبقاً داخل مشغل Electron مخصص يعمل بدون الحاجة لتثبيت أي ملحقات إضافية.'
                          : 'Standalone build precompiled with Electron offline shell.'}
                      </p>
                      <a 
                        href="/Al-Fath-POS-Win7-32bit.zip" 
                        download="Al-Fath-POS-Win7-32bit.zip"
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-98 text-center cursor-pointer"
                      >
                        <Download size={13} />
                        <span>{lang === 'ar' ? 'تحميل تطبيق الفتح لويندوز 7 بملف واحد فوري (ZIP)' : 'Download Windows 7 POS Portable App (ZIP)'}</span>
                      </a>
                    </div>

                    {/* Node.js setup for Win7 */}
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl space-y-2 text-xs">
                      <p className="font-bold text-emerald-950">
                        {lang === 'ar'
                          ? '⚙️ تثبيت بيئة تشغيل Node.js للويندوز 7 (فقط للمطورين):'
                          : '⚙️ Node.js Environment for Windows 7 (Developers only):'}
                      </p>
                      <p className="text-[10px] text-gray-650">
                        {lang === 'ar'
                          ? 'إذا كنت تريد تشغيل الكاشير وتطوير المكونات محلياً، فآخر إصدار يدعم ويندوز 7 هو Node.js v16.20.2. حمل النسخة المتوافقة مع جهازك مباشرة عبر هذه الروابط الرسمية الآمنة لشركة Node.js:'
                          : 'The last Node.js version officially supporting Win 7 is v16.20.2. Install via these direct links:'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <a 
                          href="https://nodejs.org/dist/v16.20.2/node-v16.20.2-x86.msi" 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 text-[10.5px] font-bold py-1.5 px-2 rounded-lg block cursor-pointer transition"
                        >
                          {lang === 'ar' ? 'تنزيل نواة 32 بت (X86 MSI)' : 'Download 32-bit (X86)'}
                        </a>
                        <a 
                          href="https://nodejs.org/dist/v16.20.2/node-v16.20.2-x64.msi" 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-white border border-emerald-250 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950 text-[10.5px] font-bold py-1.5 px-2 rounded-lg block cursor-pointer transition"
                        >
                          {lang === 'ar' ? 'تنزيل نواة 64 بت (X64 MSI)' : 'Download 64-bit (X64)'}
                        </a>
                      </div>
                    </div>

                    <ol className="space-y-3 text-xs text-gray-700 leading-relaxed text-right">
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-orange-650 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">١</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'أو يمكنك تثبيت نسخة ويب مستقلة PWA عبر متصفحك: التفت إلى نهاية شريط العنوان (URL Bar) في أعلى متصفحك بجوار النجمة ومفضلة الصفحة.' 
                            : 'Look at the browser URL bar on the right side next to bookmarks.'}
                        </p>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-orange-650 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٢</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'ستجد زر تثبيت صغير (شكل شاشة كمبيوتر مع سهم لأسفل تنزيل 📥) أو زر التثبيت في شريط العنوان.' 
                            : 'You will find a small install icon (computer monitor with a down arrow). Click it.'}
                        </p>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-orange-650 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٣</span>
                        <p className="flex-1">
                          {lang === 'ar' 
                            ? 'اختر "تثبيت" (Install). سيغلق المتصفح ويفتح التطبيق في نافذة مستقلة كلياً وسريعة جداً!' 
                            : 'Choose "Install". The POS will open in a fast standalone window.'}
                        </p>
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-55/70 flex justify-between items-center select-none">
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold py-2 px-5 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  {lang === 'ar' ? 'فهمت، شكراً!' : 'Got it, thanks!'}
                </button>
                <span className="text-[10px] text-gray-400 font-mono">
                  {lang === 'ar' ? 'الفتح دوت كوم • فوري مئة بالمائة' : 'Al-Fath POS • Standalone Offline App'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. SECURED MANAGER PIN ACCESS NUMERIC KEYPAD DIALER MODAL */}
      <AnimatePresence>
        {isPromptingPin && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-150 p-6 max-w-sm w-full relative outline-hidden select-none"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex p-3.5 bg-indigo-50 rounded-2xl text-indigo-650 mb-2">
                  <Shield size={28} className="animate-pulse" />
                </div>
                <h3 className="text-base font-black tracking-tight text-gray-950">
                  {lang === 'ar' ? '🔑 تفعيل وضع المدير' : '🔑 Secured Manager Access'}
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  {lang === 'ar' 
                    ? 'الرجاء إدخال الرمز السري المكون من 4 أرقام للمتابعة وتغيير الأسعار والبيانات.' 
                    : 'Please enter the 4-digit manager PIN to unlock dashboard and catalog pricing.'}
                </p>
              </div>

              {/* PIN BULLETS PROGRESS */}
              <div className="flex justify-center gap-4 py-4 mb-6" dir="ltr">
                {[0, 1, 2, 3].map((index) => {
                  const hasValue = pinInput.length > index;
                  return (
                    <motion.div
                      key={index}
                      animate={{
                        scale: hasValue ? 1.2 : 1,
                        backgroundColor: pinError ? '#EF4444' : hasValue ? '#4F46E5' : '#E5E7EB'
                      }}
                      className="w-4.5 h-4.5 rounded-full border border-gray-250 shadow-inner"
                    />
                  );
                })}
              </div>

              {/* ERROR MESSAGE PANEL */}
              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-655 text-center text-xs font-bold mb-4"
                >
                  {lang === 'ar' ? '⚠️ الرمز السري خاطئ! يرجى المحاولة مجدداً.' : '⚠️ Incorrect PIN! Please try again.'}
                </motion.p>
              )}

              {/* TACTILE DIGIT KEYPAD */}
              <div className="grid grid-cols-3 gap-3 mb-6" dir="ltr">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setPinError(false);
                      if (pinInput.length < 4) {
                        const next = pinInput + num;
                        setPinInput(next);
                        if (next.length === 4) {
                          if (next === '2222') {
                            setUserRole('admin');
                            localStorage.setItem('pos_user_role', 'admin');
                            setActiveTab('dashboard');
                            setIsPromptingPin(false);
                            setPinInput('');
                          } else {
                            setPinError(true);
                            setPinInput('');
                          }
                        }
                      }
                    }}
                    className="h-14 bg-gray-50 hover:bg-indigo-50 border border-gray-150 hover:border-indigo-200 active:bg-indigo-100 rounded-2xl font-sans text-xl font-bold text-gray-800 hover:text-indigo-700 transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Clear Button */}
                <button
                  type="button"
                  onClick={() => {
                    setPinInput('');
                    setPinError(false);
                  }}
                  className="h-14 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl font-sans text-xs font-extrabold text-red-650 hover:text-red-700 transition active:scale-95 cursor-pointer shadow-xs uppercase"
                >
                  {lang === 'ar' ? 'مسح' : 'Clear'}
                </button>
                
                {/* 0 Button */}
                <button
                  key={0}
                  type="button"
                  onClick={() => {
                    setPinError(false);
                    if (pinInput.length < 4) {
                      const next = pinInput + '0';
                      setPinInput(next);
                      if (next.length === 4) {
                        if (next === '2222') {
                          setUserRole('admin');
                          localStorage.setItem('pos_user_role', 'admin');
                          setActiveTab('dashboard');
                          setIsPromptingPin(false);
                          setPinInput('');
                        } else {
                          setPinError(true);
                          setPinInput('');
                        }
                      }
                    }
                  }}
                  className="h-14 bg-gray-50 hover:bg-indigo-50 border border-gray-150 hover:border-indigo-200 active:bg-indigo-100 rounded-2xl font-sans text-xl font-bold text-gray-800 hover:text-indigo-700 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  0
                </button>

                {/* Backspace Button */}
                <button
                  type="button"
                  onClick={() => {
                    setPinInput(p => p.slice(0, -1));
                    setPinError(false);
                  }}
                  className="h-14 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-2xl font-sans text-lg font-bold text-gray-700 transition active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>

              {/* ACTION BACK BUTTONS */}
              <button
                type="button"
                onClick={() => {
                  setIsPromptingPin(false);
                  setPinInput('');
                  setPinError(false);
                }}
                className="w-full py-3 bg-gray-100 hover:bg-gray-150 text-gray-700 rounded-2xl text-xs font-black tracking-wide transition active:scale-98 cursor-pointer border border-gray-200 select-none text-center"
              >
                {lang === 'ar' ? 'الرجوع لوضع الكاشير' : 'Cancel & Stay Cashier'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
