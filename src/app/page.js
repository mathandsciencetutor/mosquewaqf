'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
  Calendar 
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

export default function HomePage() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadPublicDonors() {
      try {
        const snap = await getDocs(collection(db, 'donors'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const sortedList = list
          .filter(d => (Number(d.paidAmount) || 0) > 0)
          .sort((a, b) => (Number(b.paidAmount) || 0) - (Number(a.paidAmount) || 0));

        setDonors(sortedList);
      } catch (err) {
        console.error('তথ্য লোড করতে সমস্যা হয়েছে:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPublicDonors();
  }, []);

  const totalCollected = donors.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalPledged = donors.reduce((acc, curr) => acc + (Number(curr.pledgedAmount) || 0), 0);
  const confirmedDonorsCount = donors.length;

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
      
      {/* ১. টপ হেডার (মোবাইলে কোনো লেখা কাটবে না ও সুন্দরভাবে ফিট হবে) */}
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

      {/* ২. হিরো সেকশন (মোবাইল ফ্রেন্ডলি ফন্ট ও প্যাডিং) */}
      <section className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 text-white py-8 sm:py-12 px-4 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-700/60 border border-emerald-500/30 text-emerald-100 mb-3 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            সাদাকায়ে জারিয়ার উত্তম ক্ষেত্র
          </span>
          <h2 className="text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-2.5 sm:mb-4 text-white">
            ওয়াক্‌ফ তহবিল ও দানবীর সম্মাননা পোর্টাল
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-emerald-100/90 leading-relaxed max-w-2xl mx-auto mb-5 px-1">
            জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা এর অধীন <strong>আব্দুল হাকিম ওয়াক্‌ফ এস্টেট</strong> ভবন নির্মাণ কাজের সার্বিক উন্নয়নে সম্মানিত শুভাকাঙ্ক্ষী ও দানবীরদের অবদান স্বচ্ছতার সাথে সংরক্ষিত।
          </p>
          <div className="flex flex-row justify-center gap-2">
            <a
              href="#public-dashboard-table"
              className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              তালিকা দেখুন
            </a>
            <a
              href="#donation-details"
              className="bg-emerald-950/60 hover:bg-emerald-950/80 text-white border border-emerald-500/40 font-semibold px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              অনুদান পাঠান
            </a>
          </div>
        </div>
      </section>

      {/* ৩. লাইভ পরিসংখ্যান কার্ড (মোবাইলে কমপ্যাক্ট) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 -mt-5 sm:-mt-7 relative z-20 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-emerald-100 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 block">
                সর্বমোট সংগৃহীত অনুদান
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                ৳{loading ? '...' : toBengaliCurrency(totalCollected)}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">তহবিলে এখন পর্যন্ত মোট জমা হয়েছে</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Coins className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-blue-100 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 block">
                অংশগ্রহণকারী দানবীর
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                {loading ? '...' : toBengaliNumber(confirmedDonorsCount)} জন
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">অনুদান প্রদান অব্যাহত রেখেছেন</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-amber-100 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 block">
                মোট প্রতিশ্রুত অনুদান
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                ৳{loading ? '...' : toBengaliCurrency(totalPledged)}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">সম্মানিত দানবীরগণ অঙ্গীকার করেছেন</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>

        </div>
      </section>

      {/* ৪. দানবীর তালিকা ও পেজিনেশন টেবিল */}
      <section id="public-dashboard-table" className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12 w-full">
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
                                <span 
                                  style={{ 
                                    fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif",
                                    display: 'inline-block',
                                    lineHeight: '1.6',
                                    paddingBottom: '3px'
                                  }}
                                >
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

              {/* পেজিনেশন */}
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

      {/* ৫. অনুদান পাঠানোর নিয়মাবলী ও ব্যাংক একাউন্ট */}
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

      {/* ৬. ফুটার */}
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