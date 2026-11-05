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
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Users, 
  PlusCircle, 
  Search, 
  Printer, 
  LogOut, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Ruler, 
  Plus, 
  Wallet,
  CreditCard,
  History,
  Edit3,
  HardHat,
  Filter
} from 'lucide-react';

// ইংরেজি সংখ্যাকে বাংলায় রূপান্তর
function toBengaliNumber(num) {
  if (num === undefined || num === null || num === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[d]);
}

// টাকায় রূপান্তর (কমা সহ)
function toBengaliCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const n = Number(amount) || 0;
  return n.toLocaleString('en-IN').replace(/\d/g, (d) => banglaDigits[d]);
}

const bnSafeStyle = {
  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif",
  display: 'inline-block',
  lineHeight: '1.4'
};

export default function WorkforceManagement() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ATTENDANCE'); // 'ATTENDANCE', 'MB_BILL', 'WAGES'
  const [searchTerm, setSearchTerm] = useState('');
  
  // ডেটা স্টেট
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [contractorBills, setContractorBills] = useState([]);
  const [weeklyWages, setWeeklyWages] = useState([]);

  // মডাল কন্ট্রোল (নতুন এন্ট্রি)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showWageModal, setShowWageModal] = useState(false);

  // কন্ট্রাক্টর বকেয়া বিল পরিশোধ ও হিস্ট্রি মডাল স্টেট
  const [selectedBillForPay, setSelectedBillForPay] = useState(null);
  const [billPayAmount, setBillPayAmount] = useState('');
  const [billPayDate, setBillPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [billPayNote, setBillPayNote] = useState('');
  const [historyBill, setHistoryBill] = useState(null);

  // মজুরি এডিট/পরিশোধ মডাল স্টেট
  const [selectedWageForUpdate, setSelectedWageForUpdate] = useState(null);
  const [extraAdvanceInput, setExtraAdvanceInput] = useState('');

  // প্রিন্ট ভিউ কন্ট্রোল ('FULL_REPORT', 'SINGLE_BILL', 'SINGLE_WAGE')
  const [printMode, setPrintMode] = useState('FULL_REPORT');
  const [printData, setPrintData] = useState(null);

  // ১. দৈনিক হাজিরা ফর্ম
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    floor: 'গ্রাউন্ড ফ্লোর',
    supervisorName: '',
    masonCount: '', // রাজমিস্ত্রি
    rodBinderCount: '', // রডমিস্ত্রি
    shutteringCount: '', // শাটারিং/কাঠমিস্ত্রি
    electricPlumberCount: '', // ইলেকট্রিক ও প্লাম্বিং
    helperCount: '', // হেল্পার
    overtimeHours: '',
    note: ''
  });

  // ২. রানিং বিল / মেজারমেন্ট বুক (MB) ফর্ম
  const [billForm, setBillForm] = useState({
    billNo: '',
    contractorName: '',
    contractorPhone: '',
    workDescription: '৪র্থ তলা ছাদ ও বিম শাটারিং',
    floor: '৪র্থ তলা',
    unit: 'Sft',
    quantity: '',
    rate: '',
    paidAmount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // ৩. সাপ্তাহিক মজুরি ফর্ম
  const [wageForm, setWageForm] = useState({
    weekStartDate: new Date().toISOString().split('T')[0],
    weekEndDate: new Date().toISOString().split('T')[0],
    gangLeaderName: '',
    phone: '',
    trade: 'রাজমিস্ত্রি দল',
    totalDays: '',
    dailyRate: '',
    overtimeBill: '',
    advancePaid: '',
    paymentStatus: 'বকেয়া',
    note: ''
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        await Promise.all([fetchAttendance(), fetchContractorBills(), fetchWages()]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // ডেটা লোড ফাংশনসমূহ
  const fetchAttendance = async () => {
    try {
      const q = query(collection(db, 'labour_attendance'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setAttendanceLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContractorBills = async () => {
    try {
      const q = query(collection(db, 'contractor_bills'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setContractorBills(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWages = async () => {
    try {
      const q = query(collection(db, 'weekly_wages'), orderBy('weekStartDate', 'desc'));
      const snap = await getDocs(q);
      setWeeklyWages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  // ১. হাজিরা সেভ
  const handleAddAttendance = async (e) => {
    e.preventDefault();
    try {
      const item = {
        ...attendanceForm,
        masonCount: Number(attendanceForm.masonCount) || 0,
        rodBinderCount: Number(attendanceForm.rodBinderCount) || 0,
        shutteringCount: Number(attendanceForm.shutteringCount) || 0,
        electricPlumberCount: Number(attendanceForm.electricPlumberCount) || 0,
        helperCount: Number(attendanceForm.helperCount) || 0,
        overtimeHours: Number(attendanceForm.overtimeHours) || 0,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'labour_attendance'), item);
      setShowAttendanceModal(false);
      setAttendanceForm({
        date: new Date().toISOString().split('T')[0],
        floor: 'গ্রাউন্ড ফ্লোর',
        supervisorName: '',
        masonCount: '',
        rodBinderCount: '',
        shutteringCount: '',
        electricPlumberCount: '',
        helperCount: '',
        overtimeHours: '',
        note: ''
      });
      fetchAttendance();
    } catch (e) {
      console.error(e);
    }
  };

  // ২. রানিং বিল (MB) সেভ
  const handleAddBill = async (e) => {
    e.preventDefault();
    try {
      const qty = Number(billForm.quantity) || 0;
      const rate = Number(billForm.rate) || 0;
      const total = qty * rate;
      const paid = Number(billForm.paidAmount) || 0;
      const due = total - paid;

      const nextBillSerial = 101 + contractorBills.length;
      const finalBillNo = billForm.billNo.trim() || `RA-${nextBillSerial}`;

      const payments = [];
      if (paid > 0) {
        payments.push({
          amount: paid,
          date: billForm.date,
          note: 'প্রাথমিক বিল পরিশোধ'
        });
      }

      const item = {
        billNo: finalBillNo,
        contractorName: billForm.contractorName,
        contractorPhone: billForm.contractorPhone || '',
        workDescription: billForm.workDescription,
        floor: billForm.floor,
        unit: billForm.unit,
        quantity: qty,
        rate: rate,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due > 0 ? due : 0,
        date: billForm.date,
        note: billForm.note || '',
        payments: payments,
        status: due <= 0 ? 'Paid' : 'Partial',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'contractor_bills'), item);
      setShowBillModal(false);
      setBillForm({
        billNo: '',
        contractorName: '',
        contractorPhone: '',
        workDescription: '৪র্থ তলা ছাদ ও বিম শাটারিং',
        floor: '৪র্থ তলা',
        unit: 'Sft',
        quantity: '',
        rate: '',
        paidAmount: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
      fetchContractorBills();
    } catch (e) {
      console.error(e);
    }
  };

  // ২.১ কন্ট্রাক্টরের বকেয়া বিল পরিশোধ হ্যান্ডলার
  const handlePayContractorDue = async (e) => {
    e.preventDefault();
    if (!selectedBillForPay || !billPayAmount) return;

    try {
      const pay = Number(billPayAmount) || 0;
      const newPaid = (Number(selectedBillForPay.paidAmount) || 0) + pay;
      const total = Number(selectedBillForPay.totalAmount) || 0;
      const newDue = total - newPaid;

      const billRef = doc(db, 'contractor_bills', selectedBillForPay.id);
      await updateDoc(billRef, {
        paidAmount: newPaid,
        dueAmount: newDue > 0 ? newDue : 0,
        status: newDue <= 0 ? 'Paid' : 'Partial',
        payments: arrayUnion({
          amount: pay,
          date: billPayDate,
          note: billPayNote || 'বকেয়া কিস্তি পরিশোধ'
        })
      });

      setSelectedBillForPay(null);
      setBillPayAmount('');
      setBillPayNote('');
      fetchContractorBills();
    } catch (err) {
      console.error('বিল পেমেন্ট ত্রুটি:', err);
    }
  };

  // ৩. সাপ্তাহিক মজুরি সেভ
  const handleAddWage = async (e) => {
    e.preventDefault();
    try {
      const days = Number(wageForm.totalDays) || 0;
      const rate = Number(wageForm.dailyRate) || 0;
      const ot = Number(wageForm.overtimeBill) || 0;
      const gross = (days * rate) + ot;
      const adv = Number(wageForm.advancePaid) || 0;
      const net = gross - adv;

      const item = {
        ...wageForm,
        totalDays: days,
        dailyRate: rate,
        overtimeBill: ot,
        grossAmount: gross,
        advancePaid: adv,
        netPayable: net > 0 ? net : 0,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'weekly_wages'), item);
      setShowWageModal(false);
      setWageForm({
        weekStartDate: new Date().toISOString().split('T')[0],
        weekEndDate: new Date().toISOString().split('T')[0],
        gangLeaderName: '',
        phone: '',
        trade: 'রাজমিস্ত্রি দল',
        totalDays: '',
        dailyRate: '',
        overtimeBill: '',
        advancePaid: '',
        paymentStatus: 'বকেয়া',
        note: ''
      });
      fetchWages();
    } catch (e) {
      console.error(e);
    }
  };

  // ৩.১ মজুরি স্ট্যাটাস টগল (পরিশোধিত / বকেয়া)
  const handleToggleWageStatus = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'পরিশোধিত' ? 'বকেয়া' : 'পরিশোধিত';
      await updateDoc(doc(db, 'weekly_wages', id), { paymentStatus: nextStatus });
      fetchWages();
    } catch (e) {
      console.error(e);
    }
  };

  // ৩.২ মজুরির অগ্রিম বা আংশিক টাকা যোগ করা
  const handleUpdateWageAdvance = async (e) => {
    e.preventDefault();
    if (!selectedWageForUpdate || !extraAdvanceInput) return;

    try {
      const extra = Number(extraAdvanceInput) || 0;
      const newAdv = (Number(selectedWageForUpdate.advancePaid) || 0) + extra;
      const gross = Number(selectedWageForUpdate.grossAmount) || 0;
      const newNet = gross - newAdv;

      await updateDoc(doc(db, 'weekly_wages', selectedWageForUpdate.id), {
        advancePaid: newAdv,
        netPayable: newNet > 0 ? newNet : 0,
        paymentStatus: newNet <= 0 ? 'পরিশোধিত' : selectedWageForUpdate.paymentStatus
      });

      setSelectedWageForUpdate(null);
      setExtraAdvanceInput('');
      fetchWages();
    } catch (e) {
      console.error(e);
    }
  };

  // ডিলিট ফাংশন
  const handleDeleteItem = async (colName, id, refreshFn) => {
    if (confirm('আপনি কি নিশ্চিতভাবে এই রেকর্ডটি মুছে ফেলতে চান?')) {
      try {
        await deleteDoc(doc(db, colName, id));
        refreshFn();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // প্রিন্ট ট্রিগারসমূহ
  const handlePrintFullReport = () => {
    setPrintMode('FULL_REPORT');
    setPrintData(null);
    setTimeout(() => window.print(), 200);
  };

  const handlePrintSingleBill = (bill) => {
    setPrintMode('SINGLE_BILL');
    setPrintData(bill);
    setTimeout(() => window.print(), 200);
  };

  const handlePrintSingleWage = (wage) => {
    setPrintMode('SINGLE_WAGE');
    setPrintData(wage);
    setTimeout(() => window.print(), 200);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-slate-600">লোড হচ্ছে...</div>;
  }

  // ক্যালকুলেশন (আজকের সকল ফ্লোরের মোট হাজিরা)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = attendanceLogs.filter(a => a.date === todayStr);
  
  const todayMason = todayLogs.reduce((acc, c) => acc + (Number(c.masonCount) || 0), 0);
  const todayRod = todayLogs.reduce((acc, c) => acc + (Number(c.rodBinderCount) || 0), 0);
  const todayShutter = todayLogs.reduce((acc, c) => acc + (Number(c.shutteringCount) || 0), 0);
  const todayElec = todayLogs.reduce((acc, c) => acc + (Number(c.electricPlumberCount) || 0), 0);
  const todayHelper = todayLogs.reduce((acc, c) => acc + (Number(c.helperCount) || 0), 0);
  const todayTotalLabour = todayMason + todayRod + todayShutter + todayElec + todayHelper;

  const totalContractorBilled = contractorBills.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalContractorDue = contractorBills.reduce((acc, curr) => acc + (Number(curr.dueAmount) || 0), 0);
  
  const totalWagesPaid = weeklyWages
    .filter(w => w.paymentStatus === 'পরিশোধিত')
    .reduce((acc, curr) => acc + (Number(curr.grossAmount) || 0), 0);
    
  const totalWagesDue = weeklyWages
    .filter(w => w.paymentStatus === 'বকেয়া')
    .reduce((acc, curr) => acc + (Number(curr.netPayable) || 0), 0);

  // সার্চ ফিল্টারিং
  const filteredAttendance = attendanceLogs.filter(a => 
    a.floor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.supervisorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.date?.includes(searchTerm)
  );

  const filteredBills = contractorBills.filter(b => 
    b.contractorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.workDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWages = weeklyWages.filter(w => 
    w.gangLeaderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.trade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-cyan-700 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-[10px] text-cyan-800 uppercase leading-tight">নির্মাণ জনবল ও সাব-কন্ট্রাক্ট</p>
              <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">লেবার হাজিরা, রানিং বিল (MB) ও মজুরি রেজিস্টার</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrintFullReport}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> সম্পূর্ণ শিট প্রিন্ট
            </button>
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
        
        {/* ১. ওভারভিউ মেট্রিক্স কার্ডস */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-4 rounded-2xl border border-cyan-200 shadow-xs bg-cyan-50/20">
            <span className="text-xs font-bold uppercase text-cyan-700 block">আজকের মোট শ্রমিক</span>
            <p className="text-xl font-black text-cyan-900 mt-1">
              <span style={bnSafeStyle}>{toBengaliNumber(todayTotalLabour)}</span> জন
            </p>
            <span className="text-[10px] text-cyan-700 block mt-0.5">
              {todayLogs.length > 0 
                ? `রাজ: ${toBengaliNumber(todayMason)}, রড: ${toBengaliNumber(todayRod)}, হেল্পার: ${toBengaliNumber(todayHelper)}` 
                : 'আজকের হাজিরা এন্ট্রি হয়নি'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-500 block">কন্ট্রাক্টর মোট রানিং বিল</span>
            <p className="text-xl font-black text-slate-800 mt-1">
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalContractorBilled)}</span>
            </p>
            <span className="text-[10px] text-slate-400">মোট {toBengaliNumber(contractorBills.length)} টি MB বিল</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
            <span className="text-xs font-bold uppercase text-rose-600 block">কন্ট্রাক্টর বকেয়া বিল</span>
            <p className="text-xl font-black text-rose-700 mt-1">
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalContractorDue)}</span>
            </p>
            <span className="text-[10px] text-rose-500">কিস্তিতে পরিশোধযোগ্য</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-emerald-700">সাপ্তাহিক মজুরি হিসাব</span>
              {totalWagesDue > 0 && (
                <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                  বকেয়া: ৳{toBengaliCurrency(totalWagesDue)}
                </span>
              )}
            </div>
            <p className="text-xl font-black text-emerald-800 mt-1">
              ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalWagesPaid)}</span>
            </p>
            <span className="text-[10px] text-emerald-600">পরিশোধিত মোট মজুরি</span>
          </div>
        </div>

        {/* ২. সেকশন সুইচ ট্যাব, সার্চ ও অ্যাকশন বার */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 mb-4">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setActiveTab('ATTENDANCE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ATTENDANCE' ? 'bg-cyan-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>দৈনিক হাজিরা ({toBengaliNumber(attendanceLogs.length)})</span>
            </button>
            <button
              onClick={() => setActiveTab('MB_BILL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'MB_BILL' ? 'bg-cyan-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>রানিং বিল / MB ({toBengaliNumber(contractorBills.length)})</span>
            </button>
            <button
              onClick={() => setActiveTab('WAGES')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'WAGES' ? 'bg-cyan-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>সাপ্তাহিক মজুরি ({toBengaliNumber(weeklyWages.length)})</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="নাম, ফ্লোর বা বিল নং খুঁজুন..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-600 outline-none"
              />
            </div>

            {activeTab === 'ATTENDANCE' && (
              <button
                onClick={() => setShowAttendanceModal(true)}
                className="flex items-center justify-center gap-1 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> আজকের হাজিরা এন্ট্রি
              </button>
            )}
            {activeTab === 'MB_BILL' && (
              <button
                onClick={() => setShowBillModal(true)}
                className="flex items-center justify-center gap-1 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> নতুন রানিং বিল (MB)
              </button>
            )}
            {activeTab === 'WAGES' && (
              <button
                onClick={() => setShowWageModal(true)}
                className="flex items-center justify-center gap-1 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> সাপ্তাহিক মজুরি তৈরি
              </button>
            )}
          </div>
        </div>

        {/* ৩. ট্যাব ১: দৈনিক লেবার হাজিরা টেবিল */}
        {activeTab === 'ATTENDANCE' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">দৈনিক লেবার উপস্থিতি ও কাজের স্থান লগ</h3>
                <p className="text-xs text-slate-500">সকল ট্রেডের মিস্ত্রি ও হেল্পারদের দৈনিক হেডকাউন্ট</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">ফ্লোর ও সর্দার</th>
                    <th className="p-3 text-center">রাজমিস্ত্রি</th>
                    <th className="p-3 text-center">রডমিস্ত্রি</th>
                    <th className="p-3 text-center">শাটারিং</th>
                    <th className="p-3 text-center">ইলেকট্রিক/প্লাম্বিং</th>
                    <th className="p-3 text-center">হেল্পার</th>
                    <th className="p-3 text-center font-bold">মোট জনবল</th>
                    <th className="p-3">ওভারটাইম ও নোট</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-400">কোনো হাজিরা রেকর্ড পাওয়া যায়নি।</td>
                    </tr>
                  ) : (
                    filteredAttendance.map((log) => {
                      const total = (Number(log.masonCount) || 0) + 
                                    (Number(log.rodBinderCount) || 0) + 
                                    (Number(log.shutteringCount) || 0) + 
                                    (Number(log.electricPlumberCount) || 0) + 
                                    (Number(log.helperCount) || 0);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                            <span style={bnSafeStyle}>{toBengaliNumber(log.date)}</span>
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200 inline-block">
                              {log.floor}
                            </span>
                            {log.supervisorName && (
                              <span className="block text-[10px] text-slate-500 mt-0.5">সর্দার: {log.supervisorName}</span>
                            )}
                          </td>
                          <td className="p-3 text-center" style={bnSafeStyle}>{toBengaliNumber(log.masonCount || 0)}</td>
                          <td className="p-3 text-center" style={bnSafeStyle}>{toBengaliNumber(log.rodBinderCount || 0)}</td>
                          <td className="p-3 text-center" style={bnSafeStyle}>{toBengaliNumber(log.shutteringCount || 0)}</td>
                          <td className="p-3 text-center" style={bnSafeStyle}>{toBengaliNumber(log.electricPlumberCount || 0)}</td>
                          <td className="p-3 text-center" style={bnSafeStyle}>{toBengaliNumber(log.helperCount || 0)}</td>
                          <td className="p-3 text-center font-black text-cyan-800 text-sm" style={bnSafeStyle}>
                            {toBengaliNumber(total)} জন
                          </td>
                          <td className="p-3 text-slate-600">
                            {log.overtimeHours > 0 && (
                              <span className="text-amber-700 font-semibold block">
                                +{toBengaliNumber(log.overtimeHours)} ঘণ্টা ওভারটাইম
                              </span>
                            )}
                            <span>{log.note || '—'}</span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteItem('labour_attendance', log.id, fetchAttendance)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ৪. ট্যাব ২: রানিং বিল ও মেজারমেন্ট বুক (MB) */}
        {activeTab === 'MB_BILL' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">সাব-কন্ট্রাক্টর রানিং অ্যাকাউন্ট বিল (Running Account / MB Bills)</h3>
                <p className="text-xs text-slate-500">কাজের মাপজোখ, মোট বিল এবং বকেয়া কিস্তি পরিশোধ ব্যবস্থাপনা</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">বিল নং ও তারিখ</th>
                    <th className="p-3">সাব-কন্ট্রাক্টর</th>
                    <th className="p-3">কাজের বিবরণ ও ফ্লোর</th>
                    <th className="p-3 text-right">মেজারমেন্ট</th>
                    <th className="p-3 text-right">দর (Rate)</th>
                    <th className="p-3 text-right font-bold">মোট বিল</th>
                    <th className="p-3 text-right text-emerald-700">পরিশোধিত</th>
                    <th className="p-3 text-right text-rose-600">বকেয়া</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">কোনো রানিং বিল এন্ট্রি নেই।</td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => {
                      const due = Number(b.dueAmount) || 0;
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 block">{b.billNo}</span>
                            <span className="text-[10px] text-slate-400" style={bnSafeStyle}>{toBengaliNumber(b.date)}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 block">{b.contractorName}</span>
                            {b.contractorPhone && <span className="text-[10px] text-slate-500">{b.contractorPhone}</span>}
                          </td>
                          <td className="p-3 text-slate-700">
                            <span className="font-medium block">{b.workDescription}</span>
                            {b.floor && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{b.floor}</span>}
                          </td>
                          <td className="p-3 text-right font-semibold whitespace-nowrap">
                            <span style={bnSafeStyle}>{toBengaliCurrency(b.quantity)}</span> {b.unit}
                          </td>
                          <td className="p-3 text-right text-slate-600 font-medium whitespace-nowrap">
                            ৳<span style={bnSafeStyle}>{toBengaliCurrency(b.rate)}</span>
                          </td>
                          <td className="p-3 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                            ৳<span style={bnSafeStyle}>{toBengaliCurrency(b.totalAmount)}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            ৳<span style={bnSafeStyle}>{toBengaliCurrency(b.paidAmount)}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-rose-600 whitespace-nowrap">
                            ৳<span style={bnSafeStyle}>{toBengaliCurrency(due)}</span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {due > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedBillForPay(b);
                                    setBillPayAmount('');
                                  }}
                                  className="px-2 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer shadow-2xs whitespace-nowrap"
                                  title="বকেয়া বিল পরিশোধ করুন"
                                >
                                  <CreditCard className="w-3 h-3" /> পেমেন্ট
                                </button>
                              )}
                              <button
                                onClick={() => setHistoryBill(b)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="পেমেন্ট হিস্ট্রি"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePrintSingleBill(b)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="বিল ভাউচার প্রিন্ট"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem('contractor_bills', b.id, fetchContractorBills)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ৫. ট্যাব ৩: সাপ্তাহিক মজুরি রেজিস্টার */}
        {activeTab === 'WAGES' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">সাপ্তাহিক মিস্ত্রি মজুরি রেজিস্টার (Labour Wage Sheet)</h3>
                <p className="text-xs text-slate-500">মোট হাজিরা দিন, ওভারটাইম ও খোরাকি/অগ্রিম কর্তন বাদে নিট মজুরি</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">সপ্তাহের তারিখ</th>
                    <th className="p-3">দলের সর্দার / নাম</th>
                    <th className="p-3">ট্রেড / ধরন</th>
                    <th className="p-3 text-center">মোট হাজিরা</th>
                    <th className="p-3 text-right">দৈনিক রেট</th>
                    <th className="p-3 text-right">ওভারটাইম</th>
                    <th className="p-3 text-right">মোট মজুরি</th>
                    <th className="p-3 text-right text-rose-600">অগ্রিম কর্তন</th>
                    <th className="p-3 text-right font-bold text-emerald-700">নিট প্রদেয়</th>
                    <th className="p-3 text-center">স্ট্যাটাস</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWages.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400">কোনো সাপ্তাহিক মজুরি রেকর্ড নেই।</td>
                    </tr>
                  ) : (
                    filteredWages.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 whitespace-nowrap font-medium text-slate-600">
                          <span style={bnSafeStyle}>{toBengaliNumber(w.weekStartDate)}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{w.gangLeaderName}</span>
                          {w.phone && <span className="text-[10px] text-slate-400">{w.phone}</span>}
                        </td>
                        <td className="p-3 text-slate-600">{w.trade}</td>
                        <td className="p-3 text-center font-bold text-slate-800" style={bnSafeStyle}>
                          {toBengaliNumber(w.totalDays)} জন-দিন
                        </td>
                        <td className="p-3 text-right text-slate-600 whitespace-nowrap">
                          ৳<span style={bnSafeStyle}>{toBengaliCurrency(w.dailyRate)}</span>
                        </td>
                        <td className="p-3 text-right text-slate-600 whitespace-nowrap">
                          ৳<span style={bnSafeStyle}>{toBengaliCurrency(w.overtimeBill || 0)}</span>
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                          ৳<span style={bnSafeStyle}>{toBengaliCurrency(w.grossAmount)}</span>
                        </td>
                        <td className="p-3 text-right text-rose-600 font-semibold whitespace-nowrap">
                          -৳<span style={bnSafeStyle}>{toBengaliCurrency(w.advancePaid)}</span>
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                          ৳<span style={bnSafeStyle}>{toBengaliCurrency(w.netPayable)}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleWageStatus(w.id, w.paymentStatus)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                              w.paymentStatus === 'পরিশোধিত'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            }`}
                            title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                          >
                            {w.paymentStatus}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {w.paymentStatus === 'বকেয়া' && (
                              <button
                                onClick={() => {
                                  setSelectedWageForUpdate(w);
                                  setExtraAdvanceInput('');
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-semibold cursor-pointer"
                                title="নতুন খোরাকি বা আংশিক পেমেন্ট যোগ করুন"
                              >
                                +খোরাকি/পেমেন্ট
                              </button>
                            )}
                            <button
                              onClick={() => handlePrintSingleWage(w)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="মজুরি স্লিপ প্রিন্ট"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem('weekly_wages', w.id, fetchWages)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* পপআপ মডাল ১: কন্ট্রাক্টর বকেয়া বিল পরিশোধ */}
      {selectedBillForPay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">কন্ট্রাক্টর বকেয়া পরিশোধ</h3>
                <p className="text-xs text-slate-500">{selectedBillForPay.contractorName} ({selectedBillForPay.billNo})</p>
              </div>
              <button onClick={() => setSelectedBillForPay(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-3 flex justify-between">
              <span>বর্তমান বকেয়া:</span>
              <strong className="text-rose-600 text-sm">৳{toBengaliCurrency(selectedBillForPay.dueAmount)}</strong>
            </div>

            <form onSubmit={handlePayContractorDue} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">এখন পরিশোধের পরিমাণ (৳) *</label>
                <input 
                  type="number" 
                  required 
                  autoFocus
                  max={selectedBillForPay.dueAmount}
                  value={billPayAmount}
                  onChange={e => setBillPayAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-bold border-slate-300 outline-none"
                  placeholder="টাকার পরিমাণ"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">পরিশোধের তারিখ *</label>
                <input 
                  type="date" 
                  required 
                  value={billPayDate}
                  onChange={e => setBillPayDate(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">নোট / চেক বা ভাউচার নং</label>
                <input 
                  type="text" 
                  value={billPayNote}
                  onChange={e => setBillPayNote(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: ২য় কিস্তি নগদ প্রদান"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedBillForPay(null)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  পেমেন্ট নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* পপআপ মডাল ২: কন্ট্রাক্টর বিলের পেমেন্ট হিস্ট্রি */}
      {historyBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">রানিং বিল পেমেন্ট হিস্ট্রি</h3>
                <p className="text-xs text-slate-500">{historyBill.contractorName} — বিল: {historyBill.billNo}</p>
              </div>
              <button onClick={() => setHistoryBill(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 max-h-60 overflow-y-auto space-y-2">
              {!historyBill.payments || historyBill.payments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">কোনো পেমেন্ট রেকর্ড নেই।</p>
              ) : (
                historyBill.payments.map((p, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{p.note || 'কিস্তি পরিশোধ'}</p>
                      <p className="text-[10px] text-slate-400">তারিখ: {toBengaliNumber(p.date)}</p>
                    </div>
                    <span className="font-bold text-emerald-700">৳{toBengaliCurrency(p.amount)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex justify-between text-xs font-bold">
              <span>মোট পরিশোধ: ৳{toBengaliCurrency(historyBill.paidAmount)}</span>
              <span className="text-rose-600">বকেয়া: ৳{toBengaliCurrency(historyBill.dueAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* পপআপ মডাল ৩: সাপ্তাহিক মজুরির অতিরিক্ত অগ্রিম/খোরাকি যোগ */}
      {selectedWageForUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">খোরাকি বা আংশিক মজুরি প্রদান</h3>
                <p className="text-xs text-slate-500">সর্দার: {selectedWageForUpdate.gangLeaderName}</p>
              </div>
              <button onClick={() => setSelectedWageForUpdate(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-3 flex justify-between">
              <span>অবশিষ্ট প্রদেয় নিট মজুরি:</span>
              <strong className="text-emerald-700 text-sm">৳{toBengaliCurrency(selectedWageForUpdate.netPayable)}</strong>
            </div>

            <form onSubmit={handleUpdateWageAdvance} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">প্রদানকৃত টাকা (৳) *</label>
                <input 
                  type="number" 
                  required 
                  autoFocus
                  value={extraAdvanceInput}
                  onChange={e => setExtraAdvanceInput(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-bold border-slate-300 outline-none"
                  placeholder="টাকার পরিমাণ"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedWageForUpdate(null)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  হিসাব আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* পপআপ মডাল ৪: দৈনিক হাজিরা এন্ট্রি */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">আজকের লেবার হাজিরা এন্ট্রি</h3>
              <button onClick={() => setShowAttendanceModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAttendance} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">তারিখ *</label>
                  <input 
                    type="date" 
                    required 
                    value={attendanceForm.date}
                    onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">কাজের ফ্লোর *</label>
                  <input 
                    type="text" 
                    required 
                    value={attendanceForm.floor}
                    onChange={e => setAttendanceForm({...attendanceForm, floor: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="যেমন: ৪র্থ তলা ছাদ"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">দায়িত্বপ্রাপ্ত সর্দার / সুপারভাইজার</label>
                <input 
                  type="text" 
                  value={attendanceForm.supervisorName}
                  onChange={e => setAttendanceForm({...attendanceForm, supervisorName: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: জামাল সর্দার"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-600">রাজমিস্ত্রি সংখ্যা</label>
                  <input 
                    type="number" 
                    value={attendanceForm.masonCount}
                    onChange={e => setAttendanceForm({...attendanceForm, masonCount: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">রডমিস্ত্রি সংখ্যা</label>
                  <input 
                    type="number" 
                    value={attendanceForm.rodBinderCount}
                    onChange={e => setAttendanceForm({...attendanceForm, rodBinderCount: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block truncate">শাটারিং মিস্ত্রি</label>
                  <input 
                    type="number" 
                    value={attendanceForm.shutteringCount}
                    onChange={e => setAttendanceForm({...attendanceForm, shutteringCount: e.target.value})}
                    className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block truncate">ইলেকট্রিক/প্লাম্বার</label>
                  <input 
                    type="number" 
                    value={attendanceForm.electricPlumberCount}
                    onChange={e => setAttendanceForm({...attendanceForm, electricPlumberCount: e.target.value})}
                    className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block truncate">সাধারণ হেল্পার</label>
                  <input 
                    type="number" 
                    value={attendanceForm.helperCount}
                    onChange={e => setAttendanceForm({...attendanceForm, helperCount: e.target.value})}
                    className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">মোট ওভারটাইম (ঘণ্টা)</label>
                  <input 
                    type="number" 
                    value={attendanceForm.overtimeHours}
                    onChange={e => setAttendanceForm({...attendanceForm, overtimeHours: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">কাজের সংক্ষিপ্ত নোট</label>
                  <input 
                    type="text" 
                    value={attendanceForm.note}
                    onChange={e => setAttendanceForm({...attendanceForm, note: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="যেমন: কলাম ঢালাই ও কিউরিং"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAttendanceModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  হাজিরা সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* পপআপ মডাল ৫: সাব-কন্ট্রাক্টর রানিং বিল (MB) তৈরি */}
      {showBillModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">নতুন রানিং বিল (MB) তৈরি করুন</h3>
              <button onClick={() => setShowBillModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBill} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">কন্ট্রাক্টরের নাম *</label>
                  <input 
                    type="text" 
                    required 
                    value={billForm.contractorName}
                    onChange={e => setBillForm({...billForm, contractorName: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="যেমন: মেসার্স রহিম কন্সট্রাকশন"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">মোবাইল নম্বর</label>
                  <input 
                    type="text" 
                    value={billForm.contractorPhone}
                    onChange={e => setBillForm({...billForm, contractorPhone: toBengaliNumber(e.target.value)})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="০১৭১xxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">ফ্লোর / স্থান *</label>
                  <input 
                    type="text" 
                    required 
                    value={billForm.floor}
                    onChange={e => setBillForm({...billForm, floor: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="যেমন: ৪র্থ তলা"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">বিল নম্বর (ঐচ্ছিক)</label>
                  <input 
                    type="text" 
                    value={billForm.billNo}
                    onChange={e => setBillForm({...billForm, billNo: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="যেমন: RA-101"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">কাজের বিবরণ *</label>
                <input 
                  type="text" 
                  required 
                  value={billForm.workDescription}
                  onChange={e => setBillForm({...billForm, workDescription: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: ৪র্থ তলার ছাদ ও কলাম শাটারিং কাজ"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">একক (Unit)</label>
                  <select 
                    value={billForm.unit}
                    onChange={e => setBillForm({...billForm, unit: e.target.value})}
                    className="w-full mt-1 px-2 py-1.5 border rounded-lg text-xs border-slate-300 outline-none bg-white font-medium"
                  >
                    <option value="Sft">স্কয়ার ফিট (Sft)</option>
                    <option value="Rft">রানিং ফিট (Rft)</option>
                    <option value="Cft">সিএফটি (Cft)</option>
                    <option value="Ton">টন (Ton)</option>
                    <option value="Nos">সংখ্যা (Nos)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">পরিমাপ (Qty) *</label>
                  <input 
                    type="number" 
                    required 
                    value={billForm.quantity}
                    onChange={e => setBillForm({...billForm, quantity: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none font-bold"
                    placeholder="৩৫০০"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">দর (Rate ৳) *</label>
                  <input 
                    type="number" 
                    required 
                    value={billForm.rate}
                    onChange={e => setBillForm({...billForm, rate: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none font-bold"
                    placeholder="৩৫"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">প্রাথমিক পরিশোধ (৳)</label>
                  <input 
                    type="number" 
                    value={billForm.paidAmount}
                    onChange={e => setBillForm({...billForm, paidAmount: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">তারিখ *</label>
                  <input 
                    type="date" 
                    required 
                    value={billForm.date}
                    onChange={e => setBillForm({...billForm, date: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowBillModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  বিল তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* পপআপ মডাল ৬: সাপ্তাহিক মজুরি তৈরি */}
      {showWageModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">সাপ্তাহিক মজুরি রেজিস্টার এন্ট্রি</h3>
              <button onClick={() => setShowWageModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWage} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">সপ্তাহ শুরুর তারিখ *</label>
                  <input 
                    type="date" 
                    required 
                    value={wageForm.weekStartDate}
                    onChange={e => setWageForm({...wageForm, weekStartDate: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">কাজের ধরন (Trade) *</label>
                  <select 
                    value={wageForm.trade}
                    onChange={e => setWageForm({...wageForm, trade: e.target.value})}
                    className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs border-slate-300 outline-none bg-white font-medium"
                  >
                    <option value="রাজমিস্ত্রি দল">রাজমিস্ত্রি দল</option>
                    <option value="রডমিস্ত্রি দল">রডমিস্ত্রি দল</option>
                    <option value="শাটারিং মিস্ত্রি দল">শাটারিং মিস্ত্রি দল</option>
                    <option value="ইলেকট্রিক ও প্লাম্বিং দল">ইলেকট্রিক ও প্লাম্বিং দল</option>
                    <option value="টাইলস ও ফিনিশিং মিস্ত্রি">টাইলস ও ফিনিশিং মিস্ত্রি</option>
                    <option value="মাটি কাটা ও ঢালাই লেবার">মাটি কাটা ও ঢালাই লেবার</option>
                    <option value="হেল্পার গ্রুপ">হেল্পার গ্রুপ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">দলের সর্দার / মিস্ত্রির নাম *</label>
                  <input 
                    type="text" 
                    required 
                    value={wageForm.gangLeaderName}
                    onChange={e => setWageForm({...wageForm, gangLeaderName: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="যেমন: জামাল সর্দার"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">মোবাইল নম্বর</label>
                  <input 
                    type="text" 
                    value={wageForm.phone}
                    onChange={e => setWageForm({...wageForm, phone: toBengaliNumber(e.target.value)})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="০১৭১xxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">মোট হাজিরা (জন-দিন) *</label>
                  <input 
                    type="number" 
                    required 
                    value={wageForm.totalDays}
                    onChange={e => setWageForm({...wageForm, totalDays: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none font-bold"
                    placeholder="যেমন: ১৮"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">দৈনিক গড় রেট (৳) *</label>
                  <input 
                    type="number" 
                    required 
                    value={wageForm.dailyRate}
                    onChange={e => setWageForm({...wageForm, dailyRate: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none font-bold"
                    placeholder="যেমন: ৮৫০"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">মোট ওভারটাইম বিল (৳)</label>
                  <input 
                    type="number" 
                    value={wageForm.overtimeBill}
                    onChange={e => setWageForm({...wageForm, overtimeBill: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">অগ্রিম / খোরাকি কর্তন (৳)</label>
                  <input 
                    type="number" 
                    value={wageForm.advancePaid}
                    onChange={e => setWageForm({...wageForm, advancePaid: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowWageModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  মজুরি সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== প্রিন্ট ভিউ সেকশন ==================== */}
      <div className="hidden print:block print-area p-8 max-w-4xl mx-auto border-2 border-slate-900 bg-white text-black font-sans">
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
          <p className="text-xs font-semibold tracking-widest">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <h1 className="text-2xl font-black mt-0.5">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট নির্মাণ প্রকল্প</h1>
          <p className="text-xs text-slate-700">জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন, ময়মনসিংহ।</p>
          <div className="inline-block border border-slate-900 px-4 py-1 mt-2 font-bold text-sm bg-slate-100">
            {printMode === 'SINGLE_BILL' ? 'সাব-কন্ট্রাক্টর রানিং বিল ভাউচার (MB Slip)' :
             printMode === 'SINGLE_WAGE' ? 'সাপ্তাহিক মিস্ত্রি মজুরি পেমেন্ট স্লিপ' :
             'লেবার হাজিরা, মজুরি ও কন্ট্রাক্টর রানিং বিল মেজারমেন্ট শিট'}
          </div>
        </div>

        {/* মোড ১: সিঙ্গেল কন্ট্রাক্টর বিল ভাউচার প্রিন্ট */}
        {printMode === 'SINGLE_BILL' && printData && (
          <div>
            <div className="flex justify-between text-xs mb-4 border-b pb-2 border-slate-400">
              <div>
                <p><strong>বিল নং:</strong> {printData.billNo}</p>
                <p><strong>কন্ট্রাক্টরের নাম:</strong> {printData.contractorName}</p>
                <p><strong>মোবাইল:</strong> {printData.contractorPhone || '—'}</p>
              </div>
              <div className="text-right">
                <p><strong>তারিখ:</strong> {toBengaliNumber(printData.date)}</p>
                <p><strong>ফ্লোর:</strong> {printData.floor || '—'}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-slate-900 mb-6">
              <thead className="bg-slate-100 font-bold border-b border-slate-900">
                <tr>
                  <th className="p-2 border-r border-slate-900">কাজের বিবরণ</th>
                  <th className="p-2 border-r border-slate-900 text-right">পরিমাপ (Qty)</th>
                  <th className="p-2 border-r border-slate-900 text-right">দর (Rate)</th>
                  <th className="p-2 text-right">মোট বিল (৳)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-400">
                  <td className="p-3 border-r border-slate-400 font-semibold">{printData.workDescription}</td>
                  <td className="p-3 border-r border-slate-400 text-right">{toBengaliCurrency(printData.quantity)} {printData.unit}</td>
                  <td className="p-3 border-r border-slate-400 text-right">৳{toBengaliCurrency(printData.rate)}</td>
                  <td className="p-3 text-right font-black">৳{toBengaliCurrency(printData.totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between bg-slate-50 border border-slate-900 p-3 text-xs mb-10">
              <span><strong>মোট পরিশোধিত:</strong> ৳{toBengaliCurrency(printData.paidAmount)}</span>
              <span><strong>বর্তমান বকেয়া:</strong> ৳{toBengaliCurrency(printData.dueAmount)}</span>
            </div>
          </div>
        )}

        {/* মোড ২: সিঙ্গেল সাপ্তাহিক মজুরি স্লিপ প্রিন্ট */}
        {printMode === 'SINGLE_WAGE' && printData && (
          <div>
            <div className="flex justify-between text-xs mb-4 border-b pb-2 border-slate-400">
              <div>
                <p><strong>দলের সর্দার:</strong> {printData.gangLeaderName}</p>
                <p><strong>ট্রেড / বিভাগ:</strong> {printData.trade}</p>
              </div>
              <div className="text-right">
                <p><strong>সপ্তাহ শুরুর তারিখ:</strong> {toBengaliNumber(printData.weekStartDate)}</p>
                <p><strong>স্ট্যাটাস:</strong> {printData.paymentStatus}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-slate-900 mb-8">
              <thead className="bg-slate-100 font-bold border-b border-slate-900">
                <tr>
                  <th className="p-2 border-r border-slate-900">মোট হাজিরা</th>
                  <th className="p-2 border-r border-slate-900 text-right">দৈনিক রেট</th>
                  <th className="p-2 border-r border-slate-900 text-right">ওভারটাইম</th>
                  <th className="p-2 border-r border-slate-900 text-right">মোট মজুরি</th>
                  <th className="p-2 border-r border-slate-900 text-right">অগ্রিম কর্তন</th>
                  <th className="p-2 text-right">নিট প্রদেয় (৳)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-400">
                  <td className="p-3 border-r border-slate-400 font-bold">{toBengaliNumber(printData.totalDays)} জন-দিন</td>
                  <td className="p-3 border-r border-slate-400 text-right">৳{toBengaliCurrency(printData.dailyRate)}</td>
                  <td className="p-3 border-r border-slate-400 text-right">৳{toBengaliCurrency(printData.overtimeBill || 0)}</td>
                  <td className="p-3 border-r border-slate-400 text-right">৳{toBengaliCurrency(printData.grossAmount)}</td>
                  <td className="p-3 border-r border-slate-400 text-right">-৳{toBengaliCurrency(printData.advancePaid)}</td>
                  <td className="p-3 text-right font-black">৳{toBengaliCurrency(printData.netPayable)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* মোড ৩: সম্পূর্ণ শিট প্রিন্ট */}
        {printMode === 'FULL_REPORT' && (
          <div>
            <h3 className="font-bold text-sm mb-2 border-b pb-1">১. কন্ট্রাক্টর রানিং বিল ও পরিমাপ বিবরণী (MB Record)</h3>
            <table className="w-full text-left text-xs border border-slate-900 mb-6">
              <thead className="bg-slate-100 font-bold border-b border-slate-900">
                <tr>
                  <th className="p-2 border-r border-slate-900">বিল নং</th>
                  <th className="p-2 border-r border-slate-900">কন্ট্রাক্টর ও কাজ</th>
                  <th className="p-2 border-r border-slate-900 text-right">মেজারমেন্ট</th>
                  <th className="p-2 border-r border-slate-900 text-right">মোট বিল</th>
                  <th className="p-2 border-r border-slate-900 text-right">পরিশোধিত</th>
                  <th className="p-2 text-right">বকেয়া (৳)</th>
                </tr>
              </thead>
              <tbody>
                {contractorBills.map((b, i) => (
                  <tr key={i} className="border-b border-slate-400">
                    <td className="p-2 border-r border-slate-400 font-bold">{b.billNo}</td>
                    <td className="p-2 border-r border-slate-400">{b.contractorName} ({b.workDescription})</td>
                    <td className="p-2 border-r border-slate-400 text-right">{toBengaliCurrency(b.quantity)} {b.unit}</td>
                    <td className="p-2 border-r border-slate-400 text-right">৳{toBengaliCurrency(b.totalAmount)}</td>
                    <td className="p-2 border-r border-slate-400 text-right">৳{toBengaliCurrency(b.paidAmount)}</td>
                    <td className="p-2 text-right font-bold">৳{toBengaliCurrency(b.dueAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-bold text-sm mb-2 border-b pb-1">২. সাপ্তাহিক মজুরি সারসংক্ষেপ</h3>
            <table className="w-full text-left text-xs border border-slate-900 mb-8">
              <thead className="bg-slate-100 font-bold border-b border-slate-900">
                <tr>
                  <th className="p-2 border-r border-slate-900">দলের সর্দার</th>
                  <th className="p-2 border-r border-slate-900">কাজের ধরন</th>
                  <th className="p-2 border-r border-slate-900 text-center">হাজিরা দিন</th>
                  <th className="p-2 border-r border-slate-900 text-right">মোট মজুরি</th>
                  <th className="p-2 border-r border-slate-900 text-right">অগ্রিম কর্তন</th>
                  <th className="p-2 text-right">নিট প্রদেয় (৳)</th>
                </tr>
              </thead>
              <tbody>
                {weeklyWages.map((w, i) => (
                  <tr key={i} className="border-b border-slate-400">
                    <td className="p-2 border-r border-slate-400 font-semibold">{w.gangLeaderName}</td>
                    <td className="p-2 border-r border-slate-400">{w.trade}</td>
                    <td className="p-2 border-r border-slate-400 text-center">{toBengaliNumber(w.totalDays)}</td>
                    <td className="p-2 border-r border-slate-400 text-right">৳{toBengaliCurrency(w.grossAmount)}</td>
                    <td className="p-2 border-r border-slate-400 text-right">৳{toBengaliCurrency(w.advancePaid)}</td>
                    <td className="p-2 text-right font-black">৳{toBengaliCurrency(w.netPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-3 pt-16 text-center text-xs font-semibold text-slate-800">
          <div>
            <div className="w-36 border-t border-slate-800 mx-auto pt-1">সর্দার / কন্ট্রাক্টর স্বাক্ষর</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-800 mx-auto pt-1">সাইট ইঞ্জিনিয়ার / হিসাবরক্ষক</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-800 mx-auto pt-1">মুতাওয়াল্লী / সভাপতি</div>
          </div>
        </div>
      </div>
    </div>
  );
}