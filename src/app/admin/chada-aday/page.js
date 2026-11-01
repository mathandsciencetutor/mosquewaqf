'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
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
  arrayUnion, 
  serverTimestamp 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  PlusCircle, 
  LogOut, 
  Search, 
  CreditCard, 
  Phone, 
  Printer, 
  FileText, 
  X, 
  Award,
  RotateCcw,
  Calendar
} from 'lucide-react';

// ইংরেজি সংখ্যাকে বাংলা সংখ্যায় রূপান্তর
function toBengaliNumber(num) {
  if (num === undefined || num === null || num === '') return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[d]);
}

// বাংলাদেশি নিয়মে টাকার কমা ও বাংলা সংখ্যায় রূপান্তর (১,০০,০০০ / ১,০০,০০,০০০)
function toBengaliCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString('en-IN');
  return formatted.replace(/\d/g, (d) => banglaDigits[d]);
}

// তারিখ সুন্দর করে বাংলায় রূপান্তর
function formatBengaliDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return toBengaliNumber(dateStr);
    return toBengaliNumber(d.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }));
  } catch {
    return toBengaliNumber(dateStr);
  }
}

// ডোনারের প্রাসঙ্গিক তারিখ বের করার হেল্পার
// (সম্পূর্ণ পরিশোধিত হলে শেষ কিস্তির তারিখ, অন্যথায় এন্ট্রি তারিখ)
function getDonorDisplayDate(donor) {
  if (donor.installments && donor.installments.length > 0) {
    const lastInstallment = donor.installments[donor.installments.length - 1];
    if (donor.category === 'Paid' && lastInstallment?.date) {
      return lastInstallment.date;
    }
  }
  return donor.entryDate || donor.date || '';
}

