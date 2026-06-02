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
  X
} from 'lucide-react';
import { Product, CartItem, SalesOrder, Shift } from '../types';
import { CATEGORIES } from '../data';

interface POSProps {
  products: Product[];
  activeShift: Shift | null;
  onCheckout: (order: Omit<SalesOrder, 'id' | 'createdAt'>) => void;
  onNavigate: (tab: string) => void;
  lang?: 'en' | 'ar';
  currencySymbol?: string;
}

export default function POS({ products, activeShift, onCheckout, onNavigate, lang = 'en', currencySymbol }: POSProps) {
  const symbol = currencySymbol || (lang === 'ar' ? 'ج.م' : 'EGP');
  // Cart items state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Scanned input & Search filter
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Checkout modifiers
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  
  // Checkout Modal State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [lastPrintedInvoice, setLastPrintedInvoice] = useState<SalesOrder | null>(null);

  // Status message for barcode scan feedback
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'err' } | null>(null);

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

    const taxRate = 0.05; // 5% VAT
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const grandTotal = Math.max(0, parseFloat((subtotal + tax - overallDiscount).toFixed(2)));

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
      const matchesCat = selectedCategory === 'All Categories' || p.category === selectedCategory;
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
              <span>{lang === 'en' ? 'Subtotal (Before taxes)' : 'المجموع الفرعي (قبل الضريبة)'}</span>
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

            {/* Applied 5% VAT Sales Tax */}
            <div className="flex justify-between text-gray-500">
              <span>{lang === 'en' ? 'Sales VAT tax (5.0%)' : 'ضريبة القيمة المضافة ومبيعات (5.0%)'}</span>
              <span className="font-mono">{invoiceCalculations.tax.toFixed(2)} {symbol}</span>
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
              <div className="flex bg-[#222222] rounded-lg p-0.5 border border-[#333333]">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${paymentMethod === 'cash' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {lang === 'en' ? 'Cash' : 'نقدي'} (نقدي)
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${paymentMethod === 'card' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {lang === 'en' ? 'Card' : 'شبكة'} (فيزا)
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
                    {paymentMethod === 'cash' ? (lang === 'en' ? 'Cash' : 'نقدي') : (lang === 'en' ? 'Card' : 'شبكة/فيزا')}
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
                  <div className="flex justify-between font-medium">
                    <span>{lang === 'en' ? 'Tax (5.0%):' : 'الضريبة (٥.٠٪):'}</span>
                    <span>{lastPrintedInvoice.tax.toFixed(2)} {symbol}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-900 border-t border-gray-200 pt-1">
                    <span>{lang === 'en' ? 'NET GRAND:' : 'الصافي الكلي:'}</span>
                    <span>{lastPrintedInvoice.total.toFixed(2)} {symbol}</span>
                  </div>
                </div>

                <div className="text-[9px] text-gray-400 text-center font-bold tracking-wider pt-2">
                  {lang === 'en' ? 'PAYMENT RECOGNIZED:' : 'طريقة الدفع المعترف بها:'} {lastPrintedInvoice.paymentMethod === 'cash' ? (lang === 'en' ? 'CASH' : 'نقداً') : (lang === 'en' ? 'CARD' : 'بطاقة')}
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

    </div>
  );
}
