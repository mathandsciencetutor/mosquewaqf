'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Building2, 
  HandCoins, 
  Wallet, 
  LogOut, 
  ArrowUpRight
} from 'lucide-react';

// ইংরেজি সংখ্যাকে বাংলায় রূপান্তর
function toBengaliNumber(num) {
  if (num === undefined || num === null || num === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[d]);
}

// টাকার ফরম্যাটিং (লাখ/কোটি ফরম্যাট)
function toBengaliCurrency(amount) {
  if (!amount) return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const n = Number(amount) || 0;
  return n.toLocaleString('en-IN').replace(/\d/g, (d) => banglaDigits[d]);
}

const bnSafeStyle = {
  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif",
  display: 'inline-block',
  lineHeight: '1.4'
};

export default function AdminHub() {
  const [loading, setLoading] = useState(true);
  const [donorStats, setDonorStats] = useState({ totalCollected: 0, totalDonors: 0 });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        // চাঁদা আদায় থেকে মোট সংগ্রহ রিয়েলটাইম আনা
        try {
          const snapshot = await getDocs(collection(db, 'donors'));
          let collected = 0;
          snapshot.forEach(doc => {
            collected += Number(doc.data().paidAmount || 0);
          });
          setDonorStats({
            totalCollected: collected,
            totalDonors: snapshot.size
          });
        } catch (e) {
          console.error("Donor data fetch error:", e);
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 font-medium text-sm">
        অ্যাডমিন প্যানেল লোড হচ্ছে...
      </div>
    );
  }

  // ফোকাসড মূল মডিউল
  const coreModules = [
    {
      id: 'finance',
      title: 'ফিন্যান্স ও অ্যাকাউন্টস',
      badge: 'কোর একাউন্টিং',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'ডেইলি ক্যাশ বুক, ডেবিট/ক্রেডিট ভাউচার, খাতভিত্তিক লেজার বিবরণী (সিমেন্ট, রড, লেবার খরচ) ও প্রিন্ট হাব।',
      icon: Wallet,
      iconColor: 'bg-blue-600 text-white',
      href: '/admin/finance',
      statLabel: 'হিসাব ও ক্যাশ বুক',
      statValue: 'রিয়েল-টাইম ব্যালেন্স ও লেজার'
    },
    {
      id: 'chada',
      title: 'চাঁদা ও অনুদান আদায়',
      badge: 'মোহতামীম সাহেবের জন্য',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'দাতা নিবন্ধন, কিস্তি গ্রহণ, মানি রিসিট প্রিন্ট, ১ লক্ষ+ দাতা ও ক্যাটাগরি অনুযায়ী ডোনার রেজিস্ট্রি।',
      icon: HandCoins,
      iconColor: 'bg-emerald-600 text-white',
      href: '/admin/chada-aday',
      statLabel: 'মোট সংগৃহীত অনুদান',
      statValue: `৳${toBengaliCurrency(donorStats.totalCollected)} (${toBengaliNumber(donorStats.totalDonors)} জন দাতা)`
    },
    {
      id: 'materials',
      title: 'নির্মাণ সামগ্রীর মূল্য তালিকা',
      badge: 'বাজারদর আপডেট: মোহতামীম সাহেবের জন্য',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'রড, সিমেন্ট, ইট, বালির বর্তমান বাজারদর ও মূল্য তালিকা যুক্ত এবং প্রতিনিয়ত আপডেট করার সুবিধা।',
      icon: Building2,
      iconColor: 'bg-amber-600 text-white',
      href: '/admin/materials-price',
      statLabel: 'পণ্য ও মূল্য তালিকা',
      statValue: 'সক্রিয় বাজারদর রেজিস্টার'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* এই লিংকে ক্লিক করলে হোমপেইজে চলে যাবে */}
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition group">
            <div className="w-10 h-10 bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider leading-none">
                জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন
              </p>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight mt-0.5 group-hover:text-emerald-700 transition-colors">
                আব্দুল হাকিম ওয়াক্‌ফ এস্টেট অ্যাকাউন্টস পোর্টাল
              </h1>
            </div>
          </Link>

          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> 
            <span>লগআউট</span>
          </button>
        </div>
      </header>

      {/* মূল কন্টেন্ট */}
      <main className="max-w-5xl mx-auto px-4 mt-8">
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">স্বাগতম, অ্যাডমিন প্যানেল</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            আপনার কাঙ্ক্ষিত কার্যক্রমে প্রবেশ করতে নিচের যেকোনো একটি অপশনে ক্লিক করুন।
          </p>
        </div>

        {/* মডিউল কার্ডসমূহ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {coreModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div 
                key={mod.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${mod.iconColor} rounded-2xl flex items-center justify-center shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{mod.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">{mod.description}</p>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-5 text-xs">
                    <span className="text-slate-400 font-medium block text-[11px]">{mod.statLabel}</span>
                    <strong className="text-slate-900 font-bold text-sm mt-0.5 block">{mod.statValue}</strong>
                  </div>
                </div>

                <Link 
                  href={mod.href}
                  className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-emerald-800 text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer"
                >
                  <span>মডিউলে প্রবেশ করুন</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}