// বাংলা সংখ্যার জন্য ইনলাইন সেফটি স্টাইল (১ এর নিচের অংশ কাটা রোধ করতে)
const bnSafeStyle = {
  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif",
  display: 'inline-block',
  lineHeight: '1.6',
  paddingBottom: '3px'
};

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donors, setDonors] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // পপআপ মডাল স্টেট
  const [showAddDonorModal, setShowAddDonorModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    date: new Date().toISOString().split('T')[0], // Default আজকের তারিখ
    category: 'Confirmed', // Default 'চলমান'
    pledgedAmount: '',
    initialPayment: '',
    bookNo: '',
    receiptNo: '',
  });

  const [selectedDonor, setSelectedDonor] = useState(null);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentNote, setInstallmentNote] = useState('');
  const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().split('T')[0]);

  const [historyDonor, setHistoryDonor] = useState(null);
  const [showCategoryPrintModal, setShowCategoryPrintModal] = useState(false);
  const [printCategory, setPrintCategory] = useState('ALL');
  const [activePrintView, setActivePrintView] = useState(null);

  const router = useRouter();

  // ফরম রিসেট ফাংশন
  const handleResetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Confirmed',
      pledgedAmount: '',
      initialPayment: '',
      bookNo: '',
      receiptNo: '',
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        fetchDonors();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchDonors = async () => {
    try {
      const q = query(collection(db, 'donors'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDonors(list);
    } catch (err) {
      console.error('ডাটা লোড ত্রুটি:', err);
    }
  };

  const handleAddDonor = async (e) => {
    e.preventDefault();
    try {
      const nextSerial = 1001 + donors.length;
      const generatedCode = `WQF-${nextSerial}`;
      const banglaPhone = formData.phone ? toBengaliNumber(formData.phone.trim()) : '';
      const banglaBookNo = toBengaliNumber(formData.bookNo.trim());
      const banglaReceiptNo = toBengaliNumber(formData.receiptNo.trim());

      let pledged = 0;
      let initial = 0;
      let finalCategory = formData.category;
      let installments = [];

      // ১. চলমান কিস্তি (Confirmed)
      if (formData.category === 'Confirmed') {
        pledged = Number(formData.pledgedAmount) || 0;
        initial = Number(formData.initialPayment) || 0;
        if (initial >= pledged && pledged > 0) finalCategory = 'Paid';

        if (initial > 0) {
          installments.push({
            amount: initial,
            date: formData.date,
            bookNo: banglaBookNo,
            receiptNo: banglaReceiptNo,
            note: `প্রারম্ভিক অনুদান (বই: ${banglaBookNo || '—'}, রশিদ: ${banglaReceiptNo || '—'})`
          });
        }
      } 
      // ২. এককালীন নগদ (OneTimeCash)
      else if (formData.category === 'OneTimeCash') {
        pledged = Number(formData.pledgedAmount) || 0;
        initial = pledged;
        finalCategory = 'OneTimeCash';

        if (initial > 0) {
          installments.push({
            amount: initial,
            date: formData.date,
            bookNo: banglaBookNo,
            receiptNo: banglaReceiptNo,
            note: `এককালীন নগদ আদায় (বই: ${banglaBookNo || '—'}, রশিদ: ${banglaReceiptNo || '—'})`
          });
        }
      } 
      // ৩. সম্ভাব্য ডোনার (Prospective)
      else if (formData.category === 'Prospective') {
        pledged = Number(formData.pledgedAmount) || 0;
        initial = 0;
      }

      const newDonor = {
        donorId: generatedCode,
        name: formData.name,
        phone: banglaPhone,
        address: formData.address,
        entryDate: formData.date,
        originalCategory: formData.category, // ভবিষ্যতের ট্র্যাকিংয়ের জন্য
        category: finalCategory,
        pledgedAmount: pledged,
        paidAmount: initial,
        bookNo: banglaBookNo || '',
        receiptNo: banglaReceiptNo || '',
        installments: installments,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'donors'), newDonor);

      // সফল নিবন্ধনের পর ফরম রিসেট ও পপআপ বন্ধ
      handleResetForm();
      setShowAddDonorModal(false);
      fetchDonors();
    } catch (err) {
      console.error('সংরক্ষণ ত্রুটি:', err);
    }
  };

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    if (!selectedDonor || !installmentAmount) return;

    try {
      const amount = Number(installmentAmount);
      const newPaidTotal = (selectedDonor.paidAmount || 0) + amount;
      
      let newCategory = selectedDonor.category;
      // চলমান বা সম্ভাব্য ক্যাটাগরির টাকা সম্পূর্ণ পরিশোধ হলে 'Paid' হবে
      if (newPaidTotal >= selectedDonor.pledgedAmount && selectedDonor.category !== 'OneTimeCash') {
        newCategory = 'Paid';
      } else if (selectedDonor.category === 'Prospective' && newPaidTotal > 0) {
        newCategory = 'Confirmed';
      }

      const donorRef = doc(db, 'donors', selectedDonor.id);
      await updateDoc(donorRef, {
        paidAmount: newPaidTotal,
        category: newCategory,
        installments: arrayUnion({
          amount: amount,
          date: installmentDate || new Date().toISOString().split('T')[0],
          note: installmentNote || 'কিস্তি আদায়'
        })
      });

      setSelectedDonor(null);
      setInstallmentAmount('');
      setInstallmentNote('');
      setInstallmentDate(new Date().toISOString().split('T')[0]);
      fetchDonors();
    } catch (err) {
      console.error('কিস্তি আপডেট ত্রুটি:', err);
    }
  };

  const triggerPrintReceipt = (donor) => {
    setHistoryDonor(donor);
    setActivePrintView('receipt');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const triggerPrintReport = () => {
    setShowCategoryPrintModal(false);
    setActivePrintView('report');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // ১. মোট প্রাপ্ত অনুদান (সকল ক্যাটাগরি থেকে মোট সংগৃহীত টাকা)
  const totalCollected = donors.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

  // ২. বকেয়া অনুদান (শুধুমাত্র চলমান কিস্তি 'Confirmed' ক্যাটাগরির বকেয়া টাকা)
  const totalConfirmedDue = donors
    .filter(d => d.category === 'Confirmed')
    .reduce((acc, curr) => {
      const pledged = Number(curr.pledgedAmount) || 0;
      const paid = Number(curr.paidAmount) || 0;
      const due = pledged - paid;
      return acc + (due > 0 ? due : 0);
    }, 0);

  // ফিল্টারিং লজিক (শর্ত ২: পরিশোধিত ফিল্টারে শুধুমাত্র চলমান ও সম্ভাব্য থেকে সম্পূর্ণ পরিশোধকারীরা আসবে)
  const filteredDonors = donors.filter(d => {
    const paid = Number(d.paidAmount || 0);
    const pledged = Number(d.pledgedAmount || 0);

    let matchesCategory = false;
    if (activeTab === 'ALL') {
      matchesCategory = true;
    } else if (activeTab === 'OneLakhPlus') {
      matchesCategory = paid >= 100000;
    } else if (activeTab === 'OneTimeCash') {
      // এককালীন নগদ দাতা
      matchesCategory = d.category === 'OneTimeCash' || (d.originalCategory === 'OneTimeCash');
    } else if (activeTab === 'Confirmed') {
      // চলমান (বকেয়া থাকা কিস্তি)
      matchesCategory = d.category === 'Confirmed';
    } else if (activeTab === 'Paid') {
      // ২ নম্বর শর্ত: এককালীন ছাড়া চলমান ও সম্ভাব্য ক্যাটাগরি থেকে যারা তাদের পাওনা সম্পূর্ণ পরিশোধ করেছে
      const isNotOneTime = d.category !== 'OneTimeCash' && d.originalCategory !== 'OneTimeCash';
      const isFullyPaid = paid >= pledged && pledged > 0;
      matchesCategory = isNotOneTime && (d.category === 'Paid' || isFullyPaid);
    } else if (activeTab === 'Prospective') {
      matchesCategory = d.category === 'Prospective';
    } else {
      matchesCategory = d.category === activeTab;
    }

    const matchesSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.donorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.phone && d.phone.includes(searchTerm));
    return matchesCategory && matchesSearch;
  });

  const printReportList = donors.filter(d => {
    const paid = Number(d.paidAmount || 0);
    const pledged = Number(d.pledgedAmount || 0);
    if (printCategory === 'ALL') return true;
    if (printCategory === 'OneLakhPlus') return paid >= 100000;
    if (printCategory === 'OneTimeCash') {
      return d.category === 'OneTimeCash' || (d.originalCategory === 'OneTimeCash');
    }
    if (printCategory === 'Paid') {
      const isNotOneTime = d.category !== 'OneTimeCash' && d.originalCategory !== 'OneTimeCash';
      const isFullyPaid = paid >= pledged && pledged > 0;
      return isNotOneTime && (d.category === 'Paid' || isFullyPaid);
    }
    return d.category === printCategory;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium">লোড হচ্ছে...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[10px] sm:text-xs text-emerald-700 leading-tight truncate">
              জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন
            </p>
            <h1 className="font-bold text-xs sm:text-sm md:text-base text-slate-900 leading-tight mt-0.5 truncate">
              আব্দুল হাকিম ওয়াক্‌ফ এস্টেট
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button 
              onClick={() => setShowCategoryPrintModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">রিপোর্ট প্রিন্ট</span>
              <span className="sm:hidden text-[11px]">রিপোর্ট</span>
            </button>
            <Link 
              href="/admin" 
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition"
            >
              ← অ্যাডমিন ড্যাশবোর্ড
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">লগআউট</span>
              <span className="sm:hidden text-[11px]">লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      {/* মূল স্ক্রিন */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 print:hidden">
        
        {/* ১. মোট প্রাপ্ত ও মোট বকেয়া কার্ড */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                মোট প্রাপ্ত অনুদান
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalCollected)}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                সকল ক্যাটাগরি থেকে মোট নগদ প্রাপ্ত
              </p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">
              ৳
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block">
                বকেয়া অনুদান (চলমান কিস্তি)
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                ৳<span style={bnSafeStyle}>{toBengaliCurrency(totalConfirmedDue)}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                চলমান কিস্তি দাতাদের কাছে মোট পাওনা
              </p>
            </div>
            <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">
              ৳
            </div>
          </div>
        </div>

        {/* ২. বিস্তারিত পরিসংখ্যান কার্ড */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3 mb-5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">মোট ডোনার</span>
            <p className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">
              <span style={bnSafeStyle}>{toBengaliNumber(donors.length)}</span> জন
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
            <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-0.5">
              <Award className="w-3 h-3" /> ১ লক্ষ+
            </span>
            <p className="text-lg sm:text-xl font-bold text-amber-800 mt-0.5">
              <span style={bnSafeStyle}>{toBengaliNumber(donors.filter(d => Number(d.paidAmount || 0) >= 100000).length)}</span> জন
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
            <span className="text-[10px] font-semibold text-emerald-600 uppercase block">এককালীন নগদ</span>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">
              <span style={bnSafeStyle}>
                {toBengaliNumber(donors.filter(d => d.category === 'OneTimeCash' || d.originalCategory === 'OneTimeCash').length)}
              </span> জন
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-xs">
            <span className="text-[10px] font-semibold text-blue-600 uppercase block">চলমান (কিস্তি)</span>
            <p className="text-lg sm:text-xl font-bold text-blue-700 mt-0.5">
              <span style={bnSafeStyle}>{toBengaliNumber(donors.filter(d => d.category === 'Confirmed').length)}</span> জন
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-xs">
            <span className="text-[10px] font-semibold text-teal-600 uppercase block">পরিশোধিত</span>
            <p className="text-lg sm:text-xl font-bold text-teal-700 mt-0.5">
              <span style={bnSafeStyle}>
                {toBengaliNumber(donors.filter(d => {
                  const paid = Number(d.paidAmount || 0);
                  const pledged = Number(d.pledgedAmount || 0);
                  const isNotOneTime = d.category !== 'OneTimeCash' && d.originalCategory !== 'OneTimeCash';
                  return isNotOneTime && (d.category === 'Paid' || (paid >= pledged && pledged > 0));
                }).length)}
              </span> জন
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">সম্ভাব্য</span>
            <p className="text-lg sm:text-xl font-bold text-slate-700 mt-0.5">
              <span style={bnSafeStyle}>{toBengaliNumber(donors.filter(d => d.category === 'Prospective').length)}</span> জন
            </p>
          </div>
        </div>

        {/* ৩. ডোনার তালিকা ও অ্যাকশন বার (ফুল উইডথ ক্লিন লেআউট) */}
        <div className="space-y-3">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            
            {/* সার্চ বক্স ও নতুন ডোনার বাটন */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="নাম, আইডি বা ফোন দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <button
                onClick={() => setShowAddDonorModal(true)}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>নতুন ডোনার নিবন্ধন</span>
              </button>
            </div>

            {/* ফিল্টার ট্যাব */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'ALL', label: 'সকল' },
                { id: 'OneLakhPlus', label: '★ ১ লক্ষ+' },
                { id: 'OneTimeCash', label: 'নগদ দাতা' },
                { id: 'Confirmed', label: 'চলমান' },
                { id: 'Paid', label: 'পরিশোধিত' },
                { id: 'Prospective', label: 'সম্ভাব্য' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id 
                      ? tab.id === 'OneLakhPlus' 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                      : tab.id === 'OneLakhPlus'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ডোনার কার্ডসমূহ */}
          <div className="space-y-2.5">
            {filteredDonors.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs sm:text-sm">
                কোনো ডোনার পাওয়া যায়নি।
              </div>
            ) : (
              filteredDonors.map(donor => {
                const due = (donor.pledgedAmount || 0) - (donor.paidAmount || 0);
                const isOneLakhPlus = Number(donor.paidAmount || 0) >= 100000;
                const displayDate = getDonorDisplayDate(donor);

                return (
                  <div key={donor.id} className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">{donor.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span style={bnSafeStyle}>{toBengaliNumber(donor.donorId)}</span>
                          </span>

                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            donor.category === 'OneTimeCash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            donor.category === 'Paid' ? 'bg-teal-100 text-teal-800' :
                            donor.category === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {donor.category === 'OneTimeCash' ? 'এককালীন নগদ' :
                             donor.category === 'Paid' ? 'পরিশোধিত' :
                             donor.category === 'Confirmed' ? 'চলমান কিস্তি' :
                             'সম্ভাব্য'}
                          </span>

                          {isOneLakhPlus && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                              ★ ১ লক্ষ+ দাতা
                            </span>
                          )}
                        </div>

                        {/* মোবাইল, ঠিকানা ও দানের তারিখ */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          {donor.phone ? (
                            <span className="flex items-center gap-1 font-medium">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span style={bnSafeStyle}>{toBengaliNumber(donor.phone)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">মোবাইল নেই</span>
                          )}
                          
                          {donor.address && <span>• {donor.address}</span>}
                          
                          {/* দানের তারিখ কলাম/লেবেল */}
                          <span className="flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{donor.category === 'Paid' ? 'পরিশোধের তারিখ:' : 'দানের তারিখ:'}</span>
                            <span style={bnSafeStyle} className="font-semibold">{formatBengaliDate(displayDate)}</span>
                          </span>

                          {(donor.bookNo || donor.receiptNo) && (
                            <span className="text-slate-400">
                              (বই: {donor.bookNo || '—'}, রশিদ: {donor.receiptNo || '—'})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* অ্যাকশন বাটনসমূহ */}
                      <div className="flex items-center gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button 
                          onClick={() => {
                            setHistoryDonor(donor);
                            setActivePrintView('history_modal');
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                        >
                          হিস্ট্রি (<span style={bnSafeStyle}>{toBengaliNumber(donor.installments?.length || 0)}</span>)
                        </button>

                        <button 
                          onClick={() => triggerPrintReceipt(donor)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-slate-600" /> রশিদ
                        </button>

                        {donor.category !== 'Paid' && donor.category !== 'OneTimeCash' && (
                          <button 
                            onClick={() => setSelectedDonor(donor)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-xs"
                          >
                            <CreditCard className="w-3 h-3" /> কিস্তি
                          </button>
                        )}
                      </div>
                    </div>

                    {/* টাকার হিসাব */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium text-[10px]">প্রতিশ্রুতি</span>
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">
                          ৳<span style={bnSafeStyle}>{toBengaliCurrency(donor.pledgedAmount)}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium text-[10px]">পরিশোধ</span>
                        <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                          ৳<span style={bnSafeStyle}>{toBengaliCurrency(donor.paidAmount)}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium text-[10px]">বকেয়া</span>
                        <span className={`font-bold text-xs sm:text-sm ${due > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          ৳<span style={bnSafeStyle}>{toBengaliCurrency(due > 0 ? due : 0)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* নতুন ডোনার নিবন্ধন পপআপ মডাল (রিসেট বাটনসহ) */}
      {showAddDonorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto">
            
            {/* মডাল হেডার */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" /> নতুন ডোনার নিবন্ধন
              </h3>
              <button 
                onClick={() => setShowAddDonorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ফরম */}
            <form onSubmit={handleAddDonor} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">ডোনারের নাম *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="পূর্ণ নাম লিখুন"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: toBengaliNumber(e.target.value)})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="০১৭১xxxxxxx (যদি থাকে)"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ঠিকানা (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="গ্রাম / এলাকা / ঠিকানা"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">তারিখ *</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ক্যাটাগরি নির্ধারণ করুন *</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({
                    ...formData, 
                    category: e.target.value,
                    pledgedAmount: '',
                    initialPayment: '',
                    bookNo: '',
                    receiptNo: ''
                  })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                >
                  <option value="Confirmed">চলমান (কিস্তি চলমান)</option>
                  <option value="OneTimeCash">এককালীন নগদ দাতা</option>
                  <option value="Prospective">সম্ভাব্য ডোনার (অঙ্গীকার)</option>
                </select>
              </div>

              {formData.category === 'Confirmed' && (
                <div className="space-y-2.5 pt-1 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block truncate">প্রতিশ্রুত দান (৳) *</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.pledgedAmount}
                        onChange={e => setFormData({...formData, pledgedAmount: e.target.value})}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block truncate">প্রাথমিক জমা (৳)</label>
                      <input 
                        type="number" 
                        value={formData.initialPayment}
                        onChange={e => setFormData({...formData, initialPayment: e.target.value})}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block truncate">বই নং</label>
                      <input 
                        type="text" 
                        value={formData.bookNo}
                        onChange={e => setFormData({...formData, bookNo: toBengaliNumber(e.target.value)})}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="১"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block truncate">রশিদ নং</label>
                      <input 
                        type="text" 
                        value={formData.receiptNo}
                        onChange={e => setFormData({...formData, receiptNo: toBengaliNumber(e.target.value)})}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="১০১"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.category === 'OneTimeCash' && (
                <div className="space-y-2.5 pt-1 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block">দানের পরিমাণ (৳) *</label>
                    <input 
                      type="number" 
                      required 
                      value={formData.pledgedAmount}
                      onChange={e => setFormData({...formData, pledgedAmount: e.target.value})}
                      className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="যেমন: 20000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block truncate">বই নং</label>
                      <input 
                        type="text" 
                        value={formData.bookNo}
                        onChange={e => setFormData({...formData, bookNo: toBengaliNumber(e.target.value)})}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="১"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block truncate">রশিদ নং</label>
                      <input 
                        type="text" 
                        value={formData.receiptNo}
                        onChange={e => setFormData({...formData, receiptNo: toBengaliNumber(e.target.value)})}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="১০১"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.category === 'Prospective' && (
                <div className="pt-1 border-t border-slate-100">
                  <label className="text-[11px] font-semibold text-slate-600 block">সম্ভাব্য দানের পরিমাণ (৳) (ঐচ্ছিক)</label>
                  <input 
                    type="number" 
                    value={formData.pledgedAmount}
                    onChange={e => setFormData({...formData, pledgedAmount: e.target.value})}
                    className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="যেমন: 10000"
                  />
                </div>
              )}

              {/* ৩টি বাটন: রিসেট, বাতিল এবং সাবমিট */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={handleResetForm}
                  className="flex items-center gap-1 px-3 py-2 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs rounded-xl font-semibold transition cursor-pointer"
                  title="সব তথ্য মুছে পুনরায় লিখুন"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>রিসেট</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddDonorModal(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  নিবন্ধন নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ক্যাটাগরি প্রিন্ট সিলেকশন মডাল */}
      {showCategoryPrintModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">রিপোর্ট প্রিন্ট সেটআপ</h3>
              <button onClick={() => setShowCategoryPrintModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3.5 space-y-2.5">
              <label className="text-xs font-semibold text-slate-600 block">কোন ক্যাটাগরি প্রিন্ট করবেন?</label>
              <select 
                value={printCategory} 
                onChange={(e) => setPrintCategory(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg text-xs sm:text-sm border-slate-300 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">সকল ক্যাটাগরি (All Donors)</option>
                <option value="OneLakhPlus">★ ১ লক্ষ+ দাতা (One Lakh Plus)</option>
                <option value="OneTimeCash">এককালীন নগদ দাতা (One Time Cash)</option>
                <option value="Confirmed">চলমান কিস্তি (Confirmed)</option>
                <option value="Paid">সম্পূর্ণ পরিশোধিত (Paid)</option>
                <option value="Prospective">সম্ভাব্য ডোনার (Prospective)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                মোট <span style={bnSafeStyle}>{toBengaliNumber(printReportList.length)}</span> জন ডোনারের তালিকা সিঙ্গেল টেবিলে প্রিন্ট হবে।
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button 
                onClick={() => setShowCategoryPrintModal(false)}
                className="w-1/2 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button 
                onClick={triggerPrintReport}
                className="w-1/2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-semibold transition cursor-pointer"
              >
                প্রিন্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* কিস্তি গ্রহণ মডাল */}
      {selectedDonor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-0.5">কিস্তি গ্রহণ</h3>
            <p className="text-xs text-slate-500 mb-3">{selectedDonor.name} (<span style={bnSafeStyle}>{toBengaliNumber(selectedDonor.donorId)}</span>)</p>

            <form onSubmit={handleAddInstallment} className="space-y-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-600">জমার পরিমাণ (৳) *</label>
                <input 
                  type="number" 
                  required 
                  autoFocus
                  value={installmentAmount}
                  onChange={e => setInstallmentAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                  placeholder="পরিমাণ"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">জমার তারিখ *</label>
                <input 
                  type="date" 
                  required
                  value={installmentDate}
                  onChange={e => setInstallmentDate(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">মন্তব্য / রশিদ নং</label>
                <input 
                  type="text" 
                  value={installmentNote}
                  onChange={e => setInstallmentNote(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="যেমন: রশিদ নং ১২৩৪"
                />
              </div>

              <div className="flex gap-2 pt-1.5">
                <button 
                  type="button" 
                  onClick={() => setSelectedDonor(null)}
                  className="w-1/2 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-semibold transition cursor-pointer"
                >
                  নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* প্রিন্ট ভিউ ১: মানি রিসিট */}
      {historyDonor && activePrintView === 'receipt' && (
        <div className="hidden print:block print-area p-8 max-w-3xl mx-auto border-2 border-slate-800 bg-white text-black">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
            <p className="text-xs font-semibold tracking-widest text-slate-700">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <h1 className="text-2xl font-black text-slate-900 tracking-wide mt-1">জিলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা এর অধীন</h1>
            <h2 className="text-2xl font-black text-slate-900 tracking-wide mt-1">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট</h2>
            <p className="text-xs text-slate-600">জিলা স্কুল মোড়, সদর, ময়মনসিংহ।</p>
            <div className="inline-block border-2 border-slate-900 px-4 py-1 mt-3 font-bold text-sm tracking-wide bg-slate-100">
              ভবন নির্মাণ কাজের ডোনার অনুদান আদায় ও কিস্তি বিবরণী রশিদ
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2 text-sm border-b pb-3 mb-4 border-slate-400">
            <div>
              <p><span className="font-semibold">রশিদ / আইডি নং:</span> <strong className="font-mono text-base"><span style={bnSafeStyle}>{toBengaliNumber(historyDonor.donorId)}</span></strong></p>
              <p><span className="font-semibold">ডোনারের নাম:</span> <strong className="text-base">{historyDonor.name}</strong></p>
              <p><span className="font-semibold">মোবাইল:</span> <span style={bnSafeStyle}>{toBengaliNumber(historyDonor.phone)}</span></p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">তারিখ:</span> <span style={bnSafeStyle}>{toBengaliNumber(new Date().toLocaleDateString('bn-BD'))}</span></p>
              <p><span className="font-semibold">ঠিকানা:</span> {historyDonor.address || '—'}</p>
              <p>
                <span className="font-semibold">ক্যাটাগরি: </span>
                <strong>
                  {historyDonor.category === 'OneTimeCash' ? 'এককালীন নগদ' :
                   historyDonor.category === 'Paid' ? 'পরিশোধিত' :
                   historyDonor.category === 'Confirmed' ? 'চলমান কিস্তি' : 'সম্ভাব্য'}
                  {Number(historyDonor.paidAmount || 0) >= 100000 ? ' (★ ১ লক্ষ+ দাতা)' : ''}
                </strong>
              </p>
            </div>
          </div>

          <table className="w-full text-left text-sm border border-slate-800 mb-6">
            <thead className="bg-slate-100 border-b border-slate-800 font-bold">
              <tr>
                <th className="p-2 border-r border-slate-800 text-center w-12">নং</th>
                <th className="p-2 border-r border-slate-800">তারিখ ও সময়</th>
                <th className="p-2 border-r border-slate-800">বিবরণ / রশিদ নং</th>
                <th className="p-2 text-right w-36">জমার পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              {historyDonor.installments && historyDonor.installments.length > 0 ? (
                historyDonor.installments.map((inst, idx) => (
                  <tr key={idx} className="border-b border-slate-400">
                    <td className="p-2 text-center border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(idx + 1)}</span></td>
                    <td className="p-2 border-r border-slate-400">
                      <span style={bnSafeStyle}>
                        {toBengaliNumber(new Date(inst.date).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }))}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(inst.note || 'কিস্তি আদায়')}</span></td>
                    <td className="p-2 text-right font-bold">৳<span style={bnSafeStyle}>{toBengaliCurrency(inst.amount)}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-500">কোনো কিস্তির রেকর্ড নেই</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center bg-slate-50 border border-slate-800 p-3 mb-10 text-sm">
            <div>
              <p><span className="font-semibold">প্রতিশ্রুত অনুদান:</span> ৳<span style={bnSafeStyle}>{toBengaliCurrency(historyDonor.pledgedAmount)}</span></p>
              <p><span className="font-semibold">সর্বমোট বকেয়া:</span> <strong className="text-red-700">৳<span style={bnSafeStyle}>{toBengaliCurrency((historyDonor.pledgedAmount || 0) - (historyDonor.paidAmount || 0))}</span></strong></p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block uppercase font-bold">সর্বমোট আদায়কৃত টাকা</span>
              <span className="text-xl font-black text-slate-900">৳<span style={bnSafeStyle}>{toBengaliCurrency(historyDonor.paidAmount)}</span></span>
            </div>
          </div>

          <div className="grid grid-cols-2 pt-12 text-center text-xs font-semibold text-slate-800">
            <div>
              <div className="w-48 border-t border-slate-800 mx-auto pt-1">আদায়কারী / ক্যাশিয়ার</div>
            </div>
            <div>
              <div className="w-48 border-t border-slate-800 mx-auto pt-1">মুতাওয়াল্লী / সভাপতি</div>
            </div>
          </div>
        </div>
      )}

      {/* প্রিন্ট ভিউ ২: রেজিস্ট্রি রিপোর্ট (শর্ত ১: তারিখের স্পষ্ট কলাম যুক্ত) */}
      {activePrintView === 'report' && (
        <div className="hidden print:block print-area p-4 max-w-full mx-auto bg-white text-black">
          <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
            <p className="text-xs font-semibold tracking-widest text-slate-700">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <h1 className="text-xl font-black text-slate-900 tracking-wide mt-1">জিলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা এর অধীন</h1>
            <h2 className="text-xl font-black text-slate-900 tracking-wide mt-0.5">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট</h2>
            <p className="text-xs text-slate-600">জিলা স্কুল মোড়, সদর, ময়মনসিংহ।</p>
            <div className="inline-block border-2 border-slate-900 px-4 py-1 mt-2 font-bold text-xs tracking-wide bg-slate-100">
              ভবন নির্মাণ কাজের ডোনার অনুদানের রেজিস্ট্রি রিপোর্ট
            </div>
            
            <div className="flex justify-between items-center mt-2 text-[11px] font-bold border-t pt-1 border-slate-300">
              <span>
                ক্যাটাগরি: {
                  printCategory === 'ALL' ? 'সকল ডোনার' :
                  printCategory === 'OneLakhPlus' ? '★ ১ লক্ষ+ দাতা তালিকা' :
                  printCategory === 'OneTimeCash' ? 'এককালীন নগদ দাতা' :
                  printCategory === 'Confirmed' ? 'চলমান কিস্তি' :
                  printCategory === 'Paid' ? 'সম্পূর্ণ পরিশোধিত' : 'সম্ভাব্য'
                }
              </span>
              <span>মোট ডোনার: <span style={bnSafeStyle}>{toBengaliNumber(printReportList.length)}</span> জন</span>
              <span>প্রিন্টের তারিখ: <span style={bnSafeStyle}>{toBengaliNumber(new Date().toLocaleDateString('bn-BD'))}</span></span>
            </div>
          </div>

          <table className="w-full text-left text-[11px] border border-slate-800 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-800 font-bold">
              <tr className="border-b border-slate-800">
                <th className="p-1.5 border-r border-slate-800 text-center w-8">নং</th>
                <th className="p-1.5 border-r border-slate-800 w-16">আইডি</th>
                <th className="p-1.5 border-r border-slate-800">ডোনারের নাম</th>
                <th className="p-1.5 border-r border-slate-800 w-24">মোবাইল</th>
                <th className="p-1.5 border-r border-slate-800">ঠিকানা</th>
                <th className="p-1.5 border-r border-slate-800 text-center w-24">দানের তারিখ</th>
                <th className="p-1.5 border-r border-slate-800 text-center w-20">ক্যাটাগরি</th>
                <th className="p-1.5 border-r border-slate-800 text-right w-20">প্রতিশ্রুতি (৳)</th>
                <th className="p-1.5 border-r border-slate-800 text-right w-20">আদায় (৳)</th>
                <th className="p-1.5 text-right w-20">বকেয়া (৳)</th>
              </tr>
            </thead>
            <tbody>
              {printReportList.map((donor, idx) => {
                const due = (donor.pledgedAmount || 0) - (donor.paidAmount || 0);
                const displayDate = getDonorDisplayDate(donor);

                return (
                  <tr key={donor.id} className="border-b border-slate-400 leading-tight">
                    <td className="p-1.5 text-center border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(idx + 1)}</span></td>
                    <td className="p-1.5 border-r border-slate-400 font-bold"><span style={bnSafeStyle}>{toBengaliNumber(donor.donorId)}</span></td>
                    <td className="p-1.5 border-r border-slate-400 font-bold">{donor.name}</td>
                    <td className="p-1.5 border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(donor.phone || '—')}</span></td>
                    <td className="p-1.5 border-r border-slate-400">{donor.address || '—'}</td>
                    {/* টেবিলের তারিখ কলাম */}
                    <td className="p-1.5 border-r border-slate-400 text-center font-medium">
                      <span style={bnSafeStyle}>{formatBengaliDate(displayDate)}</span>
                    </td>
                    <td className="p-1.5 border-r border-slate-400 text-center font-medium">
                      {donor.category === 'OneTimeCash' ? 'নগদ' :
                       donor.category === 'Paid' ? 'পরিশোধিত' :
                       donor.category === 'Confirmed' ? 'চলমান' : 'সম্ভাব্য'}
                    </td>
                    <td className="p-1.5 border-r border-slate-400 text-right font-medium">
                      ৳<span style={bnSafeStyle}>{toBengaliCurrency(donor.pledgedAmount)}</span>
                    </td>
                    <td className="p-1.5 border-r border-slate-400 text-right font-bold">
                      ৳<span style={bnSafeStyle}>{toBengaliCurrency(donor.paidAmount)}</span>
                    </td>
                    <td className="p-1.5 text-right font-bold">
                      ৳<span style={bnSafeStyle}>{toBengaliCurrency(due > 0 ? due : 0)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800 text-[11px]">
              <tr>
                <td colSpan={7} className="p-2 text-right border-r border-slate-800">সর্বমোট:</td>
                <td className="p-2 text-right border-r border-slate-800">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(printReportList.reduce((acc, curr) => acc + (Number(curr.pledgedAmount) || 0), 0))}</span>
                </td>
                <td className="p-2 text-right border-r border-slate-800">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(printReportList.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0))}</span>
                </td>
                <td className="p-2 text-right">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(printReportList.reduce((acc, curr) => acc + ((Number(curr.pledgedAmount) || 0) - (Number(curr.paidAmount) || 0)), 0))}</span>
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 pt-12 text-center text-xs font-semibold text-slate-800">
            <div>
              <div className="w-44 border-t border-slate-800 mx-auto pt-1">হিসাবরক্ষক / প্রস্তুতকারী</div>
            </div>
            <div>
              <div className="w-44 border-t border-slate-800 mx-auto pt-1">মুতাওয়াল্লী / সভাপতি</div>
            </div>
          </div>
        </div>
      )}

      {/* স্ক্রিনে হিস্ট্রি দেখার পপআপ */}
      {historyDonor && activePrintView === 'history_modal' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">পেমেন্ট হিস্ট্রি</h3>
                <p className="text-xs text-slate-500">{historyDonor.name} (<span style={bnSafeStyle}>{toBengaliNumber(historyDonor.donorId)}</span>)</p>
              </div>
              <button 
                onClick={() => {
                  setHistoryDonor(null);
                  setActivePrintView(null);
                }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 max-h-60 overflow-y-auto space-y-2 pr-1">
              {!historyDonor.installments || historyDonor.installments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">কোনো কিস্তি জমার হিস্ট্রি নেই।</p>
              ) : (
                historyDonor.installments.map((item, index) => (
                  <div key={index} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-800"><span style={bnSafeStyle}>{toBengaliNumber(item.note || 'কিস্তি আদায়')}</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        তারিখ: <span style={bnSafeStyle}>{item.date ? toBengaliNumber(new Date(item.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' })) : 'N/A'}</span>
                      </p>
                    </div>
                    <span className="font-bold text-emerald-700 text-xs sm:text-sm">
                      +৳<span style={bnSafeStyle}>{toBengaliCurrency(item.amount)}</span>
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">মোট পরিশোধ:</span>
              <span className="font-bold text-emerald-700 text-sm">
                ৳<span style={bnSafeStyle}>{toBengaliCurrency(historyDonor.paidAmount)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}