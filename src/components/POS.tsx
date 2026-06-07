/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Barcode, 
  Search, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  Plus, 
  Minus, 
  Layers, 
  CheckCircle,
  AlertCircle,
  Receipt,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  ShieldCheck,
  Percent,
  X,
  Undo2,
  History
} from 'lucide-react';
import { Product, CartItem, SalesOrder, Shift } from '../types';
import { CATEGORIES } from '../data';
import { db, handleFirestoreError, OperationType, sanitizeData } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface POSProps {
  products: Product[];
  orders: SalesOrder[];
  activeShift: Shift | null;
  onCheckout: (order: Omit<SalesOrder, 'id' | 'createdAt'>) => void;
  onNavigate: (tab: string) => void;
  lang?: 'en' | 'ar';
  currencySymbol?: string;
}

export default function POS({ products, orders, activeShift, onCheckout, onNavigate, lang = 'en', currencySymbol }: POSProps) {
  const symbol = currencySymbol || (lang === 'ar' ? 'ج.م' : 'EGP');
  // Cart items state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Scanned input & Search filter
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Checkout modifiers
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'vodafone'>('cash');
  
  // Checkout Modal State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [lastPrintedInvoice, setLastPrintedInvoice] = useState<SalesOrder | null>(null);

  // Status message for barcode scan feedback
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'err' } | null>(null);

  // Invoice History and Refund Dialog States for Cashiers
  const [invoiceHistoryOpen, setInvoiceHistoryOpen] = useState(false);
  const [invoiceHistorySearch, setInvoiceHistorySearch] = useState('');
  
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [activeReturnOrder, setActiveReturnOrder] = useState<SalesOrder | null>(null);
  const [activeReturnItem, setActiveReturnItem] = useState<any | null>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [isRefunding, setIsRefunding] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [returnSuccess, setReturnSuccess] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto focus barcode reader
  useEffect(() => {
    if (activeShift && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeShift]);

  // barcode scanner simulator handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Search for product with this barcode
    const foundProduct = products.find(p => p.barcode === barcodeInput.trim());

    if (foundProduct) {
      if (foundProduct.quantity <= 0) {
        showScanFeedback(
          lang === 'en' 
            ? `"${foundProduct.name}" is OUT OF STOCK!` 
            : `"${foundProduct.name}" نفد من المخزون!`, 
          'err'
        );
      } else {
        addToCart(foundProduct);
        showScanFeedback(
          lang === 'en' 
            ? `Scanned & added: ${foundProduct.name}` 
            : `تم مسح وإضافة المنتج: ${foundProduct.name}`, 
          'success'
        );
      }
    } else {
      showScanFeedback(
        lang === 'en' 
          ? `SKU/Barcode code "${barcodeInput}" not recognized.` 
          : `رمز الباركود "${barcodeInput}" غير معروف بالسجلات.`, 
        'err'
      );
    }
    setBarcodeInput('');
  };

  const showScanFeedback = (text: string, type: 'success' | 'err') => {
    setScanMessage({ text, type });
    const timer = setTimeout(() => {
      setScanMessage(null);
    }, 2800);
  };

  // Add Item to cart
  const addToCart = (product: Product) => {
    // Audit check: safety limit
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      
      if (existing) {
        // Confirm stock availability limit
        if (existing.quantity >= product.quantity) {
          showScanFeedback(
            lang === 'en' 
              ? `Exceeds store storage limit of ${product.quantity} for this item!` 
              : `تجاوز الحد الأقصى المتوفر بالمخازن (${product.quantity} وحدة)!`, 
            'err'
          );
          return prevCart;
        }
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1, discount: 0 }];
      }
    });

    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Modify individual quantities in cart
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const targetQty = item.quantity + delta;
          if (targetQty <= 0) return null;
          
          // boundary checks
          if (targetQty > item.product.quantity) {
            showScanFeedback(
              lang === 'en' 
                ? `Exceeds maximum physical storage (${item.product.quantity} left)` 
                : `تجاوز الحد الأقصى للمخزون الفعلي (${item.product.quantity} متبقي)`, 
              'err'
            );
            return item;
          }
          return { ...item, quantity: targetQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Modify item-level discounts
  const updateItemDiscount = (productId: string, discValue: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const maxSalesPrice = item.product.sellingPrice * item.quantity;
          const safeDiscount = Math.min(maxSalesPrice, Math.max(0, discValue));
          return { ...item, discount: safeDiscount };
        }
        return item;
      });
    });
  };

  // Remove Item
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  // Calculating invoice math
  const invoiceCalculations = React.useMemo(() => {
    const subtotal = cart.reduce((acc, item) => {
      return acc + (item.product.sellingPrice * item.quantity - item.discount);
    }, 0);

    const taxRate = 0; // Tax completely removed per user request
    const tax = 0;
    const grandTotal = Math.max(0, parseFloat((subtotal - overallDiscount).toFixed(2)));

    return {
      subtotal,
      tax,
      total: grandTotal
    };
  }, [cart, overallDiscount]);

  // Query-matching catalogue products
  const gridProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
      const matchesCat = selectedCategory === 'All Categories' || selectedCategory === 'جميع الأقسام' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Triggering the actual checkout deduction logic
  const handleProcessCheckout = () => {
    if (!activeShift) return;
    if (cart.length === 0) return;

    const itemsForLog = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      barcode: item.product.barcode,
      costPrice: item.product.costPrice,
      sellingPrice: item.product.sellingPrice,
      quantity: item.quantity,
      discount: item.discount,
      total: item.product.sellingPrice * item.quantity - item.discount
    }));

    const orderData = {
      cashierId: activeShift.cashierId,
      cashierName: activeShift.cashierName,
      shiftId: activeShift.id,
      items: itemsForLog,
      subtotal: invoiceCalculations.subtotal,
      discount: overallDiscount,
      tax: invoiceCalculations.tax,
      total: invoiceCalculations.total,
      paymentMethod
    };

    // Callback to parent container updating products, sales logs and shifts
    onCheckout(orderData);

    // Mock generated receipt log details for printing
    const orderWithId: SalesOrder = {
      ...orderData,
      id: "REC-" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString()
    };

    setLastPrintedInvoice(orderWithId);
    setCart([]);
    setOverallDiscount(0);
    setAmountPaid('');
    setIsCheckingOut(false);
  };

  // Discard shopping cart
  const clearCart = () => {
    const confirmationText = lang === 'en' 
      ? 'Confirm canceling and discarding current ticket?' 
      : 'هل أنت متأكب من إلغاء وحذف الفاتورة الحالية بالكامل؟';
    if (cart.length > 0 && confirm(confirmationText)) {
      setCart([]);
      setOverallDiscount(0);
    }
  };

  // Handle Return action for Cashier
  const handleProcessReturn = async () => {
    if (!activeReturnOrder) return;
    setIsRefunding(true);
    setReturnError('');
    setReturnSuccess('');

    try {
      if (activeReturnItem) {
        // Individual item partial/full return
        const alreadyReturned = activeReturnItem.returnedQty || 0;
        const maxAvailable = activeReturnItem.quantity - alreadyReturned;
        if (returnQty < 1 || returnQty > maxAvailable) {
          setReturnError(lang === 'en' ? 'Invalid return quantity.' : 'كمية المرتجع غير صالحة.');
          setIsRefunding(false);
          return;
        }

        // Calculate refund value per unit matching the actual checkout formula
        const unitRefundAmount = activeReturnItem.total / activeReturnItem.quantity;
        const totalRefundValue = unitRefundAmount * returnQty;

        // Upgrade item details and determine order status
        const updatedItems = activeReturnOrder.items.map(item => {
          if (item.productId === activeReturnItem.productId) {
            return {
              ...item,
              returnedQty: (item.returnedQty || 0) + returnQty
            };
          }
          return item;
        });

        // Did everything in the invoice get returned?
        const isAllReturned = updatedItems.every(item => (item.returnedQty || 0) >= item.quantity);
        const orderStatus = isAllReturned ? 'returned' : 'partially_returned';
        const newReturnedAmount = (activeReturnOrder.returnedAmount || 0) + totalRefundValue;

        // Write order change to Firestore
        const updatedOrder: SalesOrder = {
          ...activeReturnOrder,
          items: updatedItems,
          status: orderStatus,
          returnedAmount: Number(newReturnedAmount.toFixed(2))
        };

        // Standard Firestore setDoc
        await setDoc(doc(db, 'sales_orders', activeReturnOrder.id), sanitizeData(updatedOrder));

        // Put quantity back into the branch product stock
        const prod = products.find(p => p.id === activeReturnItem.productId);
        if (prod) {
          await setDoc(doc(db, 'products', prod.id), sanitizeData({
            ...prod,
            quantity: prod.quantity + returnQty,
            updatedAt: new Date().toISOString()
          }));
        }

        setReturnSuccess(lang === 'en' 
          ? `Successfully refunded ${returnQty}x of "${activeReturnItem.name}" totaling ${totalRefundValue.toFixed(2)} EGP.`
          : `تم بنجاح إرجاع عدد ${returnQty} من "${activeReturnItem.name}" وإعادة إجمالي ${totalRefundValue.toFixed(2)} ج.م للمشتري.`
        );
      } else {
        // Full Invoice refund
        let totalRefundValue = 0;
        
        // Return remaining goods to active inventory
        for (const item of activeReturnOrder.items) {
          const alreadyReturned = item.returnedQty || 0;
          const remainingToReturn = item.quantity - alreadyReturned;

          if (remainingToReturn > 0) {
            const unitRefundAmount = item.total / item.quantity;
            totalRefundValue += unitRefundAmount * remainingToReturn;

            const prod = products.find(p => p.id === item.productId);
            if (prod) {
              await setDoc(doc(db, 'products', prod.id), sanitizeData({
                ...prod,
                quantity: prod.quantity + remainingToReturn,
                updatedAt: new Date().toISOString()
              }));
            }
          }
        }

        // Tag every item inside the invoice as fully returned
        const updatedItems = activeReturnOrder.items.map(item => ({
          ...item,
          returnedQty: item.quantity
        }));

        const updatedOrder: SalesOrder = {
          ...activeReturnOrder,
          items: updatedItems,
          status: 'returned',
          returnedAmount: activeReturnOrder.total
        };

        await setDoc(doc(db, 'sales_orders', activeReturnOrder.id), sanitizeData(updatedOrder));

        setReturnSuccess(lang === 'en'
          ? `Successfully refunded full invoice "${activeReturnOrder.id}" with total refund of ${activeReturnOrder.total.toFixed(2)} EGP.`
          : `تم بنجاح إرجاع الفاتورة رقم "${activeReturnOrder.id}" بالكامل وإعادة ${activeReturnOrder.total.toFixed(2)} ج.م وموازنة المخزون.`
        );
      }

      // Automatically reset modal states or close on success delay
      setTimeout(() => {
        setReturnModalOpen(false);
        setActiveReturnOrder(null);
        setActiveReturnItem(null);
        setReturnQty(1);
        setReturnSuccess('');
        setReturnError('');
      }, 2000);

    } catch (err) {
      console.error(err);
      setReturnError(lang === 'en' ? 'Failed to process return in database.' : 'فشل تسجيل الارتجاع في قاعدة البيانات.');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)] select-none">
      
      {/* LEFT COMPARTMENT (COLUMNS 1 TO 7): PRODUCT CATALOG SEARCH */}
      <div className="lg:col-span-7 flex flex-col space-y-4 h-full">
        {/* FAST SCAN BARCODE PANEL */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-4 shrink-0">
          <div className="flex-grow">
            {!activeShift ? (
              <div className="flex items-center gap-2.5 text-[#DC2626] bg-[#FEF2F2] border border-[#FEE2E2] p-2.5 rounded-lg text-xs font-semibold">
                <AlertCircle size={16} />
                <span>
                  {lang === 'en' 
                    ? 'TERMINAL OFFLINE: Shift ledger (الوردية) is offline. Open shift to use POS cash register.' 
                    : 'محطة الكاشير مغلقة: الوردية الحالية غير نشطة. يرجى فتح وردية جديدة للاستخدام.'}
                </span>
              </div>
            ) : (
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-grow">
                  <Barcode size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="pos-barcode-simulator"
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder={
                      lang === 'en' 
                        ? 'SIMULATE SCANNER: Scan barcode or enter code and press ENTER...' 
                        : 'محاكي الباركود: امسح الرمز أو أدخل الكود واضغط ENTER...'
                    }
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-lg text-xs outline-none uppercase font-mono transition"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black hover:bg-black/90 text-white font-medium rounded-lg text-xs transition shrink-0"
                >
                  {lang === 'en' ? 'Scan Barcode' : 'مسح الرمز'}
                </button>
              </form>
            )}
          </div>

          <button
            type="button"
            onClick={() => setInvoiceHistoryOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
          >
            <History size={14} />
            {lang === 'en' ? 'Invoices & Returns' : 'الفواتير والمرتجعات'}
          </button>

          {/* Alert Feed-back status line */}
          <AnimatePresence>
            {scanMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-2.5 px-4 text-xs font-semibold rounded-lg border max-w-[280px] shrink-0 truncate ${
                  scanMessage.type === 'success' 
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]' 
                    : 'bg-[#FEF2F2] border-[#FEE2E2] text-[#DC2626] font-bold'
                }`}
              >
                {scanMessage.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CATALOG QUERY SELECTION PANEL */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col md:flex-row gap-3 shrink-0">
          {/* Text search */}
          <div className="relative flex-grow">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="pos-product-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Search items manually by description, tag or code...'
                  : 'البحث عن منتجات بالاسم، الرمز الباركود أو الوسم...'
              }
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-205 focus:border-black rounded-lg text-xs outline-none transition"
            />
          </div>

          {/* Quick selection category bar */}
          <div className="flex gap-1 overflow-x-auto max-w-full pb-1 pr-1 scrollbar-hide shrink-0 md:max-w-[320px]">
            {CATEGORIES.slice(0, 5).map(cat => {
              let catLabel = cat.split(' ')[0];
              if (lang === 'ar') {
                if (cat === 'All Categories') catLabel = 'الكل';
                else if (cat === 'Retail / Supermarket') catLabel = 'سوبرماركت';
                else if (cat === 'OTC Pharmacy') catLabel = 'صيدلية';
                else if (cat === 'General Care / Hygiene') catLabel = 'عناية';
                else if (cat === 'Prescription Rx') catLabel = 'روشتات';
              }
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition shrink-0 ${
                    selectedCategory === cat 
                      ? 'bg-black border-transparent text-white font-semibold' 
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-black'
                  }`}
                >
                  {catLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* CATALOG SELECT CARDS GRID */}
        <div 
          id="pos-catalog-grid" 
          tabIndex={0} 
          className="bg-gray-50/50 rounded-xl border border-[#E5E7EB] p-2.5 overflow-y-auto flex-1 max-h-[420px] lg:max-h-full focus:outline-hidden"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gridProducts.map(item => {
              const isOut = item.quantity <= 0;
              const isLow = item.quantity <= item.safetyStock;
              return (
                <motion.div
                  key={item.id}
                  layoutId={`grid-card-${item.id}`}
                  onClick={() => !isOut && activeShift && addToCart(item)}
                  className={`bg-white rounded-xl border p-3.5 cursor-pointer text-xs select-none transition flex flex-col justify-between h-[125px] ${
                    isOut 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' 
                      : !activeShift
                        ? 'cursor-not-allowed opacity-80 hover:border-gray-200 border-gray-100'
                        : 'border-[#E5E7EB] hover:border-black hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-semibold text-gray-900 line-clamp-2 leading-snug">{item.name}</span>
                    </div>
                    <span className="text-[9.5px] px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] font-mono rounded inline-block w-fit mt-1 uppercase font-medium">
                      {item.category.split('/')[0]}
                    </span>
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <div className="font-mono text-sm font-bold text-black">
                      {item.sellingPrice.toFixed(2)} {symbol}
                    </div>
                    
                    <div className="text-right">
                      {isOut ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-600 text-white rounded-full uppercase tracking-wider">
                          {lang === 'en' ? 'Out' : 'نفد'}
                        </span>
                      ) : isLow ? (
                        <span className="text-[9px] font-medium px-2 py-0.5 bg-[#FFFBEB] text-[#D97706] rounded-full border border-[#FEF3C7] font-mono">
                          {item.quantity} {lang === 'en' ? 'units' : 'وحدة'}
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-gray-400 font-mono">
                          {item.quantity} {lang === 'en' ? 'left' : 'متبقي'}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COMPARTMENT (COLUMNS 8 TO 12): SHOPPING CART PANEL */}
      <div id="pos-billing-cart" className="lg:col-span-12 xl:col-span-4 bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col justify-between h-full max-h-[calc(100vh-140px)]">
        
        {/* Header Summary */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-black" />
            <h3 className="font-semibold text-gray-900 text-sm">
              {lang === 'en' ? 'Active Cart Overview' : 'ملخص السلة النشطة'}
            </h3>
            <span className="bg-[#F3F4F6] text-black font-semibold px-2 py-0.5 rounded-full text-[10px] font-mono">
              {cart.reduce((a, b) => a + b.quantity, 0)} {lang === 'en' ? 'items' : 'منتجات'}
            </span>
          </div>
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="p-1 px-3 border border-gray-200 hover:border-[#DC2626] hover:text-[#DC2626] text-gray-400 hover:bg-[#FEF2F2] rounded-full text-[10px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {lang === 'en' ? 'Clear Ticket' : 'إلغاء التذكرة'}
          </button>
        </div>

        {/* Shopping Cart Items List Drawer */}
        <div 
          tabIndex={0} 
          className="flex-1 overflow-y-auto pr-1 my-3 space-y-2.5 min-h-0 focus:outline-hidden"
        >
          {cart.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-xs text-gray-400 py-10 font-sans text-center">
              <ShoppingCart className="w-8 h-8 text-gray-300 mb-2" />
              <span>{lang === 'en' ? 'Register cash cart empty.' : 'سلة معاملة الكاشير فارغة.'}</span>
              <p className="text-[10px] text-gray-400 mt-1">
                {lang === 'en' ? 'Select products or scan barcodes to begin' : 'اختر المنتجات أو امسح الباركود للبدء'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 space-y-2.5">
              {cart.map(item => {
                const itemTotal = item.product.sellingPrice * item.quantity - item.discount;
                return (
                  <div key={item.product.id} className="pt-2.5 first:pt-0 text-xs flex flex-row items-start justify-between gap-3 font-sans">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate" title={item.product.name}>{item.product.name}</h4>
                      <div className="flex gap-2 items-center mt-1 text-[10px] text-gray-500">
                        <span className="font-mono">{item.product.sellingPrice.toFixed(2)} {symbol} / {lang === 'en' ? 'unit' : 'وحدة'}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-gray-400">{lang === 'en' ? 'SKU: ' : 'كود: '}{item.product.barcode}</span>
                      </div>

                      {/* Line-item discount element */}
                      <div className="flex items-center gap-1.5 mt-1 font-sans">
                        <Percent size={10} className="text-black" />
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">
                          {lang === 'en' ? 'Item Disc:' : 'خصم المادة:'}
                        </span>
                        <input
                          type="number"
                          value={item.discount || ''}
                          placeholder="0"
                          onChange={(e) => updateItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-12 px-1 focus:border-black outline-none text-right rounded border border-gray-200 text-[10.5px] font-mono leading-tight"
                        />
                      </div>
                    </div>

                    {/* Adjusters */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-5 h-5 bg-gray-50 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-100 transition"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="font-bold text-gray-800 font-mono text-xs w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-5 h-5 bg-gray-50 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-100 transition"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-950">{itemTotal.toFixed(2)} {symbol}</span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-gray-400 hover:text-black transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MATH INVOICE SPECIFICATION DETAILS */}
        <div className="border-t border-gray-100 pt-3 shrink-0 space-y-2.5 font-sans">
          <div className="space-y-1.5 text-xs text-gray-600">
            {/* Subtotal */}
            <div className="flex justify-between font-medium">
              <span>{lang === 'en' ? 'Subtotal' : 'المجموع الفرعي'}</span>
              <span className="font-mono text-gray-800">{invoiceCalculations.subtotal.toFixed(2)} {symbol}</span>
            </div>

            {/* Individual input discount applied */}
            <div className="flex justify-between items-center text-[#DC2626]">
              <div className="flex items-center gap-1">
                <Percent size={12} />
                <span>{lang === 'en' ? 'Ticket Master Discount' : 'خصم الفاتورة الإجمالي'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold">{symbol}</span>
                <input
                  type="number"
                  value={overallDiscount || ''}
                  onChange={(e) => setOverallDiscount(Math.min(invoiceCalculations.subtotal, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-16 px-1.5 py-0.5 text-right border border-gray-200 focus:border-black rounded outline-none font-mono text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* GRAND TOTAL */}
          <div className="bg-black text-white rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {lang === 'en' ? 'Checkout Total' : 'إجمالي الفاتورة المستحق'}
              </p>
              <h2 className="text-xl font-mono font-bold text-white mt-0.5">
                {invoiceCalculations.total.toFixed(2)} {symbol}
              </h2>
            </div>
            
            <div className="flex flex-col gap-1 items-end">
              <span className="text-[9px] text-gray-400 font-mono">
                {lang === 'en' ? 'Select register mode' : 'تحديد طريقة الدفع'}
              </span>
              <div className="flex bg-[#222222] rounded-lg p-0.5 border border-[#333333] gap-0.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${paymentMethod === 'cash' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {lang === 'en' ? 'Cash' : 'نقدي الكاش'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('vodafone')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${paymentMethod === 'vodafone' ? 'bg-[#DC2626] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {lang === 'en' ? 'Vodafone Cash' : 'فودافون كاش'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${paymentMethod === 'card' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {lang === 'en' ? 'Card / Visa' : 'شبكة فيزا'}
                </button>
              </div>
            </div>
          </div>

          {/* VERIFY ACTIVE SHIFT ON CHECKOUT ACTION */}
          {!activeShift ? (
            <button
              disabled
              className="w-full py-2.5 bg-gray-105 text-gray-400 rounded-xl font-semibold text-xs cursor-not-allowed border border-gray-200"
            >
              {lang === 'en' ? '🔒 SHIFT OFFLINE: START REGISTER SESSION FIRST' : '🔒 الوردية مغلقة: يرجى بدء جلسة العمل وتفعيل الصندوق'}
            </button>
          ) : (
            <button
              onClick={() => setIsCheckingOut(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-black hover:bg-black/90 text-white rounded-xl font-bold text-xs transition duration-150 flex items-center justify-center gap-1.5"
            >
              <CreditCard size={15} />
              {lang === 'en' 
                ? `Process Sales Order Checkout (${invoiceCalculations.total.toFixed(2)} ${symbol})` 
                : `إتمام عملية البيع وطباعة الفاتورة (${invoiceCalculations.total.toFixed(2)} ${symbol})`}
            </button>
          )}
        </div>
      </div>

      {/* 2. CHECKOUT DIALOG MODAL (COMPUTES RETURNING CASH CHANGE) */}
      <AnimatePresence>
        {isCheckingOut && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl max-w-sm w-full overflow-hidden border border-[#E5E7EB]"
            >
              <div className="bg-black text-white p-5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                  {lang === 'en' ? 'Complete Sales Transaction' : 'إتمام معاملة البيع'}
                </h3>
                <button onClick={() => setIsCheckingOut(false)} className="text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-xs text-gray-500 font-medium">
                  {lang === 'en' ? 'Payment Method selected:' : 'طريقة الدفع المحددة:'} <span className="font-bold text-black uppercase">
                    {paymentMethod === 'cash' 
                      ? (lang === 'en' ? 'Cash' : 'كاش نقدي') 
                      : paymentMethod === 'vodafone'
                        ? (lang === 'en' ? 'Vodafone Cash' : 'فودافون كاش')
                        : (lang === 'en' ? 'Visa / Card' : 'فيزا / شبكة')}
                  </span>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">{lang === 'en' ? 'Invoice Due Total' : 'إجمالي الفاتورة المستحق'}</span>
                  <h3 className="text-xl font-bold text-black mt-1 font-mono">{invoiceCalculations.total.toFixed(2)} {symbol}</h3>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="space-y-1.5">
                    <label htmlFor="cash-received-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'Cash Received from Customer' : 'المبلغ النقدي المستلم من العميل'}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-gray-400 text-xs font-mono">{symbol}</span>
                      <input
                        id="cash-received-input"
                        type="number"
                        step="0.01"
                        autoFocus
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-12 pr-3 py-2 border border-gray-200 focus:border-black rounded-lg text-xs outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Return amount calculation */}
                {paymentMethod === 'cash' && amountPaid && (
                  <div className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] rounded-xl p-3 text-xs flex justify-between items-center">
                    <span className="font-semibold">{lang === 'en' ? 'Returning Cash (Change):' : 'المبلغ المتبقي (الفكة):'}</span>
                    <span className="text-sm font-bold font-mono">
                      {parseFloat(amountPaid) - invoiceCalculations.total >= 0 
                        ? `${(parseFloat(amountPaid) - invoiceCalculations.total).toFixed(2)} ${symbol}` 
                        : (lang === 'en' ? 'Insufficient payment' : 'المبلغ المستلم غير كافٍ')}
                    </span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setIsCheckingOut(false)}
                    className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-655 font-semibold rounded-lg text-xs transition"
                  >
                    {lang === 'en' ? 'Cancel' : 'إلغاء'}
                  </button>
                  <button
                    onClick={handleProcessCheckout}
                    disabled={paymentMethod === 'cash' && (!amountPaid || parseFloat(amountPaid) < invoiceCalculations.total)}
                    className="flex-grow py-1.5 bg-black hover:bg-black/90 text-white font-bold rounded-lg text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {lang === 'en' ? 'Checkout & Log Ticket' : 'إتمام وتسجيل الفاتورة'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. PRINT TICKET VIRTUAL RECEIPT MODAL */}
      <AnimatePresence>
        {lastPrintedInvoice && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-xl p-5 max-w-sm w-full overflow-hidden border border-[#E5E7EB] flex flex-col items-center space-y-4"
            >
              <div className="w-10 h-10 bg-[#ECFDF5] text-[#059669] rounded-full flex items-center justify-center border border-[#A7F3D0]">
                <CheckCircle size={22} />
              </div>

              <div className="text-center font-sans">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {lang === 'en' ? 'Sale Completed Successfully' : 'تمت عملية البيع بنجاح'}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'en' 
                    ? 'Stock deducted from inventory & logged to Shift ledger.' 
                    : 'تم خصم الأصناف من المستودع بنجاح وتسجيل العملية بالوردية.'}
                </p>
              </div>

              {/* TICKET MOCK VISUAL */}
              <div id="visual-invoice-receipt" className={`w-full bg-slate-50 border border-dashed border-gray-300 rounded p-4 text-left font-mono text-[10px] text-gray-700 space-y-3 ${lang === 'ar' ? 'text-right' : ''}`}>
                <div className="text-center font-bold text-xs uppercase text-gray-800 tracking-wider">
                  {lang === 'en' ? '*** SAHL PHARMACY & RETAIL ***' : '*** سهل - صيدلية وسوبرماركت ***'}
                </div>
                <div className="text-center text-[9px] text-gray-400">
                  {lang === 'en' ? 'DEVELOPMENT CLOUD RUN BRANCH' : 'فرع المحاكاة السحابية المتكاملة'}<br />
                  TERMINAL ID: #3000-A1 &bull; {lang === 'en' ? 'OFFLINE-FIRST PWA' : 'ميزة تصفح دون اتصال'}
                </div>

                <div className="border-t border-b border-gray-200 py-1 space-y-0.5 text-gray-500 text-[9px]">
                  <div>{lang === 'en' ? 'TICKET NO:' : 'رقم الفاتورة:'} {lastPrintedInvoice.id}</div>
                  <div>{lang === 'en' ? 'SHIFT ID:' : 'رقم الوردية:'} ...{lastPrintedInvoice.shiftId.slice(-6)}</div>
                  <div>{lang === 'en' ? 'CASHIER:' : 'الكاشير المسؤول:'} {lastPrintedInvoice.cashierName}</div>
                  <div>{lang === 'en' ? 'DATE:' : 'التاريخ والوقت:'} 2026-05-30 12:11 UTC</div>
                </div>

                {/* Items grid */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold border-b border-gray-200 pb-0.5">
                    <span>{lang === 'en' ? 'DESC [QTY]' : 'المنتج [الكمية]'}</span>
                    <span>{lang === 'en' ? 'TOTAL' : 'الإجمالي'}</span>
                  </div>
                  {lastPrintedInvoice.items.map(i => (
                    <div key={i.productId} className="flex justify-between">
                      <span className="truncate max-w-[190px]">{i.name} [{i.quantity}]</span>
                      <span>{i.total.toFixed(2)} {symbol}</span>
                    </div>
                  ))}
                </div>

                {/* Sum math details */}
                <div className="border-t border-dashed border-gray-300 pt-2 space-y-0.5 text-right font-semibold">
                  <div className="flex justify-between">
                    <span>{lang === 'en' ? 'Subtotal:' : 'المجموع الفرعي:'}</span>
                    <span>{lastPrintedInvoice.subtotal.toFixed(2)} {symbol}</span>
                  </div>
                  <div className="flex justify-between text-[#DC2626]">
                    <span>{lang === 'en' ? 'Discount:' : 'الخصم الكلي:'}</span>
                    <span>-{lastPrintedInvoice.discount.toFixed(2)} {symbol}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-900 border-t border-gray-200 pt-1 font-sans">
                    <span>{lang === 'en' ? 'NET GRAND:' : 'الصافي الكلي:'}</span>
                    <span>{lastPrintedInvoice.total.toFixed(2)} {symbol}</span>
                  </div>
                </div>

                <div className="text-[9px] text-gray-400 text-center font-bold tracking-wider pt-2">
                  {lang === 'en' ? 'PAYMENT RECOGNIZED:' : 'طريقة الدفع المعترف بها:'} {lastPrintedInvoice.paymentMethod === 'cash' ? (lang === 'en' ? 'CASH' : 'نقداً') : lastPrintedInvoice.paymentMethod === 'vodafone' ? (lang === 'en' ? 'VODAFONE CASH' : 'فودافون كاش') : (lang === 'en' ? 'CARD' : 'بطاقة')}
                </div>

                <div className="text-center text-[9px] text-gray-400 font-bold border-t border-gray-200 pt-2 flex items-center justify-center gap-1.5 font-sans">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span>{lang === 'en' ? 'TRANSACTION SECURED' : 'حماية الفواتير مفعلة'}</span>
                </div>
              </div>

              {/* Close */}
              <div className="w-full flex gap-3 font-sans">
                <button
                  onClick={() => setLastPrintedInvoice(null)}
                  className="w-full py-2 bg-black hover:bg-[#222222] text-white font-bold rounded-lg text-xs transition"
                >
                  {lang === 'en' ? 'Confirm & Open New Sale Transaction' : 'تأكيد وبدء معاملة بيع جديدة'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CASHIER INVOICE HISTORY & SEARCH OVERLAY */}
      <AnimatePresence>
        {invoiceHistoryOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-40 p-4 font-sans text-right">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl border border-gray-200 flex flex-col overflow-hidden text-right"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setInvoiceHistoryOpen(false)}
                  className="text-gray-400 hover:text-white transition cursor-pointer p-1 rounded-full hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base">
                    {lang === 'en' ? 'Invoice History & Product Returns' : 'سجل الفواتير والمرتجعات - الكاشير'}
                  </h3>
                  <History size={20} className="text-emerald-400" />
                </div>
              </div>

              {/* Modal Body - Search and Scroll Container */}
              <div className="p-5 flex-grow overflow-hidden flex flex-col space-y-4">
                {/* Search query box */}
                <div className="relative shrink-0">
                  <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={invoiceHistorySearch}
                    onChange={(e) => setInvoiceHistorySearch(e.target.value)}
                    placeholder={
                      lang === 'en'
                        ? 'Search invoices by receipt token, product name or barcode, cash/card...'
                        : 'البحث في الفواتير برقم الفاتورة، اسم المنتج أو كود الباركود، طريقة دفع...'
                    }
                    className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg text-xs outline-none transition text-right"
                  />
                </div>

                {/* Scrollable list of results */}
                <div className="flex-grow overflow-y-auto pr-1 space-y-4">
                  {orders.filter(order => {
                    if (!invoiceHistorySearch.trim()) return true;
                    const query = invoiceHistorySearch.toLowerCase().trim();
                    const matchesId = order.id.toLowerCase().includes(query);
                    const matchesStatus = order.status.toLowerCase().includes(query);
                    const matchesPayment = order.paymentMethod.toLowerCase().includes(query);
                    const matchesProduct = order.items.some(item => item.name.toLowerCase().includes(query));
                    return matchesId || matchesStatus || matchesPayment || matchesProduct;
                  }).length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs font-semibold">
                      {lang === 'en' ? 'No sales receipts found matching your search.' : 'لم يتم العثور على أي فواتير تطابق البحث الحالي.'}
                    </div>
                  ) : (
                    orders.filter(order => {
                      if (!invoiceHistorySearch.trim()) return true;
                      const query = invoiceHistorySearch.toLowerCase().trim();
                      const matchesId = order.id.toLowerCase().includes(query);
                      const matchesStatus = order.status.toLowerCase().includes(query);
                      const matchesPayment = order.paymentMethod.toLowerCase().includes(query);
                      const matchesProduct = order.items.some(item => item.name.toLowerCase().includes(query));
                      return matchesId || matchesStatus || matchesPayment || matchesProduct;
                    }).map((order) => {
                      const isReturnedFull = order.status === 'returned';
                      const isReturnedPartial = order.status === 'partially_returned';
                      
                      return (
                        <div 
                          key={order.id} 
                          className={`bg-white border rounded-xl p-4 transition duration-150 shadow-xs hover:shadow-md ${
                            isReturnedFull 
                              ? 'border-red-150 bg-red-50/5' 
                              : isReturnedPartial 
                              ? 'border-amber-150 bg-amber-50/5' 
                              : 'border-gray-200'
                          }`}
                        >
                          {/* Invoice top summary metadata */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 flex-row-reverse text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-gray-900 bg-gray-100 px-2 py-1 rounded select-all">{order.id}</span>
                              <span className="text-gray-400 font-bold">{lang === 'en' ? 'Ticket ID:' : 'رقم الفاتورة:'}</span>
                            </div>

                            <div className="flex items-center gap-1.5 font-bold font-mono text-gray-500">
                              <span>{new Date(order.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                            </div>

                            <div className="flex items-center gap-2 flex-row-reverse">
                              {isReturnedFull && (
                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                                  {lang === 'en' ? 'Fully Returned' : 'مرتجع الفاتورة بالكامل'}
                                </span>
                              )}
                              {isReturnedPartial && (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                  <span>{lang === 'en' ? 'Partially Returned' : 'مرتجع جزئي'}</span>
                                  {order.returnedAmount && (
                                    <span className="font-mono">({order.returnedAmount.toFixed(2)} EGP)</span>
                                  )}
                                </span>
                              )}
                              {!isReturnedFull && !isReturnedPartial && (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                                  {lang === 'en' ? 'Settled & Paid' : 'مدفوعة بالكامل'}
                                </span>
                              )}
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono">
                                {order.paymentMethod === 'vodafone' ? 'VODAFONE CASH' : order.paymentMethod}
                              </span>
                            </div>
                          </div>

                          {/* Invoice purchased items breakdown list */}
                          <div className="py-3 space-y-2 text-right overflow-x-auto">
                            <table className="w-full text-right text-xs min-w-[500px]">
                              <thead>
                                <tr className="text-gray-400 font-extrabold border-b border-gray-100 pb-1 flex-row-reverse">
                                  <th className="py-1 text-right">{lang === 'en' ? 'Product Description / Name' : 'اسم الصنف أو المنتج البائع'}</th>
                                  <th className="py-1 text-center w-24">{lang === 'en' ? 'Original Qty' : 'الكمية الأصلية'}</th>
                                  <th className="py-1 text-center w-24">{lang === 'en' ? 'Returned Qty' : 'الكمية المسترجعة'}</th>
                                  <th className="py-1 text-left w-28">{lang === 'en' ? 'Effective Price' : 'إجمالي السعر الفعلي'}</th>
                                  <th className="py-1 text-left w-20"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => {
                                  const alreadyReturned = item.returnedQty || 0;
                                  const matchesFilter = !invoiceHistorySearch.trim() || item.name.toLowerCase().includes(invoiceHistorySearch.toLowerCase().trim());
                                  
                                  return (
                                    <tr 
                                      key={item.productId} 
                                      className={`border-b border-gray-50/50 hover:bg-gray-50/50 ${
                                        alreadyReturned >= item.quantity 
                                          ? 'text-gray-400 line-through' 
                                          : matchesFilter 
                                          ? 'font-bold' 
                                          : 'text-gray-600'
                                      }`}
                                    >
                                      <td className="py-2 text-right">
                                        <div className="font-extrabold text-xs">{item.name}</div>
                                        <div className="text-[9px] text-gray-400 font-mono tracking-wide">{item.barcode}</div>
                                      </td>
                                      <td className="py-2 text-center font-mono font-medium">{item.quantity}</td>
                                      <td className="py-2 text-center font-mono text-red-600 font-bold">{alreadyReturned}</td>
                                      <td className="py-2 text-left font-mono font-black text-gray-900">
                                        {item.total.toFixed(2)} {symbol}
                                      </td>
                                      <td className="py-2 text-left">
                                        {alreadyReturned < item.quantity && !isReturnedFull && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveReturnOrder(order);
                                              setActiveReturnItem(item);
                                              setReturnQty(1);
                                              setReturnModalOpen(true);
                                              setReturnError('');
                                              setReturnSuccess('');
                                            }}
                                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-extrabold transition cursor-pointer"
                                          >
                                            {lang === 'en' ? 'Refund Spec' : 'إرجاع صنف'}
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Invoice totals and full refund button */}
                          <div className="flex flex-row-reverse flex-wrap items-center justify-between pt-3 border-t border-gray-100 text-xs">
                            <div className="flex gap-4 font-extrabold text-sm text-gray-900">
                              <div className="flex gap-1 flex-row-reverse">
                                <span className="font-mono text-emerald-600">{(order.total - (order.returnedAmount || 0)).toFixed(2)} {symbol}</span>
                                <span className="text-gray-500">{lang === 'en' ? 'Net Paid:' : 'الصافي الحالي:'}</span>
                              </div>
                              <div className="flex gap-1 border-r border-gray-200 pr-4 flex-row-reverse">
                                <span className="font-mono text-gray-400">{order.total.toFixed(2)} {symbol}</span>
                                <span className="text-gray-400 font-bold">{lang === 'en' ? 'Original Total:' : 'إجمالي الفاتورة الاصلي:'}</span>
                              </div>
                            </div>

                            {!isReturnedFull && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReturnOrder(order);
                                  setActiveReturnItem(null);
                                  setReturnQty(1);
                                  setReturnModalOpen(true);
                                  setReturnError('');
                                  setReturnSuccess('');
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1"
                              >
                                <RotateCcw size={12} />
                                {lang === 'en' ? 'Refund Entire Invoice' : 'إرجاع واسترداد كامل الفاتورة'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-4 border-t border-gray-100 shrink-0 flex items-center justify-end font-sans">
                <button
                  type="button"
                  onClick={() => setInvoiceHistoryOpen(false)}
                  className="px-5 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-extrabold text-gray-700 transition cursor-pointer"
                >
                  {lang === 'en' ? 'Close' : 'إغلاق المتصفح'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RETURN & REFUND CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {returnModalOpen && activeReturnOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-right">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden transform transition-all text-right"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="text-gray-400 hover:text-white transition cursor-pointer p-0.5 rounded hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  {activeReturnItem 
                    ? (lang === 'en' ? 'Refunding Individual Item' : 'إرجاع صنف من الفاتورة')
                    : (lang === 'en' ? 'Refunding Entire Invoice' : 'إرجاع واسترداد كامل الفاتورة')
                  }
                  <RotateCcw size={16} className="text-amber-400" />
                </h3>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Reference invoice */}
                <div className="flex justify-between items-center bg-gray-50 border border-gray-100 p-2 rounded-lg text-xs flex-row-reverse">
                  <span className="font-mono font-bold text-gray-900 select-all">{activeReturnOrder.id}</span>
                  <span className="text-gray-400 font-bold">{lang === 'en' ? 'Invoice Number:' : 'رقم الفاتورة المرجعية:'}</span>
                </div>

                {activeReturnItem ? (
                  // Item Specific Return UI
                  <div className="space-y-4 font-sans text-xs text-right">
                    <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-lg space-y-1.5 text-right">
                      <div className="font-extrabold text-gray-900 text-sm">{activeReturnItem.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{activeReturnItem.barcode}</div>
                      <div className="flex justify-between items-center pt-1 text-[11px] border-t border-amber-100/50 flex-row-reverse">
                        <span className="font-mono font-bold text-gray-900">
                          {(activeReturnItem.total / activeReturnItem.quantity).toFixed(2)} EGP
                        </span>
                        <span className="text-gray-400 font-semibold">{lang === 'en' ? 'Unit Purchase Price:' : 'سعر شراء القطعة الفعلي:'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] flex-row-reverse">
                        <span className="font-mono font-bold text-gray-900 text-right">
                          {activeReturnItem.quantity - (activeReturnItem.returnedQty || 0)} {lang === 'en' ? 'units' : 'قطع'}
                        </span>
                        <span className="text-gray-400 font-semibold">{lang === 'en' ? 'Available to Return:' : 'الكمية القابلة للإرجاع:'}</span>
                      </div>
                    </div>

                    {/* Quantity selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-750 text-right">
                        {lang === 'en' ? 'Select Quantity to Return:' : 'حدد الكمية المطلوب إرجاعها:'}
                      </label>
                      <div className="flex items-center gap-3 justify-center">
                        <button
                          type="button"
                          onClick={() => setReturnQty(q => Math.min(activeReturnItem.quantity - (activeReturnItem.returnedQty || 0), q + 1))}
                          className="p-2 border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition font-bold text-lg w-10 h-10 flex items-center justify-center cursor-pointer select-none"
                        >
                          +
                        </button>
                        <input
                          type="text"
                          readOnly
                          value={returnQty}
                          className="border border-gray-300 rounded-lg text-center font-black text-sm w-20 h-10 outline-none bg-gray-50 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setReturnQty(q => Math.max(1, q - 1))}
                          className="p-2 border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition font-bold text-lg w-10 h-10 flex items-center justify-center cursor-pointer select-none"
                        >
                          -
                        </button>
                      </div>
                    </div>

                    {/* Refund preview banner */}
                    <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-lg flex justify-between items-center text-emerald-800 flex-row-reverse">
                      <span className="font-mono font-black text-sm">
                        {((activeReturnItem.total / activeReturnItem.quantity) * returnQty).toFixed(2)} EGP
                      </span>
                      <span className="text-xs font-bold text-right">
                        {lang === 'en' ? 'Total Refund Amount:' : 'إجمالي القيمة المالية المستردة للمشتري:'}
                      </span>
                    </div>
                  </div>
                ) : (
                  // Full Invoice Refund UI
                  <div className="space-y-3 text-xs text-right text-gray-600">
                    <p className="leading-relaxed">
                      {lang === 'en'
                        ? 'Are you sure you want to refund the entire invoice? All remaining quantities of products will be automatically returned to store inventory stock, and the invoice will be fully settled.'
                        : 'هل أنت متأكد من رغبتك في إسترجاع الفاتورة كاملة؟ سيتم إعادة كافة كميات المنتجات المتبقية إلى المخزون تلقائياً وإرجاع كامل المبلغ للزبون.'
                      }
                    </p>

                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex justify-between items-center text-rose-800 flex-row-reverse">
                      <span className="font-mono font-black text-sm">
                        {(activeReturnOrder.total - (activeReturnOrder.returnedAmount || 0)).toFixed(2)} EGP
                      </span>
                      <span className="text-xs font-bold">
                        {lang === 'en' ? 'Total Refund Amount:' : 'إجمالي المبلغ المسترد للمشتري:'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status responses */}
                {returnError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold leading-normal text-right">
                    {returnError}
                  </div>
                )}

                {returnSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-extrabold leading-normal text-right">
                    {returnSuccess}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center gap-3 justify-end font-sans">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  disabled={isRefunding}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : 'إلغاء الإجراء'}
                </button>
                
                <button
                  type="button"
                  onClick={handleProcessReturn}
                  disabled={isRefunding || !!returnSuccess}
                  className={`px-5 py-2 text-xs font-black rounded-lg text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeReturnItem 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  } disabled:opacity-50`}
                >
                  {isRefunding ? (
                    <span className="animate-spin text-white">⚙️</span>
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  {lang === 'en' ? 'Confirm Return' : 'تأكيد إرجاع البضاعة'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
