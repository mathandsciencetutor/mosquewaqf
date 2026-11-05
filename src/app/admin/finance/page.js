'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Building2, 
  Wallet, 
  PlusCircle, 
  Search, 
  Printer, 
  LogOut, 
  X, 
  RotateCcw, 
  BookOpen, 
  PieChart, 
  ChevronRight, 
  FolderPlus, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight,
  CreditCard,
  FileCheck,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Landmark,
  CalendarDays
} from 'lucide-react';

// ইংরেজি সংখ্যাকে বাংলায় রূপান্তর
function toBengaliNumber(num) {
  if (num === undefined || num === null || num === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[d]);
}

// টাকায় রূপান্তর (কমা সহ)
function toBengaliCurrency(amount) {
  if (!amount) return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const n = Number(amount) || 0;
  return n.toLocaleString('en-IN').replace(/\d/g, (d) => banglaDigits[d]);
}

// লোকাল ডেট ফরমেটার (YYYY-MM-DD)
const getLocalYYYYMMDD = (dateObj) => {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
};

const bnSafeStyle = {
  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif",
  display: 'inline-block',
  lineHeight: '1.4'
};

// প্রাথমিক ডিফল্ট খরচের খাতসমূহ (Expense Heads)
const DEFAULT_EXPENSE_HEADS = [
  'সিমেন্ট ক্রয়',
  'রড ও স্টিল ক্রয়',
  'বালি ও পাথর ক্রয়',
  'ইট ক্রয়',
  'রাজমিস্ত্রি ও রডমিস্ত্রি মজুরি',
  'ইলেকট্রিক ও স্যানিটারি সামগ্রী',
  'যন্ত্রপাতি ও সাইট সরঞ্জাম ভাড়া',
  'মাটি কাটা ও পাইলিং খরচ',
  'পরিবহন ও আনলোডিং খরচ',
  'ব্যাংকে নগদ জমা (Bank Deposit)',
  'সাইট অফিস ও পেটি ক্যাশ',
  'অন্যান্য বিবিধ খরচ'
];

