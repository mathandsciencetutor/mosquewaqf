'use client';
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
  X
} from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donors, setDonors] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // নতুন ডোনার ফর্ম
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    pledgedAmount: '',
    initialPayment: '',
    category: 'Confirmed',
  });

  // কিস্তি মডাল স্টেট
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentNote, setInstallmentNote] = useState('');
  const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().split('T')[0]);

  // প্রিন্ট কন্ট্রোল স্টেট ('receipt' অথবা 'report')
  const [historyDonor, setHistoryDonor] = useState(null);
  const [showCategoryPrintModal, setShowCategoryPrintModal] = useState(false);
  const [printCategory, setPrintCategory] = useState('ALL');
  const [activePrintView, setActivePrintView] = useState(null);

  const router = useRouter();

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
      const pledged = Number(formData.pledgedAmount) || 0;
      const initial = Number(formData.initialPayment) || 0;
      
      let finalCategory = formData.category;
      if (initial >= pledged && pledged > 0) {
        finalCategory = 'Paid';
      }

      const nextSerial = 1001 + donors.length;
      const generatedCode = `WQF-${nextSerial}`;

      const newDonor = {
        donorId: generatedCode,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        pledgedAmount: pledged,
        paidAmount: initial,
        category: finalCategory,
        installments: initial > 0 ? [{
          amount: initial,
          date: new Date().toISOString(),
          note: 'প্রারম্ভিক অনুদান'
        }] : [],
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'donors'), newDonor);
      setFormData({
        name: '',
        phone: '',
        address: '',
        pledgedAmount: '',
        initialPayment: '',
        category: 'Confirmed'
      });
      fetchDonors();
    } catch (err) {
      console.error('সংরক্ষণ ব্যর্থ:', err);
    }
  };

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    if (!selectedDonor || !installmentAmount) return;

    try {
      const amount = Number(installmentAmount);
      const newPaidTotal = (selectedDonor.paidAmount || 0) + amount;
      
      let newCategory = selectedDonor.category;
      if (newPaidTotal >= selectedDonor.pledgedAmount) {
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

  // একক ডোনার রসিদ প্রিন্ট
  const triggerPrintReceipt = (donor) => {
    setHistoryDonor(donor);
    setActivePrintView('receipt');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // সম্পূর্ণ ক্যাটাগরি তালিকা প্রিন্ট
  const triggerPrintReport = () => {
    setShowCategoryPrintModal(false);
    setActivePrintView('report');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const filteredDonors = donors.filter(d => {
    const matchesCategory = activeTab === 'ALL' || d.category === activeTab;
    const matchesSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.donorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.phone?.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  const printReportList = donors.filter(d => {
    return printCategory === 'ALL' || d.category === printCategory;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium">লোড হচ্ছে...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg md:text-xl text-emerald-800 leading-tight">আব্দুল হাকিম ওয়াকফ স্টেট</h1>
            <p className="text-xs text-slate-500">জেলা স্কুল রোড জামে মসজিদ হাফিজিয়া মাদ্রাসা</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCategoryPrintModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" /> ডোনার রিপোর্ট প্রিন্ট
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> লগআউট
            </button>
          </div>
        </div>
      </header>

      {/* মূল অ্যাডমিন স্ক্রিন */}
      <main className="max-w-7xl mx-auto px-4 mt-6 print:hidden">
        {/* পরিসংখ্যান কার্ড */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">মোট ডোনার</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{donors.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 uppercase">পরিশোধিত (Paid)</span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {donors.filter(d => d.category === 'Paid').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-blue-600 uppercase">চলমান (Confirmed)</span>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {donors.filter(d => d.category === 'Confirmed').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-amber-600 uppercase">সম্ভাব্য (Prospective)</span>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {donors.filter(d => d.category === 'Prospective').length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* নতুন ডোনার নিবন্ধন ফর্ম */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" /> নতুন ডোনার নিবন্ধন
            </h2>
            <form onSubmit={handleAddDonor} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">ডোনারের নাম *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="পূর্ণ নাম লিখুন"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">মোবাইল নম্বর *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ঠিকানা</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="গ্রাম / এলাকা / ঠিকানা"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">প্রতিশ্রুত অনুদান (৳) *</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.pledgedAmount}
                    onChange={e => setFormData({...formData, pledgedAmount: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="যেমন: 50000"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">প্রাথমিক জমা (৳)</label>
                  <input 
                    type="number" 
                    value={formData.initialPayment}
                    onChange={e => setFormData({...formData, initialPayment: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ক্যাটাগরি</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                >
                  <option value="Confirmed">Confirmed (নিশ্চিত / কিস্তি চলমান)</option>
                  <option value="Prospective">Prospective (সম্ভাব্য ডোনার)</option>
                  <option value="Paid">Paid (সম্পূর্ণ পরিশোধিত)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition shadow cursor-pointer"
              >
                নিবন্ধন সম্পন্ন করুন
              </button>
            </form>
          </div>

          {/* ডোনার তালিকা */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="নাম, আইডি বা ফোন দিয়ে খুঁজুন..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                {['ALL', 'Confirmed', 'Prospective', 'Paid'].map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                      activeTab === tab 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab === 'ALL' ? 'সকল' : tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredDonors.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                  কোনো ডোনার পাওয়া যায়নি।
                </div>
              ) : (
                filteredDonors.map(donor => {
                  const due = (donor.pledgedAmount || 0) - (donor.paidAmount || 0);
                  return (
                    <div key={donor.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">{donor.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {donor.donorId}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              donor.category === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                              donor.category === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {donor.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-medium"><Phone className="w-3.5 h-3.5" /> {donor.phone}</span>
                            {donor.address && <span>{donor.address}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* পেমেন্ট হিস্ট্রি দেখার বাটন */}
                          <button 
                            onClick={() => {
                              setHistoryDonor(donor);
                              setActivePrintView('history_modal');
                            }}
                            className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                            title="পেমেন্ট হিস্ট্রি দেখুন"
                          >
                            হিস্ট্রি ({donor.installments?.length || 0})
                          </button>

                          {/* রশিদ প্রিন্ট বাটন */}
                          <button 
                            onClick={() => triggerPrintReceipt(donor)}
                            className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                            title="রশিদ প্রিন্ট করুন"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" /> রশিদ প্রিন্ট
                          </button>

                          {/* কিস্তি জমা বাটন */}
                          {donor.category !== 'Paid' && (
                            <button 
                              onClick={() => setSelectedDonor(donor)}
                              className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> কিস্তি জমা
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block font-medium">প্রতিশ্রুতি</span>
                          <span className="font-bold text-slate-800 text-sm">৳{donor.pledgedAmount?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">পরিশোধ</span>
                          <span className="font-bold text-emerald-700 text-sm">৳{donor.paidAmount?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">বকেয়া</span>
                          <span className={`font-bold text-sm ${due > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            ৳{due > 0 ? due.toLocaleString() : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ক্যাটাগরি প্রিন্ট সিলেকশন মডাল */}
      {showCategoryPrintModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">রিপোর্ট প্রিন্ট সেটআপ</h3>
              <button onClick={() => setShowCategoryPrintModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <label className="text-xs font-semibold text-slate-600 block">কোন ক্যাটাগরির লিস্ট প্রিন্ট করতে চান?</label>
              <select 
                value={printCategory} 
                onChange={(e) => setPrintCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm border-slate-300 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">সকল ক্যাটাগরি (All Donors)</option>
                <option value="Confirmed">চলমান কিস্তি (Confirmed)</option>
                <option value="Prospective">সম্ভাব্য ডোনার (Prospective)</option>
                <option value="Paid">সম্পূর্ণ পরিশোধিত (Paid)</option>
              </select>
              <p className="text-xs text-slate-500">
                নির্বাচিত ক্যাটাগরির মোট {printReportList.length} জন ডোনারের তালিকা একটি মাত্র কমপ্যাক্ট টেবিলে প্রিন্ট হবে।
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setShowCategoryPrintModal(false)}
                className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button 
                onClick={triggerPrintReport}
                className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-semibold transition cursor-pointer"
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">কিস্তি গ্রহণ</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedDonor.name} ({selectedDonor.donorId})</p>

            <form onSubmit={handleAddInstallment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">জমার পরিমাণ (৳) *</label>
                <input 
                  type="number" 
                  required 
                  autoFocus
                  value={installmentAmount}
                  onChange={e => setInstallmentAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                  placeholder="পরিমাণ লিখুন"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">জমার তারিখ *</label>
                <input 
                  type="date" 
                  required
                  value={installmentDate}
                  onChange={e => setInstallmentDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">মন্তব্য / রশিদ নং</label>
                <input 
                  type="text" 
                  value={installmentNote}
                  onChange={e => setInstallmentNote(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="যেমন: রশিদ নং ১২৩৪"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedDonor(null)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-semibold transition cursor-pointer"
                >
                  জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          প্রিন্ট ভিউ ১: একক ডোনারের মানি রিসিট (শুধুমাত্র receipt মুডে দৃশ্যমান)
          ========================================================================= */}
      {historyDonor && activePrintView === 'receipt' && (
        <div className="hidden print:block print-area p-8 max-w-3xl mx-auto border-2 border-slate-800 bg-white text-black">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
            <p className="text-xs font-semibold tracking-widest text-slate-700">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <h1 className="text-2xl font-black text-slate-900 tracking-wide mt-1">আব্দুল হাকিম ওয়াকফ স্টেট</h1>
            <p className="text-sm font-semibold text-slate-800">জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা কমপ্লেক্স</p>
            <p className="text-xs text-slate-600">ময়মনসিংহ সদর, ময়মনসিংহ।</p>
            <div className="inline-block border-2 border-slate-900 px-4 py-1 mt-3 font-bold text-sm tracking-wide bg-slate-100">
              ডোনার অনুদান আদায় ও কিস্তি বিবরণী রশিদ
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2 text-sm border-b pb-3 mb-4 border-slate-400">
            <div>
              <p><span className="font-semibold">রশিদ / আইডি নং:</span> <strong className="font-mono text-base">{historyDonor.donorId}</strong></p>
              <p><span className="font-semibold">ডোনারের নাম:</span> <strong className="text-base">{historyDonor.name}</strong></p>
              <p><span className="font-semibold">মোবাইল:</span> {historyDonor.phone}</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">তারিখ:</span> {new Date().toLocaleDateString('bn-BD')}</p>
              <p><span className="font-semibold">ঠিকানা:</span> {historyDonor.address || '—'}</p>
              <p><span className="font-semibold">বর্তমান স্ট্যাটাস:</span> <strong>{historyDonor.category}</strong></p>
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
                    <td className="p-2 text-center border-r border-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-400">
                      {new Date(inst.date).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-2 border-r border-slate-400">{inst.note || 'কিস্তি আদায়'}</td>
                    <td className="p-2 text-right font-bold">৳{Number(inst.amount).toLocaleString()}</td>
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
              <p><span className="font-semibold">প্রতিশ্রুত অনুদান:</span> ৳{Number(historyDonor.pledgedAmount).toLocaleString()}</p>
              <p><span className="font-semibold">সর্বমোট বকেয়া:</span> <strong className="text-red-700">৳{((historyDonor.pledgedAmount || 0) - (historyDonor.paidAmount || 0)).toLocaleString()}</strong></p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block uppercase font-bold">সর্বমোট আদায়কৃত টাকা</span>
              <span className="text-xl font-black text-slate-900">৳{Number(historyDonor.paidAmount).toLocaleString()}</span>
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

      {/* =========================================================================
          প্রিন্ট ভিউ ২: একক মাস্টার রেজিস্ট্রি টেবিল (শুধুমাত্র report মুডে দৃশ্যমান)
          ========================================================================= */}
      {activePrintView === 'report' && (
        <div className="hidden print:block print-area p-4 max-w-full mx-auto bg-white text-black">
          {/* প্রাতিষ্ঠানিক হেডার */}
          <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
            <h1 className="text-xl font-black text-slate-900">আব্দুল হাকিম ওয়াকফ স্টেট</h1>
            <p className="text-xs font-semibold text-slate-700">জেলা স্কুল রোড জামে মসজিদ ও হাফিজিয়া মাদ্রাসা কমপ্লেক্স, ময়মনসিংহ</p>
            <div className="flex justify-between items-center mt-2 text-[11px] font-bold border-t pt-1 border-slate-300">
              <span>ক্যাটাগরি: {printCategory === 'ALL' ? 'সকল ডোনার' : printCategory}</span>
              <span>মোট ডোনার: {printReportList.length} জন</span>
              <span>তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
            </div>
          </div>

          {/* একমাত্র মাস্টার টেবিল (Single Compact Table) */}
          <table className="w-full text-left text-[11px] border border-slate-800 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-800 font-bold">
              <tr className="border-b border-slate-800">
                <th className="p-1.5 border-r border-slate-800 text-center w-8">নং</th>
                <th className="p-1.5 border-r border-slate-800 w-16">আইডি</th>
                <th className="p-1.5 border-r border-slate-800">ডোনারের নাম</th>
                <th className="p-1.5 border-r border-slate-800">মোবাইল</th>
                <th className="p-1.5 border-r border-slate-800">ঠিকানা</th>
                <th className="p-1.5 border-r border-slate-800 text-center w-20">ক্যাটাগরি</th>
                <th className="p-1.5 border-r border-slate-800 text-right w-24">প্রতিশ্রুতি (৳)</th>
                <th className="p-1.5 border-r border-slate-800 text-right w-24">আদায় (৳)</th>
                <th className="p-1.5 text-right w-24">বকেয়া (৳)</th>
              </tr>
            </thead>
            <tbody>
              {printReportList.map((donor, idx) => {
                const due = (donor.pledgedAmount || 0) - (donor.paidAmount || 0);
                return (
                  <tr key={donor.id} className="border-b border-slate-400 leading-tight">
                    <td className="p-1.5 text-center border-r border-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono font-bold">{donor.donorId}</td>
                    <td className="p-1.5 border-r border-slate-400 font-bold">{donor.name}</td>
                    <td className="p-1.5 border-r border-slate-400 font-mono">{donor.phone}</td>
                    <td className="p-1.5 border-r border-slate-400">{donor.address || '—'}</td>
                    <td className="p-1.5 border-r border-slate-400 text-center">{donor.category}</td>
                    <td className="p-1.5 border-r border-slate-400 text-right font-medium">
                      ৳{donor.pledgedAmount?.toLocaleString()}
                    </td>
                    <td className="p-1.5 border-r border-slate-400 text-right font-bold">
                      ৳{donor.paidAmount?.toLocaleString()}
                    </td>
                    <td className="p-1.5 text-right font-bold">
                      ৳{due > 0 ? due.toLocaleString() : 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* সামারি রো */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800 text-[11px]">
              <tr>
                <td colSpan={6} className="p-2 text-right border-r border-slate-800">সর্বমোট:</td>
                <td className="p-2 text-right border-r border-slate-800">
                  ৳{printReportList.reduce((acc, curr) => acc + (Number(curr.pledgedAmount) || 0), 0).toLocaleString()}
                </td>
                <td className="p-2 text-right border-r border-slate-800">
                  ৳{printReportList.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0).toLocaleString()}
                </td>
                <td className="p-2 text-right">
                  ৳{printReportList.reduce((acc, curr) => acc + ((Number(curr.pledgedAmount) || 0) - (Number(curr.paidAmount) || 0)), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* অথরাইজেশন সিগনেচার */}
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">পেমেন্ট হিস্ট্রি</h3>
                <p className="text-xs text-slate-500">{historyDonor.name} ({historyDonor.donorId})</p>
              </div>
              <button 
                onClick={() => {
                  setHistoryDonor(null);
                  setActivePrintView(null);
                }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 max-h-64 overflow-y-auto space-y-2 pr-1">
              {!historyDonor.installments || historyDonor.installments.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">কোনো কিস্তি জমার হিস্ট্রি নেই।</p>
              ) : (
                historyDonor.installments.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{item.note || 'কিস্তি আদায়'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        তারিখ: {item.date ? new Date(item.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-700 text-sm">
                      +৳{Number(item.amount)?.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
              <span className="text-slate-500 font-semibold">মোট পরিশোধ:</span>
              <span className="font-bold text-emerald-700 text-base">৳{Number(historyDonor.paidAmount)?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}