'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  Building2, 
  HandCoins, 
  Receipt, 
  FileSpreadsheet, 
  Bell, 
  LogOut, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function AdminHub() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium">লোড হচ্ছে...</div>;
  }

  // বিভিন্ন পেজের মেন্যু তালিকা (ভবিষ্যতে নতুন পেজ বানালে এখানে শুধু লিংক বসিয়ে দিলেই হবে)
  const menuModules = [
    {
      title: 'চাঁদা ও অনুদান আদায়',
      description: 'ডোনার নিবন্ধন, কিস্তি গ্রহণ, রশিদ প্রিন্ট ও ক্যাটাগরি রিপোর্ট',
      href: '/admin/chada-aday',
      icon: HandCoins,
      color: 'bg-emerald-600',
      tag: 'চালু আছে',
      active: true,
    },
    {
      title: 'খরচ ও ব্যয়ের হিসাব',
      description: 'নির্মাণ সামগ্রী ক্রয়, মিস্ত্রি বিল ও ভাউচার রেজিস্টার',
      href: '/admin/khoroch',
      icon: Receipt,
      color: 'bg-blue-600',
      tag: 'শীঘ্রই আসছে',
      active: false,
    },
    {
      title: 'সামগ্রিক হিসাব ও অডিট',
      description: 'মাসিক জমা-খরচের সারসংক্ষেপ ও ব্যালেন্স শীট',
      href: '/admin/audit',
      icon: FileSpreadsheet,
      color: 'bg-amber-600',
      tag: 'পরিকল্পনাধীন',
      active: false,
    },
    {
      title: 'বিজ্ঞপ্তি ও ঘোষণা',
      description: 'পোর্টালে প্রদর্শনের জন্য জরুরি নোটিশ তৈরি',
      href: '/admin/notish',
      icon: Bell,
      color: 'bg-purple-600',
      tag: 'পরিকল্পনাধীন',
      active: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-800 font-semibold leading-tight">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট</p>
              <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">অ্যাডমিন কন্ট্রোল প্যানেল</h1>
            </div>
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> লগআউট
          </button>
        </div>
      </header>

      {/* মেইন কন্টেন্ট */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-emerald-900 text-white p-5 rounded-2xl mb-6 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <h2 className="text-base md:text-lg font-bold">স্বাগতম, অ্যাডমিন মহোদয়</h2>
          </div>
          <p className="text-xs md:text-sm text-emerald-100/90">
            নিচের মডিউলগুলো থেকে যে কাজটিতে প্রবেশ করতে চান সেটিতে ক্লিক করুন।
          </p>
        </div>

        {/* মডিউল কার্ডসমূহ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {menuModules.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className={`bg-white rounded-2xl border p-4.5 transition flex flex-col justify-between ${
                  item.active 
                    ? 'border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer' 
                    : 'border-slate-100 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${item.color} text-white rounded-xl flex items-center justify-center shadow-xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.description}</p>
                </div>

                {item.active ? (
                  <Link 
                    href={item.href}
                    className="flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2 px-3 rounded-xl transition"
                  >
                    <span>প্রবেশ করুন</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="text-[11px] font-semibold text-slate-400 py-2 px-1">
                    বর্তমানে প্রক্রিয়াধীন
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