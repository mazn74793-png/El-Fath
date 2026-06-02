import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit, 
  Phone, 
  UserCheck, 
  Coins, 
  AlertTriangle, 
  Printer, 
  Check, 
  X,
  FileText,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { RepairOrder } from '../types';

interface RepairsProps {
  repairs: RepairOrder[];
  onAddRepair: (repair: Omit<RepairOrder, 'id' | 'receivedDate' | 'updatedAt'>) => void;
  onUpdateRepair: (repair: RepairOrder) => void;
  onDeleteRepair: (id: string) => void;
  lang: 'en' | 'ar';
  activeShopId: string;
}

export default function Repairs({
  repairs,
  onAddRepair,
  onUpdateRepair,
  onDeleteRepair,
  lang,
  activeShopId
}: RepairsProps) {
  // Filter repairs belonging to current shop
  const shopRepairs = useMemo(() => {
    return repairs.filter(r => r.shopId === activeShopId);
  }, [repairs, activeShopId]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'ready' | 'delivered'>('all');
  
  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairOrder | null>(null);
  
  // Repair form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [problemDetails, setProblemDetails] = useState('');
  const [partsNeeded, setPartsNeeded] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [isDepositPaid, setIsDepositPaid] = useState(true);
  const [status, setStatus] = useState<RepairOrder['status']>('pending');
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  // Repair detail modal view (Print tags & receipts)
  const [viewingRepair, setViewingRepair] = useState<RepairOrder | null>(null);

  // Quick select devices in Arabic/English
  const commonDevices = lang === 'ar' 
    ? ['مروحة', 'مكنسة', 'ديسبنسر', 'كاتيل (غلاية)', 'خلاط', 'مكواة', 'فرن كهربائي', 'ميكروويف']
    : ['Fan', 'Vacuum Cleaner', 'Water Dispenser', 'Kettle', 'Blender', 'Iron', 'Electric Oven', 'Microwave'];

  // Open modal for editing
  const handleEditClick = (repair: RepairOrder) => {
    setEditingRepair(repair);
    setClientName(repair.clientName);
    setClientPhone(repair.clientPhone);
    setDeviceName(repair.deviceName);
    setProblemDetails(repair.problemDetails);
    setPartsNeeded(repair.partsNeeded || '');
    setCost(repair.cost);
    setDeposit(repair.deposit);
    setIsDepositPaid(repair.isDepositPaid);
    setStatus(repair.status);
    setNotes(repair.notes || '');
    setExpectedDeliveryDate(repair.expectedDeliveryDate || '');
    setIsModalOpen(true);
  };

  // Open modal for adding
  const handleAddClick = () => {
    setEditingRepair(null);
    setClientName('');
    setClientPhone('');
    setDeviceName('');
    setProblemDetails('');
    setPartsNeeded('');
    setCost(0);
    setDeposit(0);
    setIsDepositPaid(true);
    setStatus('pending');
    setNotes('');
    
    // Set default delivery date to 2 days from now
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    setExpectedDeliveryDate(twoDaysLater.toISOString().split('T')[0]);
    
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !deviceName) {
      alert(lang === 'ar' ? 'من فضلك املأ البيانات الأساسية (اسم العميل - الهاتف - نوع الجهاز)' : 'Please fill in basic fields (Customer Name, Phone, and Device Name)');
      return;
    }

    if (editingRepair) {
      onUpdateRepair({
        ...editingRepair,
        clientName,
        clientPhone,
        deviceName,
        problemDetails,
        partsNeeded,
        cost,
        deposit,
        isDepositPaid,
        status,
        notes,
        expectedDeliveryDate,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddRepair({
        clientName,
        clientPhone,
        deviceName,
        problemDetails,
        partsNeeded,
        cost,
        deposit,
        isDepositPaid,
        status,
        notes,
        expectedDeliveryDate,
        shopId: activeShopId
      });
    }
    setIsModalOpen(false);
  };

  // Quick State Transitions
  const handleQuickStatusChange = (repair: RepairOrder, nextStatus: RepairOrder['status']) => {
    onUpdateRepair({
      ...repair,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    });
  };

  // Instant delivery + settle logic
  const handleDeliverAndSettle = (repair: RepairOrder) => {
    onUpdateRepair({
      ...repair,
      status: 'delivered',
      isDepositPaid: true,
      notes: repair.notes ? repair.notes + ` | تم التسليم الكامل والتسوية` : 'تم تسليم الجهاز وتصفية المبلغ',
      updatedAt: new Date().toISOString()
    });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let ready = 0;
    let delivered = 0;
    let totalDeposits = 0;
    let remainingCollectable = 0;

    shopRepairs.forEach(r => {
      if (r.status === 'pending') pending++;
      else if (r.status === 'in_progress') inProgress++;
      else if (r.status === 'ready') ready++;
      else if (r.status === 'delivered') delivered++;

      totalDeposits += r.deposit;
      if (r.status !== 'delivered') {
        remainingCollectable += (r.cost - r.deposit);
      }
    });

    return { pending, inProgress, ready, delivered, totalDeposits, remainingCollectable };
  }, [shopRepairs]);

  // Alert Notifications Generation
  const alerts = useMemo(() => {
    const list: { id: string; type: 'delay' | 'ready_uncollected'; messageAr: string; messageEn: string; repair: RepairOrder }[] = [];
    const now = new Date();

    shopRepairs.forEach(r => {
      const receivedDate = new Date(r.receivedDate);
      const diffTime = Math.abs(now.getTime() - receivedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Alert 1: Device in 'pending' or 'in_progress' state for over 3 days (Delay)
      if ((r.status === 'pending' || r.status === 'in_progress') && diffDays >= 3) {
        list.push({
          id: `delay-${r.id}`,
          type: 'delay',
          messageAr: `⚠️ تأخير: الجهاز "${r.deviceName}" للعميل ${r.clientName} مستلم منذ ${diffDays} أيام ولم يتم إصلاحه بعد!`,
          messageEn: `⚠️ Delay: Device "${r.deviceName}" of client ${r.clientName} has been received ${diffDays} days ago and is not yet fixed!`,
          repair: r
        });
      }

      // Alert 2: Device 'ready' for over 4 days but not collected
      if (r.status === 'ready' && diffDays >= 4) {
        list.push({
          id: `ready-${r.id}`,
          type: 'ready_uncollected',
          messageAr: `📞 تنبيه تواصل: جهاز "${r.deviceName}" للعميل ${r.clientName} جاهز للإستلام منذ فترة، يرجى الاتصال به على: ${r.clientPhone}`,
          messageEn: `📞 Reminder: Device "${r.deviceName}" of ${r.clientName} is ready, customer should be contacted: ${r.clientPhone}`,
          repair: r
        });
      }
    });

    return list;
  }, [shopRepairs]);

  // Filter Repairs by Search and Tab
  const filteredRepairs = useMemo(() => {
    return shopRepairs.filter(r => {
      const matchesSearch = 
        r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clientPhone.includes(searchTerm) ||
        r.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.problemDetails.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [shopRepairs, searchTerm, statusFilter]);

  const printReceipt = (repair: RepairOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>${lang === 'ar' ? 'إيصال استلام صيانة' : 'Repair Receipt'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; text-align: ${lang === 'ar' ? 'right' : 'left'}; color: #222; }
            .header { text-align: center; border-bottom: 2px dashed #999; padding-bottom: 12px; margin-bottom: 18px; }
            .header h1 { margin: 4px 0; font-size: 22px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 14px; }
            .info-table td.label { font-weight: bold; width: 35%; color: #555; }
            .financials { background: #f8f9fa; padding: 12px; border-radius: 8px; text-align: center; margin-top: 20px; border: 1.5px solid #ddd; }
            .financial-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; }
            .total { font-weight: bold; font-size: 18px; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #777; border-top: 1px dashed #ccc; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${lang === 'ar' ? 'الفتح الأجهزة المنزلية والصيانة' : 'Al-Fath Home Appliances Repair'}</h1>
            <p style="margin: 2px 0; font-size: 12px;">إيصال استلام جهاز وإثبات عربون</p>
          </div>
          <table class="info-table">
            <tr>
              <td class="label">${lang === 'ar' ? 'رقم الإيصال:' : 'Receipt ID:'}</td>
              <td>REPAIR-${repair.id.substring(0, 8).toUpperCase()}</td>
            </tr>
            <tr>
              <td class="label">${lang === 'ar' ? 'اسم العميل:' : 'Customer Name:'}</td>
              <td style="font-weight: bold;">${repair.clientName}</td>
            </tr>
            <tr>
              <td class="label">${lang === 'ar' ? 'رقم الهاتف:' : 'Phone Number:'}</td>
              <td>${repair.clientPhone}</td>
            </tr>
            <tr>
              <td class="label">${lang === 'ar' ? 'الجهاز والنوع:' : 'Device & Model:'}</td>
              <td style="font-weight: bold; color: #111;">${repair.deviceName}</td>
            </tr>
            <tr>
              <td class="label">${lang === 'ar' ? 'المشكلة والعطل:' : 'Problem Details:'}</td>
              <td>${repair.problemDetails}</td>
            </tr>
            <tr>
              <td class="label">${lang === 'ar' ? 'قطع الغيار المقترحة:' : 'Parts Needed:'}</td>
              <td>${repair.partsNeeded || (lang === 'ar' ? 'لم تنحدد بعد' : 'Not specified yet')}</td>
            </tr>
            <tr>
              <td class="label">${lang === 'ar' ? 'تاريخ الاستلام:' : 'Date Received:'}</td>
              <td>${new Date(repair.receivedDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
            </tr>
            <tr>
              <td class="label">${lang === 'ar' ? 'الاستلام المتوقع:' : 'Expected Ready:'}</td>
              <td>${repair.expectedDeliveryDate ? new Date(repair.expectedDeliveryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '-'}</td>
            </tr>
          </table>

          <div class="financials">
            <div class="financial-row">
              <span>${lang === 'ar' ? 'التكلفة الإجمالية التقديرية:' : 'Estimated Cost:'}</span>
              <span style="font-weight: bold;">${repair.cost} EGP</span>
            </div>
            <div class="financial-row">
              <span>${lang === 'ar' ? 'العربون المدفوع:' : 'Deposit Paid:'}</span>
              <span style="color: green; font-weight: bold;">${repair.deposit} EGP ${repair.isDepositPaid ? (lang === 'ar' ? '(تم الدفع)' : '(Paid)') : ''}</span>
            </div>
            <div class="financial-row total">
              <span>${lang === 'ar' ? 'المتبقي عند الاستلام:' : 'Remaining Balance:'}</span>
              <span style="color: red; font-weight: bold;">${repair.cost - repair.deposit} EGP</span>
            </div>
          </div>

          <div class="footer">
            <p>${lang === 'ar' ? 'يرجى الاحتفاظ بهذا الإيصال لتسليم الجهاز.' : 'Please keep this receipt to claim your device.'}</p>
            <p>${lang === 'ar' ? 'نشكركم على ثقتكم في محل الفتح' : 'Thank you for choosing Al-Fath Service Centre'}</p>
          </div>
          <script>
            window.print();
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Wrench size={22} />
            </span>
            {lang === 'ar' ? 'إدارة صيانة الأجهزة والعملاء' : 'Device Maintenance & Repairs'}
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            {lang === 'ar' 
              ? 'تسجيل الأجهزة المستلمة للصيانة من العملاء (مراوح، مكانس، كاتيل، دسبنسر) ومتابعة سداد العربون والتسليم.'
              : 'Log incoming customer repairs (fans, vacuum cleaners, kettles, dispensers) and track deposits and completion states.'}
          </p>
        </div>
        
        <button
          onClick={handleAddClick}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-md shadow-indigo-100 uppercase"
        >
          <Plus size={16} />
          {lang === 'ar' ? 'استلام جهاز جديد' : 'Receive New Repair'}
        </button>
      </div>

      {/* Smart Alerts Box */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
            <AlertTriangle size={18} className="text-amber-600 animate-pulse" />
            <span>{lang === 'ar' ? 'تنبيهات وإشعارات هامة للمتابعة:' : 'Important Active Action Alerts:'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
            {alerts.map(alert => (
              <div 
                key={alert.id} 
                className="bg-white/80 border border-amber-100 p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs hover:bg-white transition"
              >
                <div className="flex-1 text-[#4B5563]">
                  {lang === 'ar' ? alert.messageAr : alert.messageEn}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEditClick(alert.repair)}
                    className="p-1 px-2 border border-gray-200 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium text-[10px]"
                  >
                    {lang === 'ar' ? 'تحديث' : 'Update'}
                  </button>
                  <a
                    href={`tel:${alert.repair.clientPhone}`}
                    className="p-1 border border-indigo-150 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                    title={lang === 'ar' ? 'اتصال بالعميل' : 'Call Customer'}
                  >
                    <Phone size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">{lang === 'ar' ? 'قيد الانتظار' : 'Pending Start'}</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><Clock size={15} /></span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.pending}</p>
          <div className="text-[10px] text-gray-400 mt-1">{lang === 'ar' ? 'بانتظار الفحص' : 'Awaiting inspection'}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">{lang === 'ar' ? 'قيد الإصلاح' : 'In Progress'}</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Wrench size={15} /></span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.inProgress}</p>
          <div className="text-[10px] text-gray-400 mt-1">{lang === 'ar' ? 'تحت الصيانة الفعلية' : 'Being worked on'}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">{lang === 'ar' ? 'جاهز للتسليم' : 'Ready (Fixed)'}</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><CheckCircle2 size={15} /></span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.ready}</p>
          <div className="text-[10px] text-gray-400 mt-1">{lang === 'ar' ? 'بانتظار حضور العميل' : 'Awaiting retrieval'}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50/20 to-transparent shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">{lang === 'ar' ? 'مبالغ مستلمة متبقية' : 'Pending Balances'}</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Coins size={15} /></span>
          </div>
          <p className="text-lg font-black text-emerald-700 mt-2">{stats.remainingCollectable} <span className="text-[10px] font-bold text-gray-500">EGP</span></p>
          <div className="text-[10px] text-gray-400 mt-1">{lang === 'ar' ? 'مستحقة للدفع في المحل' : 'Due upon pickup'}</div>
        </div>
      </div>

      {/* Main Grid: Filters & Search bar */}
      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Quick Filter Buttons */}
          <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-hide shrink-0 max-w-full">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition shrink-0 ${
                statusFilter === 'all' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'} ({shopRepairs.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'pending' 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-stone-50 text-rose-600 hover:bg-rose-50'
              }`}
            >
              <Clock size={13} />
              {lang === 'ar' ? 'قيد الانتظار' : 'Pending'} ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'in_progress' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-stone-50 text-amber-600 hover:bg-amber-50'
              }`}
            >
              <Wrench size={13} />
              {lang === 'ar' ? 'قيد الإصلاح' : 'In Progress'} ({stats.inProgress})
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'ready' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <CheckCircle2 size={13} />
              {lang === 'ar' ? 'جاهز للتسليم' : 'Ready'} ({stats.ready})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'delivered' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <UserCheck size={13} />
              {lang === 'ar' ? 'تم التسليم' : 'Delivered'} ({stats.delivered})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث باسم العميل، هاتف، أو اسم ونوع الجهاز...' : 'Search by client, phone, or device model...'}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-600/50 bg-[#FAFAFA]"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black ${lang === 'ar' ? 'left-3' : 'right-3'}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Repair Orders List */}
        {filteredRepairs.length === 0 ? (
          <div className="text-center py-12 bg-[#FAFAFA] rounded-xl border border-dashed border-gray-200">
            <Wrench size={32} className="mx-auto text-gray-300 animate-pulse mb-3" />
            <p className="text-xs text-gray-400 font-bold">
              {lang === 'ar' ? 'لا توجد أجهزة صيانة مطابقة لبحثك في المتجر.' : 'No maintenance orders matching your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRepairs.map(order => {
              const remaining = order.cost - order.deposit;
              const isOverdue = order.status !== 'delivered' && order.expectedDeliveryDate && new Date(order.expectedDeliveryDate) < new Date();

              return (
                <div 
                  key={order.id}
                  className={`border rounded-2xl p-4.5 bg-white shadow-xs transition hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    order.status === 'delivered' 
                      ? 'border-gray-200 bg-[#FAFAFA] opacity-80' 
                      : order.status === 'ready' 
                      ? 'border-indigo-200 bg-indigo-50/15' 
                      : isOverdue 
                      ? 'border-rose-200 bg-rose-50/10' 
                      : 'border-slate-200'
                  }`}
                  onClick={() => handleEditClick(order)}
                >
                  {/* Status Banner Tag */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded-full ${
                        order.status === 'pending'
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : order.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-600 border border-amber-100'
                          : order.status === 'ready'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {order.status === 'pending' && (lang === 'ar' ? 'قيد الانتظار ⏳' : 'Awaiting ⏳')}
                        {order.status === 'in_progress' && (lang === 'ar' ? 'قيد الصيانة ⚙️' : 'Repairing ⚙️')}
                        {order.status === 'ready' && (lang === 'ar' ? 'جاهز للتسليم 💚' : 'Ready 💚')}
                        {order.status === 'delivered' && (lang === 'ar' ? 'تم التسليم 🤝' : 'Delivered 🤝')}
                      </span>

                      {isOverdue && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-extrabold animate-pulse">
                          {lang === 'ar' ? 'تجاوز موعد التسليم!' : 'Overdue!'}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-gray-400">
                      ID: REPAIR-{order.id.slice(0, 5).toUpperCase()}
                    </div>
                  </div>

                  {/* Main Details */}
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <span className="text-gray-400 font-normal">[{order.deviceName}]</span>
                      <span className="text-indigo-700">{order.clientName}</span>
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone size={13} className="text-gray-400" />
                        <a 
                          href={`tel:${order.clientPhone}`} 
                          onClick={(e) => e.stopPropagation()} 
                          className="hover:underline font-semibold"
                        >
                          {order.clientPhone}
                        </a>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                        <Calendar size={12} />
                        <span>
                          {lang === 'ar' ? 'المستلم:' : 'Rcved:'} {new Date(order.receivedDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#F9FAFB] rounded-xl p-3 border border-gray-200/60 mt-2 space-y-1">
                      <p className="text-xs text-gray-700 flex items-start gap-1">
                        <span className="font-bold shrink-0">{lang === 'ar' ? 'المشكلة:' : 'Issue:'}</span>
                        <span className="line-clamp-2">{order.problemDetails}</span>
                      </p>
                      {order.partsNeeded && (
                        <p className="text-xs text-amber-700 flex items-start gap-1">
                          <span className="font-bold shrink-0">{lang === 'ar' ? 'الغيار المطلوب:' : 'Parts:'}</span>
                          <span className="line-clamp-2">{order.partsNeeded}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financials Row */}
                  <div className="mt-4.5 pt-3.5 border-t border-dashed border-gray-100 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="text-gray-400 font-medium">
                        {lang === 'ar' ? 'الإجمالي المتوقع:' : 'Estimated total:'} <span className="font-bold text-gray-800">{order.cost} EGP</span>
                      </div>
                      <div className="text-rose-600 font-bold flex items-center gap-1.5">
                        {lang === 'ar' ? 'المتبقي:' : 'Due amount:'} <span>{remaining} EGP</span>
                        {order.deposit > 0 && (
                          <span className="text-[10px] font-medium text-emerald-600">
                            ({lang === 'ar' ? `مخصوم عربون ${order.deposit}` : `deposit ${order.deposit} deducted`})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Interactive Actions */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleQuickStatusChange(order, 'in_progress')}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] rounded-lg border border-amber-200 transition"
                        >
                          {lang === 'ar' ? 'بدء صيانة ⚡' : 'Start Fix ⚡'}
                        </button>
                      )}

                      {order.status === 'in_progress' && (
                        <button
                          onClick={() => handleQuickStatusChange(order, 'ready')}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition"
                        >
                          {lang === 'ar' ? 'جاهز للتسليم ✅' : 'Mark Ready ✅'}
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          onClick={() => handleDeliverAndSettle(order)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition shadow-xs"
                          title={lang === 'ar' ? 'استلام النقدية وتسليم الجهاز' : 'Deliver and Settle remaining payment'}
                        >
                          {lang === 'ar' ? 'تسليم وتحصيل 💰' : 'Deliver & Pay 💰'}
                        </button>
                      )}

                      <button
                        onClick={() => printReceipt(order)}
                        className="p-1 px-2 border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black rounded-lg transition bg-white"
                        title={lang === 'ar' ? 'طباعة إيصال الصيانة' : 'Print Receipt'}
                      >
                        <Printer size={13} />
                      </button>

                      <button
                        onClick={() => handleEditClick(order)}
                        className="p-1 px-2 border border-gray-200 hover:bg-gray-50 text-indigo-600 hover:text-indigo-800 rounded-lg transition bg-white"
                        title={lang === 'ar' ? 'تعديل البيانات' : 'Edit Order'}
                      >
                        <Edit size={13} />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الصيانة نهائياً؟' : 'Are you sure you want to delete this repair order?')) {
                            onDeleteRepair(order.id);
                          }
                        }}
                        className="p-1 px-2 border border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition bg-white"
                        title={lang === 'ar' ? 'حذف الإيصال' : 'Delete Order'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insert / Update Dialogue Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-100" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <Wrench className="text-indigo-600" size={18} />
                {editingRepair 
                  ? (lang === 'ar' ? `تعديل صيانة: REPAIR-${editingRepair.id.substring(0, 5).toUpperCase()}` : `Edit Repair REPAIR-${editingRepair.id.substring(0, 5)}`)
                  : (lang === 'ar' ? 'استلام وتسجيل جهاز عميل جديد' : 'Record New Customer Repair')}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-150 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    {lang === 'ar' ? 'اسم العميل *' : 'Customer Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: محمد أحمد علي' : 'e.g. John Doe'}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    {lang === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Device and specific template buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  {lang === 'ar' ? 'نوع واسم الجهاز المستلم *' : 'Device Type & Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: مروحة تورنيدو عمود، مكنسة توشيبا، ديسبنسر' : 'e.g. Tornado Fan, Philips Iron'}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                
                {/* Micro-Buttons for Quick Appliance Selector */}
                <div className="flex flex-wrap gap-1 mt-1 pb-1">
                  {commonDevices.map((dev) => (
                    <button
                      key={dev}
                      type="button"
                      onClick={() => setDeviceName(dev)}
                      className="px-2.5 py-1 text-[10px] bg-indigo-50/50 hover:bg-indigo-150 text-indigo-700 font-semibold rounded-md border border-indigo-100 transition whitespace-nowrap"
                    >
                      {dev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Diagnostic Details */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  {lang === 'ar' ? 'تفاصيل عطل الجهاز ومشكلته *' : 'Diagnostic / Fault Details *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={problemDetails}
                  onChange={(e) => setProblemDetails(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب ما يشتكي منه العميل بدقة... (مثال: الملس لا يدور، يصدر صوت زنين، الموتور محروق)' : 'Describe actual issue... (e.g. Motor burned, wire broken, no power)'}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  {lang === 'ar' ? 'قطع الغيار واللوازم المطلوبة صنفها' : 'Spare Parts Required'}
                </label>
                <input
                  type="text"
                  value={partsNeeded}
                  onChange={(e) => setPartsNeeded(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: جلبة مروحة، ملف نحاس، ريلي كباس' : 'e.g. New fan blades, copper coils'}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Financial Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    {lang === 'ar' ? 'التكلفة الإجمالية (ج.م)' : 'Total Cost Price (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    {lang === 'ar' ? 'العربون المدفوع (ج.م)' : 'Advance Deposit (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs font-extrabold text-gray-700 pb-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDepositPaid}
                      onChange={(e) => setIsDepositPaid(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{lang === 'ar' ? 'تم تحصيل العربون' : 'Deposit Settled'}</span>
                  </label>
                </div>
              </div>

              {/* Expected Delivery Date and Current Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    {lang === 'ar' ? 'حالة أمر الصيانة' : 'Repair Status'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RepairOrder['status'])}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="pending">{lang === 'ar' ? 'قيد الانتظار (في المطبخ/الورشة)' : 'Pending Inspection'}</option>
                    <option value="in_progress">{lang === 'ar' ? 'بدأ العمل صيانة وإصلاح' : 'Repair in Progress'}</option>
                    <option value="ready">{lang === 'ar' ? 'تم الإصلاح بنجاح (جاهز)' : 'Completed & Ready'}</option>
                    <option value="delivered">{lang === 'ar' ? 'تم تسليم العميل وتصفية الحساب' : 'Completed & Delivered'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    {lang === 'ar' ? 'ميعاد الاستلام المتوقع' : 'Expected Pickup Date'}
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* General Admin Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  {lang === 'ar' ? 'ملاحظات وتفاصيل إضافية' : 'Additional Notes / Spare Brand'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب ماركة الجهاز، البلد المصنعة، أو ملحوظة كفالة...' : 'e.g. Toshiba original parts used, 3 months trial guarantee'}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer"
                >
                  {editingRepair ? (lang === 'ar' ? 'تحديث الفاتورة' : 'Update Repair') : (lang === 'ar' ? 'حفظ واستلام' : 'Save & Print')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
