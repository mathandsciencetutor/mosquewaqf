'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Building2, 
  HeartHandshake, 
  LogIn, 
  CreditCard, 
  Phone, 
  Users, 
  Coins, 
  Award, 
  Search, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Receipt, 
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
  BookOpen,
  X,
  FileText,
  Tag
} from 'lucide-react';

function toBengaliNumber(num) {
  if (num === undefined || num === null || num === '') return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[d]);
}

function toBengaliCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString('en-IN');
  return formatted.replace(/\d/g, (d) => banglaDigits[d]);
}

function formatBengaliDate(dateVal) {
  if (!dateVal) return '—';
  
  let d;
  if (dateVal?.toDate && typeof dateVal.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal?.seconds) {
    d = new Date(dateVal.seconds * 1000);
  } else if (typeof dateVal === 'string' && dateVal.includes('-')) {
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      return toBengaliNumber(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
    d = new Date(dateVal);
  } else {
    d = new Date(dateVal);
  }

  if (isNaN(d.getTime())) {
    return toBengaliNumber(dateVal);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return toBengaliNumber(`${day}/${month}/${year}`);
}

const bnSafeStyle = {
  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif",
  display: 'inline-block',
  lineHeight: '1.6',
  paddingBottom: '3px'
};

export default function HomePage() {
  const [donors, setDonors] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadPublicData() {
      try {
        const donorSnap = await getDocs(collection(db, 'donors'));
        const donorList = donorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const sortedDonors = donorList
          .filter(d => (Number(d.paidAmount) || 0) > 0)
          .sort((a, b) => (Number(b.paidAmount) || 0) - (Number(a.paidAmount) || 0));

        setDonors(sortedDonors);

        const voucherQuery = query(collection(db, 'vouchers'), orderBy('date', 'desc'));
        const voucherSnap = await getDocs(voucherQuery);
        const voucherList = voucherSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const donorVouchers = [];
        donorList.forEach(d => {
          if (d.installments && Array.isArray(d.installments)) {
            d.installments.forEach((inst, idx) => {
              donorVouchers.push({
                id: `donor-${d.id}-${idx}`,
                voucherNo: `${d.donorId || 'WQF'}-${idx+1}`,
                voucherType: 'Credit',
                date: inst.date || d.entryDate || new Date().toISOString().split('T')[0],
                head: 'চাঁদা ও অনুদান (ডোনার পেজ)',
                amount: Number(inst.amount) || 0,
                recipient: d.name,
                paymentMethod: 'ক্যাশ',
                status: 'Approved',
                isDonorEntry: true
              });
            });
          }
        });

        const combinedVouchers = [...voucherList, ...donorVouchers].sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });

        setVouchers(combinedVouchers);

        // আপনার building_materials কালেকশন থেকে আসল ডাটা ফেচ করা হচ্ছে
        const materialsSnap = await getDocs(collection(db, 'building_materials'));
        const materialsList = materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // সর্বশেষ আপডেটের সময় অনুযায়ী সাজানো
        materialsList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        
        setMaterials(materialsList);

      } catch (err) {
        console.error('তথ্য লোড করতে সমস্যা হয়েছে:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPublicData();
  }, []);

  const totalCollectedFromDonors = donors.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalPledged = donors.reduce((acc, curr) => acc + (Number(curr.pledgedAmount) || 0), 0);
  const confirmedDonorsCount = donors.length;

  const totalCashIn = vouchers
    .filter(v => v.voucherType === 'Credit' && v.status === 'Approved')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalCashOut = vouchers
    .filter(v => v.voucherType === 'Debit' && v.status === 'Approved')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalBankDeposit = vouchers
    .filter(v => v.voucherType === 'Debit' && v.status === 'Approved' && v.head === 'ব্যাংকে নগদ জমা (Bank Deposit)')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const actualProjectExpense = totalCashOut - totalBankDeposit;
  const netBalance = totalCashIn - totalCashOut;

  const filteredDonors = donors.filter(d => {
    const search = searchTerm.toLowerCase();
    const hasInInstallments = d.installments?.some(inst => 
      inst.note?.toString().toLowerCase().includes(search)
    );

    return (
      d.name?.toLowerCase().includes(search) ||
      d.address?.toLowerCase().includes(search) ||
      d.donorId?.toLowerCase().includes(search) ||
      d.receiptNo?.toString().includes(search) ||
      hasInInstallments
    );
  });

  const totalPages = Math.ceil(filteredDonors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDonors = filteredDonors.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      document.getElementById('public-dashboard-table')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[10px] sm:text-xs text-emerald-800 leading-snug line-clamp-1">
                জিলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা এর অধীন
              </p>
              <h1 className="font-bold text-xs sm:text-sm md:text-base text-slate-900 leading-tight truncate">
                আব্দুল হাকিম ওয়াক্‌ফ এস্টেট ভবন নির্মাণ
              </h1>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg transition shadow-xs shrink-0 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>লগইন</span>
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 text-white py-8 sm:py-12 px-4 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-700/60 border border-emerald-500/30 text-emerald-100 mb-3 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            সাদাকায়ে জারিয়ার উত্তম ক্ষেত্র
          </span>
          <h2 className="text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-2.5 sm:mb-4 text-white">
            ওয়াক্‌ফ তহবিল ও আর্থিক স্বচ্ছতা পোর্টাল
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-emerald-100/90 leading-relaxed max-w-2xl mx-auto mb-5 px-1">
            জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা এর অধীন <strong>আব্দুল হাকিম ওয়াক্‌ফ এস্টেট</strong> ভবন নির্মাণ কাজের সার্বিক আয়, ব্যয় ও দানবীরদের অবদান স্বচ্ছতার সাথে সংরক্ষিত।
          </p>
          
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="#finance-summary-section"
              className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              আর্থিক বিবরণী
            </a>
            <a
              href="#public-dashboard-table"
              className="bg-emerald-950/60 hover:bg-emerald-950/80 text-white border border-emerald-500/40 font-semibold px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              দানবীর তালিকা
            </a>
            <button
              onClick={() => setShowMaterialsModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer border border-blue-400/40"
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              নির্মাণ সামগ্রীর মূল্য তালিকা
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-3 sm:px-4 -mt-5 sm:-mt-7 relative z-20 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-emerald-200 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                মোট ক্যাশ গ্রহণ (In)
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                ৳{loading ? '...' : toBengaliCurrency(totalCashIn)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">ডোনার ও অন্যান্য ফান্ড আয়</p>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-rose-200 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-600 block">
                প্রকৃত প্রজেক্ট খরচ
              </span>
              <h3 className="text-lg sm:text-xl font-black text-rose-700 mt-0.5">
                ৳{loading ? '...' : toBengaliCurrency(actualProjectExpense)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">ব্যাংকে জমা বাদে আসল খরচ</p>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-teal-200 shadow-md flex items-center justify-between bg-teal-50/20">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-700 block">
                ব্যাংকে মোট জমা
              </span>
              <h3 className="text-lg sm:text-xl font-black text-teal-900 mt-0.5">
                ৳{loading ? '...' : toBengaliCurrency(totalBankDeposit)}
              </h3>
              <p className="text-[10px] text-teal-600 mt-0.5">ব্যাংক অ্যাকাউন্টে সংরক্ষিত</p>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-blue-200 shadow-md flex items-center justify-between bg-blue-50/20">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 block">
                হাতে ক্যাশ ব্যালেন্স
              </span>
              <h3 className="text-lg sm:text-xl font-black text-blue-900 mt-0.5">
                ৳{loading ? '...' : toBengaliCurrency(netBalance)}
              </h3>
              <p className="text-[10px] text-blue-600 mt-0.5">বর্তমান পেটি ক্যাশ ব্যালেন্স</p>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

        </div>
      </section>

      <section id="finance-summary-section" className="max-w-7xl mx-auto px-3 sm:px-4 pt-8 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6">
          <div className="flex justify-between items-center mb-3.5 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 shrink-0" />
                সাম্প্রতিক আয়-ব্যয় ট্রানজ্যাকশন
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">প্রজেক্টের শেষ ৫টি লেনদেনের সংক্ষিপ্ত বিবরণ</p>
            </div>
            <Link 
              href="/login" 
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition"
            >
              বিস্তারিত লেজার →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5">খাত / বিবরণ</th>
                  <th className="p-2.5">গ্রহীতা / উৎস</th>
                  <th className="p-2.5 text-center">মাধ্যম</th>
                  <th className="p-2.5 text-right">পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.slice(0, 5).map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2.5 font-medium whitespace-nowrap text-slate-600">
                      <span style={bnSafeStyle}>{toBengaliNumber(v.date)}</span>
                    </td>
                    <td className="p-2.5 font-semibold text-slate-800">
                      {v.head} {v.isDonorEntry && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">ডোনার পেজ</span>}
                    </td>
                    <td className="p-2.5 text-slate-600">{v.recipient || '—'}</td>
                    <td className="p-2.5 text-center">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                        {v.paymentMethod || 'ক্যাশ'}
                      </span>
                    </td>
                    <td className={`p-2.5 text-right font-bold whitespace-nowrap ${v.voucherType === 'Credit' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {v.voucherType === 'Credit' ? '+' : '-'}৳<span style={bnSafeStyle}>{toBengaliCurrency(v.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="public-dashboard-table" className="max-w-7xl mx-auto px-3 sm:px-4 py-8 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-slate-100 pb-3.5">
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                সম্মানিত দানবীরদের তালিকা
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                সর্বোচ্চ পরিশোধিত দানের পরিমাণের ভিত্তিতে ক্রমানুসারে প্রদর্শিত (প্রতি পাতায় ১০ জন)
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="নাম, এলাকা বা রসিদ নং..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400 font-medium">তথ্য লোড হচ্ছে...</div>
          ) : filteredDonors.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 font-medium">কোনো তথ্য পাওয়া যায়নি।</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">ক্রমিক</th>
                      <th className="py-2.5 px-3">দানবীরের নাম</th>
                      <th className="py-2.5 px-3">এলাকা / ঠিকানা</th>
                      <th className="py-2.5 px-3 text-center">অবস্থা</th>
                      <th className="py-2.5 px-3 text-center">রসিদ নং</th>
                      <th className="py-2.5 px-3 text-center">সর্বশেষ তারিখ</th>
                      <th className="py-2.5 px-3 text-right">সর্বমোট দান</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentDonors.map((donor, idx) => {
                      const latestInstallment = donor.installments && donor.installments.length > 0 
                        ? donor.installments[donor.installments.length - 1] 
                        : null;

                      const receipt = latestInstallment?.note || donor.receiptNo || null;
                      const rawDate = latestInstallment?.date || donor.createdAt || donor.date;
                      const isPaid = donor.category === 'Paid' || (Number(donor.pledgedAmount || 0) > 0 && Number(donor.paidAmount || 0) >= Number(donor.pledgedAmount || 0));

                      return (
                        <tr key={donor.id} className="hover:bg-emerald-50/40 transition">
                          <td className="py-3 px-3 text-center font-semibold text-slate-500 text-[11px]">
                            {toBengaliNumber(startIndex + idx + 1)}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 text-xs sm:text-sm">
                            {donor.name}
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {donor.address || '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isPaid 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                              {isPaid ? 'পরিশোধিত' : 'চলমান'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {receipt ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                <Receipt className="w-2.5 h-2.5 text-slate-400" />
                                #{toBengaliNumber(receipt)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {rawDate ? (
                              <div className="inline-flex items-center justify-center gap-1 text-[11px] text-slate-700 font-medium">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span style={bnSafeStyle}>
                                  {formatBengaliDate(rawDate)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-emerald-800 text-xs sm:text-sm">
                              ৳{toBengaliCurrency(donor.paidAmount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 mt-4 pt-3 gap-2.5">
                <div className="text-[10px] sm:text-xs text-slate-500">
                  মোট <span className="font-bold text-slate-800">{toBengaliNumber(filteredDonors.length)}</span> জনের মধ্যে{' '}
                  <span className="font-bold text-slate-800">{toBengaliNumber(startIndex + 1)}</span>-
                  <span className="font-bold text-slate-800">
                    {toBengaliNumber(Math.min(startIndex + itemsPerPage, filteredDonors.length))}
                  </span> দেখানো হচ্ছে
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] disabled:opacity-40 hover:bg-slate-100 transition flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      আগের
                    </button>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                      {toBengaliNumber(currentPage)}/{toBengaliNumber(totalPages)}
                    </span>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] disabled:opacity-40 hover:bg-slate-100 transition flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      পরের
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* পপ-আপ উইন্ডো: মোহতামীম সাহেবের বক্তব্যের জন্য নির্মাণ সামগ্রীর মূল্য তালিকা */}
      {showMaterialsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-auto relative animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    নির্মাণ সামগ্রীর বর্তমান বাজারদর (বক্তব্যের সহায়ক তথ্য)
                  </h3>
                  <p className="text-xs text-slate-500">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট নির্মাণ প্রকল্প</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMaterialsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-900 leading-relaxed">
              <strong>জনগণের উদ্দেশ্যে বা ওয়াজ মাহফিলে বক্তব্যের সময়:</strong> মোহতামীম সাহেব এই তালিকা থেকে বর্তমান রড, সিমেন্ট ও ইটের বাজারদর উল্লেখ করে ওয়াক্‌ফ তহবিলের গুরুত্ব ও স্বচ্ছতা তুলে ধরতে পারবেন।
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-xl border-slate-200">
              <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 sticky top-0 font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">সামগ্রীর নাম ও স্পেসিফিকেশন</th>
                  <th className="p-3 text-center">একক (Unit)</th>
                  <th className="p-3 text-right">বর্তমান মূল্য (টাকা)</th>
                  <th className="p-3 text-center">আপডেটের তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-5 text-center text-slate-400">কোনো তথ্য পাওয়া যায়নি।</td>
                  </tr>
                ) : (
                  materials.map((mat, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-600" />
                          {mat.name}
                        </div>
                        {mat.brandOrGrade && (
                          <span className="text-[10px] text-slate-500 block mt-0.5 ml-5">
                            {mat.brandOrGrade}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-medium text-slate-600">প্রতি {mat.unit}</td>
                      <td className="p-3 text-right font-black text-emerald-800 text-sm">
                        ৳<span style={bnSafeStyle}>{toBengaliCurrency(mat.price)}</span>
                      </td>
                      <td className="p-3 text-center text-slate-500 text-[11px]">
                        <span style={bnSafeStyle}>{formatBengaliDate(mat.lastUpdatedDate)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowMaterialsModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-xl font-bold transition cursor-pointer shadow-xs"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

      <section id="donation-details" className="bg-emerald-50/60 border-t border-emerald-100 py-8 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-5">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
              তহবিল সংগ্রহ
            </span>
            <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-1.5">
              অনুদান বা মাসিক কিস্তি পাঠানোর মাধ্যম
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5">
              অনুদান পাঠানোর পর সংশ্লিষ্ট কমিটিকে অবহিত করলে আপনার নাম সরাসরি তালিকায় যুক্ত হবে।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 mb-2 text-emerald-800 font-bold text-xs border-b pb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                ব্যাংক হিসাব বিবরণী
              </div>
              <div className="space-y-1.5 text-[11px]">
                <p><span className="text-slate-400 block text-[10px]">হিসাবের নাম:</span> <strong className="text-slate-800">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট</strong></p>
                <p><span className="text-slate-400 block text-[10px]">হিসাব নম্বর:</span> <strong className="font-mono text-slate-900 text-xs">১২৩৪-৫৬৭৮-৯১০১</strong></p>
                <p><span className="text-slate-400 block text-[10px]">ব্যাংক ও শাখা:</span> ইসলামী ব্যাংক বাংলাদেশ পিএলসি, ময়মনসিংহ শাখা</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 mb-2 text-emerald-800 font-bold text-xs border-b pb-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                মোবাইল ব্যাংকিং
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="p-2 bg-pink-50 rounded-lg border border-pink-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-pink-700 block text-[10px]">বিকাশ (সেন্ড মানি)</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">০১৭১xxxxxxx</span>
                  </div>
                  <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-pink-200 font-semibold text-pink-700">পার্সোনাল</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-800 block text-[10px]">নগদ (সেন্ড মানি)</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">০১৭১xxxxxxx</span>
                  </div>
                  <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-amber-200 font-semibold text-amber-800">পার্সোনাল</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-300 py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] text-center md:text-left">
          <div>
            <p className="font-bold text-white text-xs">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট</p>
            <p className="text-slate-400 mt-0.5">জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা কমপ্লেক্স, ময়মনসিংহ।</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              অ্যাডমিন লগইন
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">সর্বস্বত্ব সংরক্ষিত © {toBengaliNumber(new Date().getFullYear())}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}