// প্রাথমিক ডিফল্ট জমার খাতসমূহ (Income / Inflow Heads)
const DEFAULT_INCOME_HEADS = [
  'ওয়াকফ এস্টেট মূল ফান্ড',
  'সাধারণ ডোনারদের অনুদান',
  'চাঁদা ও অনুদান (ডোনার পেজ)',
  'ব্যাংক হতে নগদ উত্তোলন (Bank Withdraw)',
  'মসজিদ পরিচালনা কমিটির অনুদান',
  'স্ক্র্যাপ ও নির্মাণ সামগ্রী বিক্রয়',
  'বিশেষ ঋণ বা অগ্রিম তহবিল',
  'অন্যান্য ক্যাশ ইন'
];

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState([]);
  const [customExpenseHeads, setCustomExpenseHeads] = useState([]);
  const [customIncomeHeads, setCustomIncomeHeads] = useState([]);
  
  // মডাল ও ভিউ স্টেট
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState(null); 
  const [showAddHeadModal, setShowAddHeadModal] = useState(false);
  const [newHeadType, setNewHeadType] = useState('Debit');
  const [newHeadInput, setNewHeadInput] = useState('');
  
  // লেজার ভিউ কন্ট্রোল 
  const [ledgerMode, setLedgerMode] = useState('Debit');
  const [selectedLedgerHead, setSelectedLedgerHead] = useState(null);
  
  // ফিল্টার স্টেট
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, Today, Week, Month
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // পেজিনেশন স্টেট
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, dateFilter]);

  // প্রিন্ট স্টেট
  const [selectedPrintVoucher, setSelectedPrintVoucher] = useState(null);
  const [isPrintingLedger, setIsPrintingLedger] = useState(false);
  const [isPrintingCashBook, setIsPrintingCashBook] = useState(false);

  // ভাউচার এন্ট্রি ফরম স্টেট
  const [formData, setFormData] = useState({
    voucherType: 'Debit',
    date: new Date().toISOString().split('T')[0],
    head: 'সিমেন্ট ক্রয়',
    amount: '',
    recipient: '',
    paymentMethod: 'ক্যাশ',
    bankOrChequeInfo: '',
    receiptRef: '',
    note: '',
    status: 'Approved'
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        await Promise.all([fetchVouchers(), fetchCustomHeads()]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // ভাউচার ও ডোনার ডাটা একত্রে লোড করা
  const fetchVouchers = async () => {
    try {
      const q = query(collection(db, 'vouchers'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const donorSnap = await getDocs(collection(db, 'donors'));
      const donorVouchers = [];
      
      donorSnap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.installments && Array.isArray(d.installments)) {
          d.installments.forEach((inst, idx) => {
            donorVouchers.push({
              id: `donor-${docSnap.id}-${idx}`,
              voucherNo: `${d.donorId || 'WQF'}-${idx+1}`,
              voucherType: 'Credit',
              date: inst.date || d.entryDate || new Date().toISOString().split('T')[0],
              head: 'চাঁদা ও অনুদান (ডোনার পেজ)',
              amount: Number(inst.amount) || 0,
              recipient: d.name,
              paymentMethod: 'ক্যাশ',
              bankOrChequeInfo: '',
              receiptRef: `বই: ${inst.bookNo || d.bookNo || '-'}, রশিদ: ${inst.receiptNo || d.receiptNo || '-'}`,
              note: inst.note || 'ডোনার পেজ হতে সংগ্রহ',
              status: 'Approved',
              isDonorEntry: true
            });
          });
        }
      });

      const combinedList = [...list, ...donorVouchers].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      setVouchers(combinedList);
    } catch (err) {
      console.error('ভাউচার লোড ত্রুটি:', err);
    }
  };

  // ডেটাবেস থেকে অতিরিক্ত খাতসমূহ লোড
  const fetchCustomHeads = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'finance_heads'));
      const expList = [];
      const incList = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.type === 'Credit') {
          incList.push({ id: d.id, name: data.name });
        } else {
          expList.push({ id: d.id, name: data.name });
        }
      });
      setCustomExpenseHeads(expList);
      setCustomIncomeHeads(incList);
    } catch (err) {
      console.error('খাত লোড ত্রুটি:', err);
    }
  };

  const allExpenseHeads = Array.from(new Set([
    ...DEFAULT_EXPENSE_HEADS,
    ...customExpenseHeads.map(h => h.name),
    ...vouchers.filter(v => v.voucherType === 'Debit' && v.head).map(v => v.head)
  ]));

  const allIncomeHeads = Array.from(new Set([
    ...DEFAULT_INCOME_HEADS,
    ...customIncomeHeads.map(h => h.name),
    ...vouchers.filter(v => v.voucherType === 'Credit' && v.head).map(v => v.head)
  ]));

  // নতুন খাত যুক্ত করার ফাংশন
  const handleAddNewHead = async (e) => {
    e.preventDefault();
    const trimmed = newHeadInput.trim();
    if (!trimmed) return;

    try {
      const docRef = await addDoc(collection(db, 'finance_heads'), {
        name: trimmed,
        type: newHeadType,
        createdAt: serverTimestamp()
      });

      if (newHeadType === 'Credit') {
        setCustomIncomeHeads(prev => [...prev, { id: docRef.id, name: trimmed }]);
        if (formData.voucherType === 'Credit') setFormData(prev => ({ ...prev, head: trimmed }));
      } else {
        setCustomExpenseHeads(prev => [...prev, { id: docRef.id, name: trimmed }]);
        if (formData.voucherType === 'Debit') setFormData(prev => ({ ...prev, head: trimmed }));
      }
    } catch (err) {
      console.error('খাত সেভ ত্রুটি:', err);
    }

    setNewHeadInput('');
    setShowAddHeadModal(false);
  };

  // কাস্টম খাত চিরতরে মুছে ফেলার ফাংশন
  const handleDeleteHead = async (headName, type) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে '${headName}' খাতটি সম্পূর্ণ মুছে ফেলতে চান?`)) return;
    
    try {
      const headList = type === 'Debit' ? customExpenseHeads : customIncomeHeads;
      const headObj = headList.find(h => h.name === headName);
      
      if (headObj && headObj.id) {
        await deleteDoc(doc(db, 'finance_heads', headObj.id));
        await fetchCustomHeads();
        
        if (selectedLedgerHead === headName) setSelectedLedgerHead(null);
        
        // যদি ফর্মে ওই খাতটি সিলেক্ট করা থাকে, তবে ডিফল্ট খাতে রিসেট করা
        if (formData.head === headName) {
          setFormData(prev => ({
            ...prev,
            head: type === 'Debit' ? DEFAULT_EXPENSE_HEADS[0] : DEFAULT_INCOME_HEADS[0]
          }));
        }
      }
    } catch (err) {
      console.error('খাত মুছতে ত্রুটি:', err);
    }
  };

  // নতুন ভাউচার সংরক্ষণ বা এডিট আপডেট
  const handleAddVoucher = async (e) => {
    e.preventDefault();
    try {
      if (editingVoucherId) {
        const voucherRef = doc(db, 'vouchers', editingVoucherId);
        await updateDoc(voucherRef, {
          voucherType: formData.voucherType,
          date: formData.date,
          head: formData.head,
          amount: Number(formData.amount) || 0,
          recipient: formData.recipient,
          paymentMethod: formData.paymentMethod,
          bankOrChequeInfo: formData.bankOrChequeInfo || '',
          receiptRef: formData.receiptRef,
          note: formData.note
        });
      } else {
        const nextSerial = 1001 + vouchers.filter(v => !v.isDonorEntry).length;
        const voucherNo = formData.voucherType === 'Debit' ? `DV-${nextSerial}` : `CV-${nextSerial}`;

        const newVoucher = {
          ...formData,
          voucherNo,
          amount: Number(formData.amount) || 0,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'vouchers'), newVoucher);
      }

      handleResetForm();
      setShowVoucherModal(false);
      await fetchVouchers();
    } catch (err) {
      console.error('ভাউচার সেভ ত্রুটি:', err);
    }
  };

  // ভাউচার ডিলিট করা
  const handleDeleteVoucher = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ভাউচারটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'vouchers', id));
      setVouchers(prevVouchers => prevVouchers.filter(v => v.id !== id));
      await fetchVouchers(); 
    } catch (err) {
      console.error('ভাউচার ডিলিট ত্রুটি:', err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const voucherRef = doc(db, 'vouchers', id);
      await updateDoc(voucherRef, { status: newStatus });
      await fetchVouchers();
    } catch (err) {
      console.error('স্ট্যাটাস আপডেট ত্রুটি:', err);
    }
  };

  const handleResetForm = () => {
    setEditingVoucherId(null);
    setFormData({
      voucherType: 'Debit',
      date: new Date().toISOString().split('T')[0],
      head: allExpenseHeads[0] || 'সিমেন্ট ক্রয়',
      amount: '',
      recipient: '',
      paymentMethod: 'ক্যাশ',
      bankOrChequeInfo: '',
      receiptRef: '',
      note: '',
      status: 'Approved'
    });
  };

  // -----------------------------------------------------------------
  // ডেট ফিল্টারিং লজিক (Date Filtering Logic)
  // -----------------------------------------------------------------
  const getFilteredVouchersByDate = () => {
    if (dateFilter === 'ALL') return vouchers;

    const today = new Date();
    const todayStr = getLocalYYYYMMDD(today);
    const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM
    
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgoStr = getLocalYYYYMMDD(sevenDaysAgoDate);

    return vouchers.filter(v => {
      if (!v.date) return false;
      
      if (dateFilter === 'Today') {
        return v.date === todayStr;
      } else if (dateFilter === 'Week') {
        return v.date >= sevenDaysAgoStr && v.date <= todayStr;
      } else if (dateFilter === 'Month') {
        return v.date.startsWith(thisMonthStr);
      }
      return true;
    });
  };

  const dateFilteredVouchers = getFilteredVouchersByDate();

  // -----------------------------------------------------------------
  // আর্থিক ক্যালকুলেশন (ফিল্টার করা ডেটার ওপর ভিত্তি করে)
  // -----------------------------------------------------------------
  const totalCashIn = dateFilteredVouchers
    .filter(v => v.voucherType === 'Credit' && v.status === 'Approved')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalCashOut = dateFilteredVouchers
    .filter(v => v.voucherType === 'Debit' && v.status === 'Approved')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalBankDeposit = dateFilteredVouchers
    .filter(v => v.voucherType === 'Debit' && v.status === 'Approved' && v.head === 'ব্যাংকে নগদ জমা (Bank Deposit)')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const actualProjectExpense = totalCashOut - totalBankDeposit;
  
  // পেন্ডিং এবং নেট ব্যালেন্স সব সময়ের (All-time) জন্য হবে, যাতে হিসেবে গরমিল না হয়
  const pendingApprovalsCount = vouchers.filter(v => v.status === 'Pending' && !v.isDonorEntry).length;
  
  const allTimeCashIn = vouchers.filter(v => v.voucherType === 'Credit' && v.status === 'Approved').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const allTimeCashOut = vouchers.filter(v => v.voucherType === 'Debit' && v.status === 'Approved').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const netBalance = allTimeCashIn - allTimeCashOut;

  // খাতভিত্তিক খরচের সারসংক্ষেপ (ফিল্টার করা ডেটা অনুযায়ী)
  const expenseHeadSummary = allExpenseHeads.map(head => {
    const headVouchers = dateFilteredVouchers.filter(v => v.voucherType === 'Debit' && v.head === head && v.status === 'Approved');
    const totalAmount = headVouchers.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = headVouchers.length;
    const percentage = totalCashOut > 0 ? ((totalAmount / totalCashOut) * 100).toFixed(1) : 0;
    return { head, totalAmount, count, percentage, vouchers: headVouchers, type: 'Debit' };
  }).filter(item => item.count > 0 || customExpenseHeads.some(h => h.name === item.head) || (dateFilter === 'ALL' && DEFAULT_EXPENSE_HEADS.includes(item.head)));

  // খাতভিত্তিক জমার সারসংক্ষেপ (ফিল্টার করা ডেটা অনুযায়ী)
  const incomeHeadSummary = allIncomeHeads.map(head => {
    const headVouchers = dateFilteredVouchers.filter(v => v.voucherType === 'Credit' && v.head === head && v.status === 'Approved');
    const totalAmount = headVouchers.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = headVouchers.length;
    const percentage = totalCashIn > 0 ? ((totalAmount / totalCashIn) * 100).toFixed(1) : 0;
    return { head, totalAmount, count, percentage, vouchers: headVouchers, type: 'Credit' };
  }).filter(item => item.count > 0 || customIncomeHeads.some(h => h.name === item.head) || (dateFilter === 'ALL' && DEFAULT_INCOME_HEADS.includes(item.head)));

  const activeHeadSummary = ledgerMode === 'Debit' ? expenseHeadSummary : incomeHeadSummary;

  // টেবিল ফিল্টারিং (সার্চ ও স্ট্যাটাস ট্যাব)
  const finalFilteredVouchers = dateFilteredVouchers.filter(v => {
    let matchesTab = true;
    if (activeTab === 'Debit') matchesTab = v.voucherType === 'Debit';
    else if (activeTab === 'Credit') matchesTab = v.voucherType === 'Credit';
    else if (activeTab === 'Pending') matchesTab = v.status === 'Pending';
    else if (activeTab !== 'ALL') matchesTab = v.head === activeTab;

    const matchesSearch = 
      v.voucherNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.head?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.bankOrChequeInfo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.receiptRef?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const totalPages = Math.ceil(finalFilteredVouchers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVouchers = finalFilteredVouchers.slice(indexOfFirstItem, indexOfLastItem);

  const triggerPrintVoucher = (voucher) => {
    setSelectedPrintVoucher(voucher);
    setIsPrintingLedger(false);
    setIsPrintingCashBook(false);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const triggerPrintLedger = () => {
    setIsPrintingLedger(true);
    setIsPrintingCashBook(false);
    setTimeout(() => {
      window.print();
    }, 200);
  };
  
  const triggerPrintCashBook = () => {
    setIsPrintingCashBook(true);
    setIsPrintingLedger(false);
    setSelectedPrintVoucher(null);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium">লোড হচ্ছে...</div>;
  }

  const currentLedgerData = selectedLedgerHead 
    ? activeHeadSummary.find(h => h.head === selectedLedgerHead)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-[10px] text-blue-800 uppercase leading-tight">নির্মাণ প্রজেক্ট একাউন্টস</p>
              <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">ফিন্যান্স, ক্যাশ বুক ও জমা-খরচ লেজার</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition"
            >
              ← ব্যাক টু মেন্যু
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> লগআউট
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-5 print:hidden">
        
        {/* --- নতুন ডেট ফিল্টার অপশন --- */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <CalendarDays className="w-4 h-4 ml-1.5 text-slate-400" />
            {[
              { id: 'ALL', label: 'সকল সময়' },
              { id: 'Today', label: 'আজকের হিসাব' },
              { id: 'Week', label: 'গত ৭ দিন' },
              { id: 'Month', label: 'চলতি মাস' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  dateFilter === opt.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* ----------------------------- */}

        {/* ড্যাশবোর্ড কার্ডস */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs relative">
            {dateFilter !== 'ALL' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="ফিল্টার সক্রিয়"></div>}
            <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-700">
              <span>মোট ক্যাশ গ্রহণ (In)</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-700 mt-1">
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalCashIn)}</span>
            </p>
            <span className="text-[10px] text-slate-400">ডোনার, ব্যাংক উত্তোলন ও অন্যান্য আয়</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs relative">
            {dateFilter !== 'ALL' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="ফিল্টার সক্রিয়"></div>}
            <div className="flex items-center justify-between text-xs font-bold uppercase text-rose-600">
              <span>প্রকৃত প্রজেক্ট খরচ</span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xl font-black text-rose-600 mt-1">
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(actualProjectExpense)}</span>
            </p>
            <span className="text-[10px] text-slate-400">ব্যাংকে জমাকৃত টাকা বাদে আসল খরচ</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs bg-teal-50/20 relative">
            {dateFilter !== 'ALL' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal-500 animate-pulse" title="ফিল্টার সক্রিয়"></div>}
            <div className="flex items-center justify-between text-xs font-bold uppercase text-teal-700">
              <span>ব্যাংকে মোট জমা</span>
              <Landmark className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xl font-black text-teal-900 mt-1">
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalBankDeposit)}</span>
            </p>
            <span className="text-[10px] text-teal-600">ক্যাশ থেকে ব্যাংকে পাঠানো টাকা</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/20">
            <span className="text-xs font-bold uppercase text-blue-700 block">ক্যাশ ব্যালেন্স (হাতে জমা)</span>
            <p className="text-xl font-black text-blue-900 mt-1">
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(netBalance)}</span>
            </p>
            <span className="text-[10px] text-blue-600">বর্তমান সাইট পেটি ক্যাশ ব্যালেন্স (সর্বমোট)</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center mb-6">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ভাউচার নং, খাত, নাম, চেক নং দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={() => {
                handleResetForm();
                setShowVoucherModal(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>নতুন ভাউচার এন্ট্রি</span>
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'Debit', 'Credit', 'Pending'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab === 'ALL' ? 'সকল লেনদেন' :
                 tab === 'Debit' ? 'ডেবিট (ব্যয়)' :
                 tab === 'Credit' ? 'ক্রেডিট (জমা)' : 'পেন্ডিং'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-8">
          <div className="p-3.5 border-b border-slate-100 font-bold text-sm text-slate-900 flex justify-between items-center">
            <span>দৈনিক ট্রানজ্যাকশন ও ক্যাশ বুক রেজিস্টার</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-normal">মোট: <strong style={bnSafeStyle}>{toBengaliNumber(finalFilteredVouchers.length)}</strong> টি এন্ট্রি</span>
              <button 
                onClick={triggerPrintCashBook}
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2 py-1 rounded-md border border-slate-300 font-semibold cursor-pointer"
              >
                <Printer className="w-3 h-3" /> প্রিন্ট করুন
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">ভাউচার/আইডি নং</th>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">খাত / বিবরণ</th>
                  <th className="p-3">গ্রহীতা / পেয়ী</th>
                  <th className="p-3">পদ্ধতি ও বিবরণ</th>
                  <th className="p-3 text-right">পরিমাণ</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">কোনো ভাউচার রেকর্ড পাওয়া যায়নি।</td>
                  </tr>
                ) : (
                  currentVouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        <span style={bnSafeStyle}>{toBengaliNumber(voucher.voucherNo)}</span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium whitespace-nowrap">
                        <span style={bnSafeStyle}>{toBengaliNumber(voucher.date)}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block flex items-center gap-1.5 flex-wrap">
                          {voucher.head}
                          {voucher.isDonorEntry && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              ডোনার পেজ হতে
                            </span>
                          )}
                        </span>
                        {voucher.note && <span className="text-[11px] text-slate-400 mt-0.5 block">{voucher.note}</span>}
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        {voucher.recipient || '—'}
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 font-medium inline-block">
                          {voucher.paymentMethod}
                        </span>
                        {voucher.bankOrChequeInfo && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">{voucher.bankOrChequeInfo}</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-sm whitespace-nowrap">
                        <span className={voucher.voucherType === 'Credit' ? 'text-emerald-700' : 'text-rose-600'}>
                          {voucher.voucherType === 'Credit' ? '+' : '-'}৳<span style={bnSafeStyle}>{toBengaliCurrency(voucher.amount)}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          voucher.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          voucher.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {voucher.status === 'Approved' ? 'অনুমোদিত' :
                           voucher.status === 'Pending' ? 'অপেক্ষমান' : 'বাতিল'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => triggerPrintVoucher(voucher)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="প্রিন্ট ভাউচার"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          
                          {!voucher.isDonorEntry && (
                            <>
                              {voucher.status === 'Pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(voucher.id, 'Approved')}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700 cursor-pointer mx-1"
                                >
                                  অনুমোদন
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setFormData({
                                    voucherType: voucher.voucherType,
                                    date: voucher.date,
                                    head: voucher.head,
                                    amount: voucher.amount,
                                    recipient: voucher.recipient || '',
                                    paymentMethod: voucher.paymentMethod || 'ক্যাশ',
                                    bankOrChequeInfo: voucher.bankOrChequeInfo || '',
                                    receiptRef: voucher.receiptRef || '',
                                    note: voucher.note || '',
                                    status: voucher.status
                                  });
                                  setEditingVoucherId(voucher.id);
                                  setShowVoucherModal(true);
                                }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="এডিট করুন"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteVoucher(voucher.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="ডিলিট করুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* পেজিনেশন কন্ট্রোল */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-500 font-medium">
                পৃষ্ঠা <span style={bnSafeStyle}>{toBengaliNumber(currentPage)}</span> / <span style={bnSafeStyle}>{toBengaliNumber(totalPages)}</span>
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <section className="mb-6 pt-4 border-t-2 border-slate-200 border-dashed">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-700" />
              <h2 className="text-sm sm:text-lg font-bold text-slate-900">
                খাতভিত্তিক লেজার বিবরণী ও মোট হিসাব
              </h2>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => { setLedgerMode('Debit'); setSelectedLedgerHead(null); }}
                  className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                    ledgerMode === 'Debit' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  খরচের লেজার ({toBengaliNumber(expenseHeadSummary.length)})
                </button>
                <button
                  onClick={() => { setLedgerMode('Credit'); setSelectedLedgerHead(null); }}
                  className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                    ledgerMode === 'Credit' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  জমার লেজার ({toBengaliNumber(incomeHeadSummary.length)})
                </button>
              </div>

              <button
                onClick={() => {
                  setNewHeadType(ledgerMode);
                  setShowAddHeadModal(true);
                }}
                className="flex items-center justify-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>নতুন খাত যোগ</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeHeadSummary.map((item, idx) => {
              const isCustom = item.type === 'Debit' 
                ? customExpenseHeads.some(h => h.name === item.head) 
                : customIncomeHeads.some(h => h.name === item.head);
              const showDeleteOnCard = isCustom && item.count === 0;

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedLedgerHead(item.head)}
                  className={`bg-white p-3.5 rounded-2xl border transition cursor-pointer group flex flex-col justify-between hover:shadow-md ${
                    ledgerMode === 'Credit'
                      ? 'border-slate-200 hover:border-emerald-500'
                      : 'border-slate-200 hover:border-rose-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[12px] font-bold text-slate-700 truncate block" title={item.head}>
                        {item.head}
                      </span>
                      {showDeleteOnCard ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHead(item.head, item.type);
                          }}
                          className="text-[10px] bg-rose-50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 p-1.5 rounded-md transition border border-rose-200"
                          title="খাতটি ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                          <span style={bnSafeStyle}>{toBengaliNumber(item.count)}</span>
                        </span>
                      )}
                    </div>

                    <p className={`text-base font-extrabold mt-1 ${ledgerMode === 'Credit' ? 'text-emerald-700' : 'text-slate-900'}`}>
                      ৳<span style={bnSafeStyle}>{toBengaliCurrency(item.totalAmount)}</span>
                    </p>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${ledgerMode === 'Credit' ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className={`flex items-center justify-between text-[11px] font-semibold mt-3 pt-2.5 border-t border-slate-50 ${
                    ledgerMode === 'Credit' ? 'text-emerald-700' : 'text-blue-600'
                  }`}>
                    <span>লেজার দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* নতুন খাত তৈরি করার পপআপ মডাল */}
      {showAddHeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-blue-600" /> নতুন খাতের নাম যোগ করুন
              </h3>
              <button onClick={() => setShowAddHeadModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewHead} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">খাতের ধরন *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewHeadType('Debit')}
                    className={`py-1.5 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${
                      newHeadType === 'Debit' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    খরচের খাত (Debit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHeadType('Credit')}
                    className={`py-1.5 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${
                      newHeadType === 'Credit' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    জমার খাত (Credit)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">খাতের নাম (Head Name) *</label>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  value={newHeadInput}
                  onChange={e => setNewHeadInput(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="যেমন: টাইলস ও ফিটিংস, বিশেষ অনুদান ইত্যাদি"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddHeadModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  খাত যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* খাতভিত্তিক পূর্ণাঙ্গ লেজার হিস্ট্রি মডাল (Debit ও Credit উভয় সমর্থিত) */}
      {selectedLedgerHead && currentLedgerData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  currentLedgerData.type === 'Credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                    {currentLedgerData.head}
                  </h3>
                  <p className="text-xs text-slate-500">অনুমোদিত সকল ট্রানজ্যাকশন হিস্ট্রি</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLedgerHead(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">মোট এন্ট্রি সংখ্যা:</span>
                <strong className="text-sm text-slate-800" style={bnSafeStyle}>
                  {toBengaliNumber(currentLedgerData.count)} টি
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">এই খাতে মোট পরিমাণ:</span>
                <strong className={`text-base font-black ${currentLedgerData.type === 'Credit' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(currentLedgerData.totalAmount)}</span>
                </strong>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-xl border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 sticky top-0 font-semibold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">ভাউচার/রশিদ নং</th>
                    <th className="p-2.5">গ্রহীতা / বিবরণ</th>
                    <th className="p-2.5 text-right">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentLedgerData.vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">এই খাতে এখনও কোনো এন্ট্রি নেই।</td>
                    </tr>
                  ) : (
                    currentLedgerData.vouchers.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium whitespace-nowrap text-slate-600">
                          <span style={bnSafeStyle}>{toBengaliNumber(item.date)}</span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          <span style={bnSafeStyle}>{toBengaliNumber(item.voucherNo)}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-800 block flex items-center gap-1">
                            {item.recipient || '—'}
                            {item.isDonorEntry && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">ডোনার পেজ</span>}
                          </span>
                          {item.note && <span className="text-[11px] text-slate-400">{item.note}</span>}
                          {item.bankOrChequeInfo && <span className="text-[10px] text-blue-600 block">{item.bankOrChequeInfo}</span>}
                        </td>
                        <td className={`p-2.5 text-right font-bold whitespace-nowrap ${
                          currentLedgerData.type === 'Credit' ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {currentLedgerData.type === 'Credit' ? '+' : '-'}৳<span style={bnSafeStyle}>{toBengaliCurrency(item.amount)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-4 mt-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setSelectedLedgerHead(null)}
                className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button 
                type="button" 
                onClick={triggerPrintLedger}
                className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>লেজার প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* নতুন ভাউচার পপআপ মডাল */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" /> 
                {editingVoucherId ? 'ভাউচার আপডেট করুন' : 'নতুন ভাউচার ও ট্রানজ্যাকশন এন্ট্রি'}
              </h3>
              <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVoucher} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData, 
                    voucherType: 'Debit',
                    head: allExpenseHeads[0] || 'সিমেন্ট ক্রয়'
                  })}
                  className={`py-2 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                    formData.voucherType === 'Debit'
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ডেবিট ভাউচার (ব্যয়)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData, 
                    voucherType: 'Credit',
                    head: allIncomeHeads[0] || 'ওয়াকফ এস্টেট মূল ফান্ড'
                  })}
                  className={`py-2 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                    formData.voucherType === 'Credit'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ক্রেডিট ভাউচার (জমা)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">তারিখ *</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">টাকার পরিমাণ (৳) *</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none font-bold"
                    placeholder="যেমন: ২৫০০০"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    {formData.voucherType === 'Debit' ? 'খরচের খাত (Expense Head) *' : 'জমার খাত (Income Head) *'}
                  </label>
                  <button 
                    type="button"
                    onClick={() => {
                      setNewHeadType(formData.voucherType);
                      setShowAddHeadModal(true);
                    }}
                    className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> নতুন খাত তৈরি
                  </button>
                </div>
                
                {/* খাত সিলেক্ট ও ডিলিট বাটন */}
                <div className="flex items-center gap-2">
                  <select 
                    value={formData.head}
                    onChange={e => setFormData({...formData, head: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none bg-white font-medium flex-1"
                  >
                    {formData.voucherType === 'Debit'
                      ? allExpenseHeads.map((head, idx) => (
                          <option key={idx} value={head}>{head}</option>
                        ))
                      : allIncomeHeads.map((head, idx) => (
                          <option key={idx} value={head}>{head}</option>
                        ))
                    }
                  </select>

                  {/* সিলেক্ট করা খাতটি যদি কাস্টম হয়, তবে ডিলিট বাটন দেখাবে */}
                  { ((formData.voucherType === 'Debit' ? customExpenseHeads : customIncomeHeads).find(h => h.name === formData.head)) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteHead(formData.head, formData.voucherType)}
                      className="mt-1 p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                      title="এই কাস্টম খাতটি চিরতরে মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {formData.voucherType === 'Debit' ? 'কাকে প্রদান করা হলো (Payee)' : 'কার কাছ থেকে প্রাপ্ত (From)'}
                  </label>
                  <input 
                    type="text" 
                    value={formData.recipient}
                    onChange={e => setFormData({...formData, recipient: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="নাম / প্রতিষ্ঠান"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">পেমেন্ট মাধ্যম</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none bg-white"
                  >
                    <option value="ক্যাশ">নগদ ক্যাশ</option>
                    <option value="ব্যাংক চেক">ব্যাংক অ্যাকাউন্ট / চেক</option>
                    <option value="বিকাশ / নগদ">বিকাশ / নগদ (MFS)</option>
                  </select>
                </div>
              </div>

              {formData.paymentMethod !== 'ক্যাশ' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600">চেক নম্বর / ব্যাংক নাম / TrxID</label>
                  <input 
                    type="text" 
                    value={formData.bankOrChequeInfo}
                    onChange={e => setFormData({...formData, bankOrChequeInfo: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="যেমন: চেক নং-৭৮৫২১০, সোনালী ব্যাংক"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600">বিল / চালান / ক্যাশ মেমো নং</label>
                <input 
                  type="text" 
                  value={formData.receiptRef}
                  onChange={e => setFormData({...formData, receiptRef: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: মেমো-৪৫২০"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">বিবরণ / কাজের নোট</label>
                <textarea 
                  rows={2}
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="কাজের বিস্তারিত বিবরণ..."
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={handleResetForm}
                  className="flex items-center gap-1 px-3 py-2 border border-amber-300 text-amber-800 bg-amber-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> রিসেট
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowVoucherModal(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {editingVoucherId ? 'আপডেট করুন' : 'ভাউচার সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* প্রিন্ট ভিউ ১: অফিসিয়াল ডেবিট / ক্রেডিট ভাউচার */}
      {selectedPrintVoucher && !isPrintingLedger && !isPrintingCashBook && (
        <div className="hidden print:block print-area p-8 max-w-2xl mx-auto border-2 border-slate-900 bg-white text-black font-sans">
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
            <h1 className="text-xl font-black">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট নির্মাণ প্রকল্প</h1>
            <p className="text-xs text-slate-700">জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন, ময়মনসিংহ।</p>
            <div className="inline-block border border-slate-900 px-4 py-1 mt-2 font-bold text-sm bg-slate-100">
              {selectedPrintVoucher.voucherType === 'Debit' ? 'ডেবিট ভাউচার (খরচ রসিদ)' : 'ক্রেডিট ভাউচার (জমা রসিদ)'}
            </div>
          </div>

          <div className="flex justify-between text-xs border-b pb-2 mb-4 border-slate-400">
            <div>
              <p><strong>ভাউচার/আইডি নং:</strong> <span style={bnSafeStyle}>{toBengaliNumber(selectedPrintVoucher.voucherNo)}</span></p>
              <p><strong>তারিখ:</strong> <span style={bnSafeStyle}>{toBengaliNumber(selectedPrintVoucher.date)}</span></p>
              <p><strong>মেমো/রেফারেন্স নং:</strong> {selectedPrintVoucher.receiptRef || '—'}</p>
            </div>
            <div className="text-right">
              <p><strong>পদ্ধতি:</strong> {selectedPrintVoucher.paymentMethod}</p>
              {selectedPrintVoucher.bankOrChequeInfo && <p><strong>চেক/ব্যাংক:</strong> {selectedPrintVoucher.bankOrChequeInfo}</p>}
              <p><strong>{selectedPrintVoucher.voucherType === 'Debit' ? 'গ্রহীতা:' : 'উৎস/প্রদানকারী:'}</strong> {selectedPrintVoucher.recipient || '—'}</p>
            </div>
          </div>

          <table className="w-full text-left text-xs border border-slate-900 mb-6">
            <thead className="bg-slate-100 border-b border-slate-900 font-bold">
              <tr>
                <th className="p-2 border-r border-slate-900">খাত / বিবরণ</th>
                <th className="p-2 text-right w-36">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-400">
                <td className="p-3 border-r border-slate-400">
                  <p className="font-bold text-sm">
                    {selectedPrintVoucher.head}
                    {selectedPrintVoucher.isDonorEntry && <span className="ml-1 text-[9px] bg-slate-200 text-slate-800 px-1 py-0.5 rounded">ডোনার পেজ হতে</span>}
                  </p>
                  <p className="text-slate-600 mt-1">{selectedPrintVoucher.note || 'প্রকল্প উন্নয়ন লেনদেন'}</p>
                </td>
                <td className="p-3 text-right font-black text-base">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(selectedPrintVoucher.amount)}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-3 pt-16 text-center text-xs font-semibold text-slate-800">
            <div>
              <div className="w-32 border-t border-slate-800 mx-auto pt-1">গ্রহীতা / পেয়ীর স্বাক্ষর</div>
            </div>
            <div>
              <div className="w-32 border-t border-slate-800 mx-auto pt-1">হিসাবরক্ষক</div>
            </div>
            <div>
              <div className="w-32 border-t border-slate-800 mx-auto pt-1">সভাপতি / মুতাওয়াল্লী</div>
            </div>
          </div>
        </div>
      )}

      {/* প্রিন্ট ভিউ ২: খাতভিত্তিক অফিসিয়াল লেজার রেজিস্টার */}
      {selectedLedgerHead && currentLedgerData && isPrintingLedger && !isPrintingCashBook && (
        <div className="hidden print:block print-area p-8 max-w-3xl mx-auto border-2 border-slate-900 bg-white text-black font-sans">
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
            <h1 className="text-2xl font-black">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট নির্মাণ প্রকল্প</h1>
            <p className="text-xs text-slate-700">জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন, ময়মনসিংহ।</p>
            <div className="inline-block border border-slate-900 px-4 py-1 mt-2 font-bold text-sm bg-slate-100">
              {currentLedgerData.type === 'Credit' ? 'জমার অফিসিয়াল লেজার রেজিস্টার' : 'ব্যয়ের অফিসিয়াল লেজার রেজিস্টার'}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2">
              খাত: {currentLedgerData.head}
            </h2>
            {dateFilter !== 'ALL' && (
              <p className="text-xs font-bold text-slate-600 mt-1">
                রিপোর্ট পিরিয়ড: {
                  dateFilter === 'Today' ? 'আজকের হিসাব' :
                  dateFilter === 'Week' ? 'গত ৭ দিনের হিসাব' :
                  dateFilter === 'Month' ? 'চলতি মাসের হিসাব' : ''
                }
              </p>
            )}
          </div>

          <table className="w-full text-left text-xs border border-slate-900 mb-6">
            <thead className="bg-slate-100 border-b border-slate-900 font-bold">
              <tr>
                <th className="p-2 border-r border-slate-900 text-center w-10">নং</th>
                <th className="p-2 border-r border-slate-900 w-24">তারিখ</th>
                <th className="p-2 border-r border-slate-900 w-24">ভাউচার নং</th>
                <th className="p-2 border-r border-slate-900">গ্রহীতা ও বিবরণ</th>
                <th className="p-2 text-right w-28">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              {currentLedgerData.vouchers.map((v, i) => (
                <tr key={i} className="border-b border-slate-400">
                  <td className="p-2 text-center border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(i + 1)}</span></td>
                  <td className="p-2 border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(v.date)}</span></td>
                  <td className="p-2 border-r border-slate-400 font-bold"><span style={bnSafeStyle}>{toBengaliNumber(v.voucherNo)}</span></td>
                  <td className="p-2 border-r border-slate-400">
                    <span className="font-semibold">{v.recipient || '—'}</span>
                    {v.isDonorEntry && <span className="ml-1 text-[9px] bg-slate-200 px-1 py-0.5 rounded">ডোনার পেজ</span>}
                    {v.bankOrChequeInfo && <span className="text-[10px] text-slate-500 block">({v.bankOrChequeInfo})</span>}
                    {v.note && <span className="text-slate-600 block text-[11px]">{v.note}</span>}
                  </td>
                  <td className="p-2 text-right font-bold">৳<span style={bnSafeStyle}>{toBengaliCurrency(v.amount)}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t border-slate-900">
              <tr>
                <td colSpan={4} className="p-2 text-right border-r border-slate-900">সর্বমোট:</td>
                <td className="p-2 text-right font-black">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(currentLedgerData.totalAmount)}</span>
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 pt-16 text-center text-xs font-semibold text-slate-800">
            <div>
              <div className="w-40 border-t border-slate-800 mx-auto pt-1">হিসাবরক্ষক</div>
            </div>
            <div>
              <div className="w-40 border-t border-slate-800 mx-auto pt-1">মুতাওয়াল্লী / সভাপতি</div>
            </div>
          </div>
        </div>
      )}

      {/* প্রিন্ট ভিউ ৩: সম্পূর্ণ ক্যাশ বুক ট্রানজ্যাকশন রিপোর্ট */}
      {isPrintingCashBook && !isPrintingLedger && !selectedPrintVoucher && (
        <div className="hidden print:block print-area p-6 max-w-4xl mx-auto border-2 border-slate-900 bg-white text-black font-sans">
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
            <h1 className="text-2xl font-black">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট নির্মাণ প্রকল্প</h1>
            <p className="text-xs text-slate-700">জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন, ময়মনসিংহ।</p>
            <div className="inline-block border border-slate-900 px-4 py-1 mt-2 font-bold text-sm bg-slate-100">
              ক্যাশ বুক ও দৈনিক ট্রানজ্যাকশন রিপোর্ট
            </div>
            <p className="text-xs font-bold text-slate-800 mt-2">
              রিপোর্ট পিরিয়ড: {
                dateFilter === 'ALL' ? 'সকল সময়ের হিসাব' :
                dateFilter === 'Today' ? 'আজকের হিসাব' :
                dateFilter === 'Week' ? 'গত ৭ দিনের হিসাব' : 'চলতি মাসের হিসাব'
              }
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-[10px] mb-4 border border-slate-900 p-2 bg-slate-50">
            <div>
              <strong>মোট জমা (In):</strong> <br/>
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalCashIn)}</span>
            </div>
            <div>
              <strong>মোট ব্যয় (Out):</strong> <br/>
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalCashOut)}</span>
            </div>
            <div>
              <strong>ব্যাংকে জমা:</strong> <br/>
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalBankDeposit)}</span>
            </div>
            <div className="text-right">
              <strong>হাতে ক্যাশ ব্যালেন্স:</strong> <br/>
              <span className="font-black text-sm">৳<span style={bnSafeStyle}>{toBengaliCurrency(netBalance)}</span></span>
            </div>
          </div>

          <table className="w-full text-left text-[10px] border border-slate-900 mb-6">
            <thead className="bg-slate-100 border-b border-slate-900 font-bold">
              <tr>
                <th className="p-1.5 border-r border-slate-900">ভাউচার নং</th>
                <th className="p-1.5 border-r border-slate-900">তারিখ</th>
                <th className="p-1.5 border-r border-slate-900">খাত / বিবরণ</th>
                <th className="p-1.5 border-r border-slate-900">গ্রহীতা / পেয়ীর নাম</th>
                <th className="p-1.5 border-r border-slate-900">পদ্ধতি</th>
                <th className="p-1.5 text-right">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              {finalFilteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">এই সময়ে কোনো লেনদেন নেই।</td>
                </tr>
              ) : (
                finalFilteredVouchers.map((v, i) => (
                  <tr key={i} className="border-b border-slate-400">
                    <td className="p-1.5 border-r border-slate-400 font-bold"><span style={bnSafeStyle}>{toBengaliNumber(v.voucherNo)}</span></td>
                    <td className="p-1.5 border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(v.date)}</span></td>
                    <td className="p-1.5 border-r border-slate-400">
                      <strong>{v.head}</strong> {v.isDonorEntry && '(ডোনার পেজ)'}
                      {v.note && <span className="block text-slate-600">{v.note}</span>}
                    </td>
                    <td className="p-1.5 border-r border-slate-400">{v.recipient || '—'}</td>
                    <td className="p-1.5 border-r border-slate-400">
                      {v.paymentMethod}
                      {v.bankOrChequeInfo && <span className="block text-slate-500">{v.bankOrChequeInfo}</span>}
                    </td>
                    <td className={`p-1.5 text-right font-bold ${v.voucherType === 'Credit' ? 'text-black' : 'text-slate-700'}`}>
                      {v.voucherType === 'Credit' ? '+' : '-'}৳<span style={bnSafeStyle}>{toBengaliCurrency(v.amount)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="grid grid-cols-2 pt-16 text-center text-xs font-semibold text-slate-800">
            <div>
              <div className="w-40 border-t border-slate-800 mx-auto pt-1">হিসাবরক্ষক</div>
            </div>
            <div>
              <div className="w-40 border-t border-slate-800 mx-auto pt-1">মুতাওয়াল্লী / সভাপতি</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}