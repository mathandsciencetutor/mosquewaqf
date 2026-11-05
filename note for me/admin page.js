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
  Boxes, 
  CalendarClock, 
  Users, 
  FolderGit2, 
  ShieldCheck, 
  BarChart3, 
  LogOut, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  ArrowUpRight,
  Receipt,
  FileSpreadsheet
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

  // ডামি প্রজেক্ট ডেটা (ভবিষ্যতে ফায়ারস্টোর বা আলাদা কালেকশন থেকে লোড হবে)
  const projectMetrics = {
    progress: 42, // ফিজিক্যাল অগ্রগতি %
    targetProgress: 50,
    totalBudget: 25000000, // মোট অনুমোদিত বাজেট (২.৫ কোটি)
    actualExpense: 9240000, // মোট খরচ (৯২.৪ লাখ)
    currentFloor: '৪র্থ তলা ছাদ ঢালাই প্রস্তুতি',
    criticalAlertsCount: 2
  };

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

  // অবশিষ্ট ব্যালেন্স হিসাব (মোট প্রাপ্ত চাঁদা - সাইট খরচ)
  const cashInHand = donorStats.totalCollected - projectMetrics.actualExpense;

  // ৮টি মূল মডিউল তালিকা
  const modules = [
    {
      id: 'chada',
      title: 'চাঁদা ও অনুদান আদায়',
      badge: 'সক্রিয় মডিউল',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'দাতা নিবন্ধন, কিস্তি গ্রহণ, মানি রিসিট, ১ লক্ষ+ দাতা ও ক্যাটাগরি রেজিস্ট্রি প্রিন্ট।',
      icon: HandCoins,
      iconColor: 'bg-emerald-600 text-white',
      href: '/admin/chada-aday',
      active: true,
      highlight: true
    },
    {
      id: 'finance',
      title: 'ফিন্যান্স ও অ্যাকাউন্টস',
      badge: 'কোর একাউন্টিং',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'ডেইলি ক্যাশ বুক, ডেবিট ভাউচার ও লেজার, হেড-ভিত্তিক খরচ (রড, সিমেন্ট, লেবার) ও পেমেন্ট অ্যাপ্রুভাল।',
      icon: Wallet,
      iconColor: 'bg-blue-600 text-white',
      href: '/admin/finance',
      active: true
    },
    {
      id: 'inventory',
      title: 'ম্যাটেরিয়াল ও ইনভেন্টরি',
      badge: 'স্টক কন্ট্রোল',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'MRR চালান এন্ট্রি, দৈনিক কনজাম্পশন রেকর্ড, বর্তমান স্টক ব্যালেন্স, লো-স্টক অ্যালার্ট ও ভেন্ডর লেজার।',
      icon: Boxes,
      iconColor: 'bg-amber-600 text-white',
      href: '/admin/inventory',
      active: true
    },
    {
      id: 'schedule',
      title: 'প্রজেক্ট শিডিউল ও টাস্ক',
      badge: 'সাইট ডায়েরি',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      description: 'গ্যান্ট চার্ট মাইলস্টোন, সাইট ডায়েরি (আবহাওয়া ও বাধা), কোয়ালিটি চেকিং ও সিলিন্ডার টেস্ট রিপোর্ট।',
      icon: CalendarClock,
      iconColor: 'bg-indigo-600 text-white',
      href: '/admin/schedule',
      active: true
    },
    {
      id: 'workforce',
      title: 'লেবার ও সাব-কন্ট্রাক্টর',
      badge: 'হাজিরা ও বিলিং',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      description: 'দৈনিক লেবার হাজিরা, রানিং বিল (MB স্কয়ার ফিট মেজারমেন্ট) ও সাপ্তাহিক মিস্ত্রি মজুরি রেজিস্টার।',
      icon: Users,
      iconColor: 'bg-cyan-600 text-white',
      href: '/admin/workforce',
      active: true
    },
    {
      id: 'drawings',
      title: 'ড্রয়িং ও ডকুমেন্টস ভল্ট',
      badge: 'আর্কাইভ',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      description: 'অনুমোদিত আর্কিটেকচারাল/স্ট্রাকচারাল PDF ড্রয়িং, সাইট প্রগ্রেস ফটো, সিসিটিভি ও পৌরসভা অনুমোদন।',
      icon: FolderGit2,
      iconColor: 'bg-teal-600 text-white',
      href: '/admin/drawings',
      active: false
    },
    {
      id: 'roles',
      title: 'ইউজার রোল ও পারমিশন',
      badge: 'নিরাপত্তা',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'সুপার অ্যাডমিন, সাইট ইঞ্জিনিয়ার, একাউন্ট্যান্ট ও স্টোর কিপারের রোল ভিত্তিক এক্সেস কন্ট্রোল।',
      icon: ShieldCheck,
      iconColor: 'bg-purple-600 text-white',
      href: '/admin/roles',
      active: false
    },
    {
      id: 'reports',
      title: 'রিপোর্টস ও অ্যানালিটিক্স',
      badge: 'এক্সপোর্ট হাব',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      description: 'বাজেট ভ্যারিয়েন্স গ্রাফ, ম্যাটেরিয়াল অপচয় অ্যানালাইসিস এবং Excel ও PDF এক-ক্লিকে ডাউনলোড।',
      icon: BarChart3,
      iconColor: 'bg-rose-600 text-white',
      href: '/admin/reports',
      active: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider leading-none">
                জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন
              </p>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight mt-0.5">
                আব্দুল হাকিম ওয়াক্‌ফ এস্টেট নির্মাণ প্রকল্প
              </h1>
            </div>
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> 
            <span>লগআউট</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-5">
        
        {/* ১. মেইন ওভারভিউ ও কেপিআই (Executive Summary / KPI Widget) */}
        <section className="mb-6">
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-800/40">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                  নির্বাহী ড্যাশবোর্ড ও প্রকল্প অগ্রগতি
                </span>
                <h2 className="text-lg sm:text-xl font-black mt-0.5">প্রজেক্ট কেপিআই ও অর্থনৈতিক স্থিতি</h2>
              </div>
              <div className="flex items-center gap-2 text-xs bg-emerald-900/50 border border-emerald-700/50 px-3 py-1.5 rounded-xl">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>বর্তমান পর্যায়: <strong>{projectMetrics.currentFloor}</strong></span>
              </div>
            </div>

            {/* মেট্রিক্স গ্রিড */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
              
              {/* কাজ সম্পন্ন */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] uppercase text-emerald-300/80 font-bold block">শারীরিক অগ্রগতি</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black" style={bnSafeStyle}>{toBengaliNumber(projectMetrics.progress)}%</span>
                  <span className="text-[10px] text-slate-400">/ টার্গেট {toBengaliNumber(projectMetrics.targetProgress)}%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${projectMetrics.progress}%` }}></div>
                </div>
              </div>

              {/* মোট বাজেট */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] uppercase text-emerald-300/80 font-bold block">অনুমোদিত বাজেট</span>
                <p className="text-xl sm:text-2xl font-black mt-1">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(projectMetrics.totalBudget)}</span>
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">প্রকল্প প্রাক্কলন</span>
              </div>

              {/* এ পর্যন্ত খরচ */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] uppercase text-rose-300/80 font-bold block">মোট ব্যয় (Actual Expense)</span>
                <p className="text-xl sm:text-2xl font-black text-rose-300 mt-1">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(projectMetrics.actualExpense)}</span>
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">ভাউচার অনুমোদিত</span>
              </div>

              {/* ক্যাশ ইন হ্যান্ড */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <span className="text-[10px] uppercase text-amber-300/80 font-bold block">ক্যাশ ব্যালেন্স (হাতে জমা)</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">
                  ৳<span style={bnSafeStyle}>{toBengaliCurrency(cashInHand > 0 ? cashInHand : 0)}</span>
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  আদায়কৃত ৳{toBengaliCurrency(donorStats.totalCollected)}
                </span>
              </div>
            </div>

            {/* ক্রিটিক্যাল অ্যালার্ট স্ট্রিপ */}
            {projectMetrics.criticalAlertsCount > 0 && (
              <div className="mt-4 bg-amber-500/20 border border-amber-500/40 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>জরুরি অ্যালার্ট: ৫৪ ব্যাগ সিমেন্ট শর্টেজ ও রডমিস্ত্রি সাপ্তাহিক বিল অনুমোদনের অপেক্ষায় আছে।</span>
                </div>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-md">
                  {toBengaliNumber(projectMetrics.criticalAlertsCount)} টি সতর্কবার্তা
                </span>
              </div>
            )}
          </div>
        </section>

        {/* সেকশন হেডার */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">ম্যানেজমেন্ট পোর্টাল ও অপারেশন মডিউল</h3>
            <p className="text-xs text-slate-500">যে কোনো নির্দিষ্ট কাজ সম্পাদনা করতে সংশ্লিষ্ট কার্ডে ক্লিক করুন</p>
          </div>
        </div>

        {/* মডিউল কার্ডসমূহ (গ্রিড) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div 
                key={mod.id}
                className={`bg-white rounded-2xl border p-4.5 transition flex flex-col justify-between shadow-xs ${
                  mod.highlight 
                    ? 'border-emerald-300 ring-2 ring-emerald-500/10 hover:shadow-md' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 ${mod.iconColor} rounded-xl flex items-center justify-center shadow-xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1">{mod.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{mod.description}</p>
                </div>

                {mod.active ? (
                  <Link 
                    href={mod.href}
                    className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-2.5 px-3.5 rounded-xl border border-emerald-200 transition"
                  >
                    <span>পোর্টালে প্রবেশ করুন</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 bg-slate-50 py-2 px-3 rounded-xl border border-slate-100">
                    <span>প্রক্রিয়াধীন মডিউল</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">শীঘ্রই চালু</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}