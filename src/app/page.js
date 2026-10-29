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
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ফায়ারবেস থেকে ডোনারদের তালিকা লোড করা
  useEffect(() => {
    async function loadPublicDonors() {
      try {
        const q = query(collection(db, 'donors'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDonors(list);
      } catch (err) {
        console.error('তথ্য লোড করতে সমস্যা হয়েছে:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPublicDonors();
  }, []);

  // সর্বমোট হিসাব
  const totalCollected = donors.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalPledged = donors.reduce((acc, curr) => acc + (Number(curr.pledgedAmount) || 0), 0);
  const confirmedDonorsCount = donors.filter(d => (Number(d.paidAmount) || 0) > 0).length;

  // শুধুমাত্র যারা অনুদান জমা দিয়েছেন তাদের তালিকা ও সার্চ
  const verifiedDonors = donors.filter(d => (Number(d.paidAmount) || 0) > 0);
  const filteredDonors = verifiedDonors.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ১. টপ হেডার ও নেভিগেশন */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-bold text-lg md:text-xl text-emerald-950 leading-tight">
                আব্দুল হাকিম ওয়াকফ স্টেট
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা কমপ্লেক্স
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow hover:shadow-md cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>অ্যাডমিন লগইন</span>
          </Link>
        </div>
      </header>

      {/* ২. হিরো সেকশন */}
      <section className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 text-white py-14 px-4 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-emerald-700/60 border border-emerald-500/30 text-emerald-100 mb-4 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-amber-300" />
            সাদাকায়ে জারিয়ার উত্তম ক্ষেত্র
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4 text-white">
            ওয়াকফ তহবিল ও দানবীর সম্মাননা পোর্টাল
          </h2>
          <p className="text-sm md:text-base text-emerald-100/90 leading-relaxed max-w-2xl mx-auto mb-6">
            জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসার সার্বিক উন্নয়নে সম্মানিত শুভাকাঙ্ক্ষী ও দানবীরদের প্রত্যক্ষ অবদান এখানে স্বচ্ছতার সাথে সংরক্ষিত।
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="#public-dashboard"
              className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              দানবীর তালিকা দেখুন
            </a>
            <a
              href="#donation-details"
              className="bg-emerald-950/50 hover:bg-emerald-950/70 text-white border border-emerald-500/40 font-semibold px-6 py-2.5 rounded-xl text-sm transition flex items-center gap-2 cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              অনুদান পাঠান
            </a>
          </div>
        </div>
      </section>

      {/* ৩. লাইভ অ্যানিমেটেড পরিসংখ্যান কার্ড */}
      <section id="public-dashboard" className="max-w-7xl mx-auto px-4 -mt-8 relative z-20 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* কার্ড ১: মোট আদায় */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-xl flex items-center justify-between transform hover:-translate-y-1 transition duration-300">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
                সর্বমোট সংগৃহীত অনুদান
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                ৳{loading ? '...' : totalCollected.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-1">তহবিলে এখন পর্যন্ত মোট জমা হয়েছে</p>
            </div>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Coins className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          {/* কার্ড ২: অংশগ্রহণকারী দানবীর */}
          <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl flex items-center justify-between transform hover:-translate-y-1 transition duration-300">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">
                অংশগ্রহণকারী দানবীর
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                {loading ? '...' : confirmedDonorsCount} জন
              </h3>
              <p className="text-xs text-slate-400 mt-1">অনুদান প্রদান অব্যাহত রেখেছেন</p>
            </div>
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Users className="w-8 h-8" />
            </div>
          </div>

          {/* কার্ড ৩: মোট প্রতিশ্রুত অনুদান */}
          <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-xl flex items-center justify-between transform hover:-translate-y-1 transition duration-300">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
                মোট প্রতিশ্রুত অনুদান
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                ৳{loading ? '...' : totalPledged.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400 mt-1">সম্মানিত দানবীরগণ অঙ্গীকার করেছেন</p>
            </div>
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Award className="w-8 h-8" />
            </div>
          </div>

        </div>
      </section>

      {/* ৪. পাবলিক দানবীর তালিকা (শুধুমাত্র নাম, এলাকা ও জমার পরিমাণ) */}
      <section className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                সম্মানিত দানবীরদের তালিকা
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                জেলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা তহবিলে যারা অর্থায়ন করেছেন (সর্বমোট পরিশোধকৃত টাকার পরিমাণ)
              </p>
            </div>

            {/* সার্চ বক্স */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="নাম বা এলাকা দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-slate-400">তথ্য লোড হচ্ছে...</div>
          ) : filteredDonors.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">কোনো তথ্য পাওয়া যায়নি।</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-4 text-center w-12">ক্রমিক</th>
                    <th className="py-3 px-4">দানবীরের নাম</th>
                    <th className="py-3 px-4">এলাকা / ঠিকানা</th>
                    <th className="py-3 px-4 text-center">অবস্থা</th>
                    <th className="py-3 px-4 text-right">সর্বমোট দানের পরিমাণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonors.map((donor, idx) => (
                    <tr key={donor.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {donor.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {donor.address || 'ময়মনসিংহ'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          donor.category === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {donor.category === 'Paid' ? 'সম্পূর্ণ পরিশোধিত' : 'কিস্তি চলমান'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-base">
                        ৳{Number(donor.paidAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ৫. অনুদান পাঠানোর নিয়মাবলী ও ব্যাংক একাউন্ট */}
      <section id="donation-details" className="bg-emerald-50/60 border-t border-emerald-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase">
              তহবিল সংগ্রহ
            </span>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">
              অনুদান বা মাসিক কিস্তি পাঠানোর মাধ্যম
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              অনুদান পাঠানোর পর সংশ্লিষ্ট কমিটিকে অবহিত করলে আপনার নাম সরাসরি তালিকায় যুক্ত হবে।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold text-sm border-b pb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                ব্যাংক হিসাব বিবরণী
              </div>
              <div className="space-y-2 text-xs">
                <p><span className="text-slate-400 block">হিসাবের নাম:</span> <strong className="text-slate-800">আব্দুল হাকিম ওয়াকফ স্টেট</strong></p>
                <p><span className="text-slate-400 block">হিসাব নম্বর:</span> <strong className="font-mono text-slate-900 text-sm">১২৩৪-৫৬৭৮-৯১০১</strong></p>
                <p><span className="text-slate-400 block">ব্যাংক ও শাখা:</span> ইসলামী ব্যাংক বাংলাদেশ পিএলসি, ময়মনসিংহ শাখা</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold text-sm border-b pb-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                মোবাইল ব্যাংকিং
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-pink-50 rounded-xl border border-pink-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-pink-700 block text-xs">বিকাশ (সেন্ড মানি)</span>
                    <span className="font-mono font-bold text-slate-800">০১৭১xxxxxxx</span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-pink-200 font-semibold text-pink-700">পার্সোনাল</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-800 block text-xs">নগদ (সেন্ড মানি)</span>
                    <span className="font-mono font-bold text-slate-800">০১৭১xxxxxxx</span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-amber-200 font-semibold text-amber-800">পার্সোনাল</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ৬. ফুটার */}
      <footer className="bg-slate-900 text-slate-300 py-8 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div>
            <p className="font-bold text-white text-sm">আব্দুল হাকিম ওয়াকফ স্টেট</p>
            <p className="text-slate-400 mt-0.5">জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা কমপ্লেক্স, ময়মনসিংহ।</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              অ্যাডমিন লগইন
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">সর্বস্বত্ব সংরক্ষিত © {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}