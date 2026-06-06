/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Calendar, 
  AlertTriangle, 
  Check, 
  Sparkles, 
  DollarSign, 
  Layers,
  Archive,
  Barcode,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';
import { Product } from '../types';
import { CATEGORIES } from '../data';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  activeShiftId: string | null;
  lang?: 'en' | 'ar';
  currencySymbol?: string;
}

export default function Inventory({ products, onAddProduct, onUpdateProduct, onDeleteProduct, activeShiftId, lang = 'en', currencySymbol }: InventoryProps) {
  const symbol = currencySymbol || (lang === 'ar' ? 'ج.م' : 'EGP');
  // Filters & Searching State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'expiring'>('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form values
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('OTC Analgesics');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [safetyStock, setSafetyStock] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  // Date setup
  const today = new Date('2026-05-30');

  // 1. FILTERING ENGINE
  const filteredProducts = useMemo(() => {
    return products.filter(item => {
      // Search search terms
      const matchesSearch = 
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        item.barcode.includes(search);

      // Category match
      const matchesCategory = 
        selectedCategory === 'All Categories' || 
        item.category === selectedCategory;

      // Warnings filters
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = item.quantity <= item.safetyStock;
      } else if (stockFilter === 'expiring') {
        if (!item.expirationDate) {
          matchesStock = false;
        } else {
          const expDate = new Date(item.expirationDate);
          const diffTime = expDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          matchesStock = diffDays <= 60; // 60 days near expiration
        }
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, selectedCategory, stockFilter]);

  // Handle Create or Edit Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode || !sellingPrice || !quantity || !safetyStock) {
      alert('Please fill out all required invoice master fields!');
      return;
    }

    const payload: Omit<Product, 'id' | 'updatedAt'> = {
      name,
      barcode,
      category,
      costPrice: costPrice ? parseFloat(costPrice) : 0,
      sellingPrice: parseFloat(sellingPrice),
      quantity: parseFloat(quantity),
      safetyStock: parseFloat(safetyStock),
    };

    if (expirationDate) {
      payload.expirationDate = expirationDate;
    }

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        ...payload,
        updatedAt: new Date().toISOString()
      };
      if (!expirationDate) {
        delete updated.expirationDate;
      }
      onUpdateProduct(updated);
    } else {
      onAddProduct(payload);
    }

    resetForm();
  };

  const startEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setBarcode(prod.barcode);
    setCategory(prod.category);
    setCostPrice(prod.costPrice ? prod.costPrice.toString() : '');
    setSellingPrice(prod.sellingPrice.toString());
    setQuantity(prod.quantity.toString());
    setSafetyStock(prod.safetyStock.toString());
    setExpirationDate(prod.expirationDate || '');
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setName('');
    setBarcode('');
    setCategory('OTC Analgesics');
    setCostPrice('');
    setSellingPrice('');
    setQuantity('');
    setSafetyStock('');
    setExpirationDate('');
    setIsFormOpen(false);
  };

  // Fast quantities increment / decrement inline
  const adjustStock = (prod: Product, amount: number) => {
    const newQty = Math.max(0, prod.quantity + amount);
    onUpdateProduct({
      ...prod,
      quantity: newQty,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 id="inventory-heading" className="text-2xl font-semibold tracking-tight text-gray-901">
            {lang === 'en' ? 'Inventory & Catalog Master' : 'كتالوج ودليل المخزون الرئيسي'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'en' ? 'Configure retail stock, pharmacy barcodes, and cost controls' : 'تكوين مخزون التجزئة، الصيدلية، الأسعار والتحكم في الكلفة'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/90 text-white font-medium rounded-lg text-sm transition"
        >
          <Plus size={16} />
          {lang === 'en' ? 'Create New Product' : 'إضافة منتج جديد'}
        </button>
      </div>

      {/* SEARCH AND FILTERS LAYER */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'en'
                ? 'Search by Brand, SKU barcode, pharmaceutical name...'
                : 'البحث عن طريق الاسم، كود الباركود، أو الوصف الطبي...'
            }
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-lg text-sm outline-none transition"
          />
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-3 font-sans">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-605">
            <Filter size={13} className="text-gray-400 font-bold" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-gray-700 cursor-pointer text-xs"
            >
              {CATEGORIES.map(cat => {
                let catLabel = cat;
                if (lang === 'ar') {
                  if (cat === 'All Categories') catLabel = 'جميع الفئات';
                  else if (cat === 'Retail / Supermarket') catLabel = 'التجزئة / السوبرماركت';
                  else if (cat === 'OTC Pharmacy') catLabel = 'أدوية عامة';
                  else if (cat === 'General Care / Hygiene') catLabel = 'العناية والنظافة';
                  else if (cat === 'Prescription Rx') catLabel = 'أدوية الوصفات الطبية';
                }
                return <option key={cat} value={cat}>{catLabel}</option>;
              })}
            </select>
          </div>

          {/* Quick Warning Filter Badges */}
          <div className="flex items-center bg-gray-100 border border-gray-200 text-xs rounded-lg p-1 font-sans">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition ${stockFilter === 'all' ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {lang === 'en' ? 'All Items' : 'جميع المواد'}
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${stockFilter === 'low' ? 'bg-[#FEF2F2] text-[#DC2626] font-semibold border border-[#FEE2E2]' : 'text-gray-500 hover:text-[#DC2626]'}`}
            >
              <AlertTriangle size={12} className="text-[#DC2626] shrink-0" />
              {lang === 'en' ? 'Low Stock' : 'روشك نفادها'}
            </button>
            <button
              onClick={() => setStockFilter('expiring')}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${stockFilter === 'expiring' ? 'bg-[#FFFBEB] text-[#D97706] font-semibold border border-[#FEF3C7]' : 'text-gray-500 hover:text-[#D97706]'}`}
            >
              <Calendar size={12} className="text-[#D97706] shrink-0" />
              {lang === 'en' ? 'Expiring' : 'منتهية الصلاحية'}
            </button>
          </div>
        </div>
      </div>

      {/* CATALOGUE TABLE VIEW */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-5">{lang === 'en' ? 'Invoice Reference' : 'إسم المنتج / المادة'}</th>
                <th className="py-4 px-4">{lang === 'en' ? 'Financial Sector' : 'الفئة'}</th>
                <th className="py-4 px-4 text-right">{lang === 'en' ? 'Cost Price' : 'تكلفة الشراء'}</th>
                <th className="py-4 px-4 text-right">{lang === 'en' ? 'Retail Out' : 'سعر المبيع الرسمي'}</th>
                <th className="py-4 px-4 text-right">{lang === 'en' ? 'Gross Margin' : 'هامش الربح'}</th>
                <th className="py-4 px-4 text-center">{lang === 'en' ? 'In Stock' : 'المستودع المتوفر'}</th>
                <th className="py-4 px-4">{lang === 'en' ? 'Expiry Monitor' : 'مراقبة الصلاحية'}</th>
                <th className="py-4 px-5 text-center">{lang === 'en' ? 'Operations' : 'خيارات التحكم'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-gray-400">
                    <Archive className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <span>{lang === 'en' ? 'No product files match your active filters' : 'لا يوجد منتجات تطابق خيارات التصفية النشطة'}</span>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  // Margin computation
                  const profitRatio = prod.sellingPrice > 0 
                    ? ((prod.sellingPrice - prod.costPrice) / prod.sellingPrice) * 100 
                    : 0;

                  // Expiry calculations
                  let expiryBadge = null;
                  if (prod.expirationDate) {
                    const exp = new Date(prod.expirationDate);
                    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff < 0) {
                      expiryBadge = (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-600 text-white rounded">
                          EXPIRED ({Math.abs(diff)}d)
                        </span>
                      );
                    } else if (diff <= 30) {
                      expiryBadge = (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded border border-rose-200">
                          CRITICAL ({diff}d)
                        </span>
                      );
                    } else if (diff <= 60) {
                      expiryBadge = (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          Warning ({diff}d)
                        </span>
                      );
                    } else {
                      expiryBadge = (
                        <span className="text-[10px] text-gray-500 font-mono">
                          {prod.expirationDate}
                        </span>
                      );
                    }
                  } else {
                    expiryBadge = <span className="text-[10px] text-gray-300 italic font-mono">Consumable</span>;
                  }

                  const isLow = prod.quantity <= prod.safetyStock;

                  return (
                    <motion.tr 
                      key={prod.id} 
                      layoutId={`item-row-${prod.id}`}
                      className="text-xs hover:bg-gray-50/50 transition"
                    >
                      {/* Name & Barcode */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-gray-901 transition truncate max-w-[240px]" title={prod.name}>
                          {prod.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-gray-400">
                          <Barcode size={10} className="text-gray-400 shrink-0" />
                          <span>{prod.barcode}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 bg-gray-50 border border-gray-200/60 rounded-full font-medium text-gray-500 inline-block text-[10.5px]">
                          {prod.category}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-gray-650">
                        {prod.costPrice.toFixed(2)} {symbol}
                      </td>

                      {/* Retail Selling */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                        {prod.sellingPrice.toFixed(2)} {symbol}
                      </td>

                      {/* Margin % */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10.5px] border ${profitRatio >= 30 ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'}`}>
                          {profitRatio.toFixed(0)}%
                        </span>
                      </td>

                      {/* Quantity in Stock */}
                      <td className="py-3.5 px-4 text-center select-none font-mono">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => adjustStock(prod, -1)}
                            className="w-5 h-5 bg-gray-50 text-gray-600 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-100 transition active:scale-95 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${isLow ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]' : 'text-gray-900 border-transparent'}`}>
                            {prod.quantity}
                          </span>
                          <button
                            onClick={() => adjustStock(prod, 1)}
                            className="w-5 h-5 bg-gray-50 text-gray-600 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-100 transition active:scale-95 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        {isLow && (
                          <div className="text-[9px] text-[#DC2626] font-semibold mt-1 uppercase tracking-wide">
                            {lang === 'en' ? `Below ${prod.safetyStock} limit` : `أقل من حد الأمان ${prod.safetyStock}`}
                          </div>
                        )}
                      </td>

                      {/* Expiration date */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          {expiryBadge}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(prod)}
                            title={lang === 'en' ? 'Edit Product' : 'تعديل المنتج'}
                            className="p-1 px-1.5 bg-white border border-[#E5E7EB] hover:border-black hover:bg-black hover:text-white text-gray-500 transition rounded-lg"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => {
                              const msg = lang === 'en' 
                                ? `Confirm permanent deletion file: ${prod.name}?` 
                                : `هل تؤكد حذف منتج: ${prod.name} نهائياً؟`;
                              if (confirm(msg)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            title={lang === 'en' ? 'Delete File' : 'حذف السجل'}
                            className="p-1 px-1.5 bg-white border border-[#E5E7EB] hover:border-black hover:bg-black hover:text-white text-gray-500 transition rounded-lg"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT SLIDEOUT / DIALOG */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-xl border border-[#E5E7EB] max-w-lg w-full overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-black text-white p-5 flex items-center justify-between">
                <div>
                  <h3 id="form-heading" className="text-xs font-bold tracking-tight uppercase font-mono text-gray-400">
                    {editingProduct 
                      ? (lang === 'en' ? 'Update Stock File' : 'تعديل بيانات الصنف')
                      : (lang === 'en' ? 'Establish Master Product Record' : 'إنشاء سجل منتج رئيسي جديد')}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {editingProduct ? editingProduct.name : (lang === 'en' ? 'Configure invoice specifications and safety sensors' : 'تعيين تفاصيل الفوترة وحدود المخزون والباركود')}
                  </p>
                </div>
                <button onClick={resetForm} className="text-gray-400 hover:text-white transition">
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
                {/* Brand Name */}
                <div className="space-y-1">
                  <label htmlFor="prod-name-input" className="text-xs font-semibold text-gray-700">
                    {lang === 'en' ? 'Brand Name / Label *' : 'اسم المنتج / العلامة التجارية *'}
                  </label>
                  <input
                    id="prod-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g., Augmentin 1g Tabs or Fresh Milk 1L' : 'مثال: أوجمنتين ١ جرام أو حليب طازج ١ لتر'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black transition text-left"
                  />
                </div>

                {/* Barcode & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="prod-barcode-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'UPC / EAN Barcode *' : 'رمز الباركود / الكود الدولي *'}
                    </label>
                    <input
                      id="prod-barcode-input"
                      type="text"
                      required
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g., 622003847283"
                      disabled={!!editingProduct} // Barcodes are immutable after establishment
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black transition disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prod-category-select" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'Inventory Category *' : 'فئة الصنف في المخزن *'}
                    </label>
                    <select
                      id="prod-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black bg-white cursor-pointer select-none"
                    >
                      {CATEGORIES.filter(c => c !== 'All Categories').map(cat => {
                        let catLabel = cat;
                        if (lang === 'ar') {
                          if (cat === 'Retail / Supermarket') catLabel = 'التجزئة / السوبرماركت';
                          else if (cat === 'OTC Pharmacy') catLabel = 'أدوية عامة';
                          else if (cat === 'General Care / Hygiene') catLabel = 'العناية والنظافة';
                          else if (cat === 'Prescription Rx') catLabel = 'أدوية الوصفات الطبية';
                        }
                        return <option key={cat} value={cat}>{catLabel}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Cost price & Selling Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="prod-cost-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'Cost Price (Wholesale) (Optional)' : 'سعر الشراء / التكلفة (اختياري)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{symbol}</span>
                      <input
                        id="prod-cost-input"
                        type="number"
                        step="0.01"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-12 pr-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prod-selling-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'Selling Price (POS Out) *' : 'سعر البيع الافتراضي *'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{symbol}</span>
                      <input
                        id="prod-selling-input"
                        type="number"
                        step="0.01"
                        required
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-12 pr-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Stock Quantity & Safety stock level */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="prod-qty-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'On-Hand Quantity *' : 'الكمية المتوفرة حالياً *'}
                    </label>
                    <input
                      id="prod-qty-input"
                      type="number"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g., 50"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prod-safety-input" className="text-xs font-semibold text-gray-700">
                      {lang === 'en' ? 'Safety Threshold Limit *' : 'حد الأمان للمخزون *'}
                    </label>
                    <input
                      id="prod-safety-input"
                      type="number"
                      required
                      value={safetyStock}
                      onChange={(e) => setSafetyStock(e.target.value)}
                      placeholder="e.g., 10"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                    />
                  </div>
                </div>

                {/* Pharmacy Expiration date */}
                <div className="space-y-1">
                  <label htmlFor="prod-exp-input" className="text-xs font-semibold text-gray-700 flex justify-between items-center">
                    <span>{lang === 'en' ? 'Expiration Date' : 'تاريخ انتهاء الصلاحية'}</span>
                    <span className="text-[10px] text-amber-600 font-semibold font-mono">
                      {lang === 'en' ? 'Pharmacy Compliance Trigger' : 'مطابقة معايير جودة الصيدليات'}
                    </span>
                  </label>
                  <input
                    id="prod-exp-input"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-black focus:ring-1 focus:ring-black bg-white"
                  />
                  <p className="text-[10px] text-gray-400">
                    {lang === 'en' 
                      ? 'Leave empty for retail and supermarket non-perishable goods.' 
                      : 'اتركه فارغاً بالنسبة للمواد الاستهلاكية غير القابلة للتلف مثل السلع غير الصيدلانية.'}
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 justify-end pt-3 border-t border-gray-100 font-sans">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-655 font-semibold rounded-lg text-xs transition"
                  >
                    {lang === 'en' ? 'Discard Changes' : 'إلغاء التغييرات'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-black/90 text-white font-semibold rounded-lg text-xs transition"
                  >
                    {editingProduct 
                      ? (lang === 'en' ? 'Commit Updates' : 'حفظ التعديلات') 
                      : (lang === 'en' ? 'Publish Product' : 'إدراج المنتج')}
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
