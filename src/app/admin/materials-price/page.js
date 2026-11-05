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
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Boxes, 
  PlusCircle, 
  LogOut, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  ArrowLeft,
  Calendar,
  Sparkles
} from 'lucide-react';

function toBengaliNumber(num) {
  if (num === undefined || num === null || num === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[d]);
}

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

export default function MaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    unit: 'ব্যাগ',
    price: '',
    brandOrGrade: '',
    note: ''
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        await fetchMaterials();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchMaterials = async () => {
    try {
      const snap = await getDocs(collection(db, 'building_materials'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setMaterials(list);
    } catch (err) {
      console.error('সামগ্রী লোড ত্রুটি:', err);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    try {
      await addDoc(collection(db, 'building_materials'), {
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        price: Number(formData.price) || 0,
        brandOrGrade: formData.brandOrGrade.trim(),
        note: formData.note.trim(),
        updatedAt: serverTimestamp(),
        lastUpdatedDate: new Date().toISOString().split('T')[0]
      });

      setFormData({ name: '', unit: 'ব্যাগ', price: '', brandOrGrade: '', note: '' });
      setShowAddModal(false);
      fetchMaterials();
    } catch (err) {
      console.error('সামগ্রী যোগে ত্রুটি:', err);
    }
  };

  const handleQuickUpdatePrice = async (id) => {
    if (!editPrice || isNaN(Number(editPrice))) return;
    try {
      const docRef = doc(db, 'building_materials', id);
      await updateDoc(docRef, {
        price: Number(editPrice),
        updatedAt: serverTimestamp(),
        lastUpdatedDate: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
      setEditPrice('');
      fetchMaterials();
    } catch (err) {
      console.error('মূল্য আপডেট ত্রুটি:', err);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`আপনি কি '${name}' পণ্যটি তালিকা থেকে মুছে ফেলতে চান?`)) return;
    try {
      await deleteDoc(doc(db, 'building_materials', id));
      fetchMaterials();
    } catch (err) {
      console.error('ডিলিট ত্রুটি:', err);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.brandOrGrade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.unit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-slate-600">লোড হচ্ছে...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link 
              href="/admin" 
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition border border-slate-200"
              title="মেন্যুতে ফিরে যান"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider leading-none">
                ওয়াকফ এস্টেট নির্মাণ প্রকল্প
              </p>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight mt-0.5">
                নির্মাণ সামগ্রীর লাইভ বাজারদর ও মূল্য তালিকা
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              href="/admin" 
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition"
            >
              ← ব্যাক
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> 
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        {/* ইনফো ও অ্যাকশন বার */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl p-5 mb-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md inline-block mb-1">
              মোহতামীম সাহেবের সহযোগে উপস্থাপনা
            </span>
            <h2 className="text-base sm:text-lg font-black leading-tight">নির্মাণ পণ্যের বর্তমান দর নিয়ন্ত্রণ</h2>
            <p className="text-xs text-amber-100 mt-0.5">
              এখানে পরিবর্তিত মূল্য সরাসরি হোমপেইজের মোহতামীম প্রেজেন্টেশন পপ-আপে প্রতিফলিত হবে।
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-white text-slate-900 hover:bg-amber-50 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            <span>নতুন সামগ্রী যোগ</span>
          </button>
        </div>

        {/* সার্চ বার */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-4 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="পণ্যের নাম, ব্র‍্যান্ড বা একক দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            মোট সামগ্রী: <strong style={bnSafeStyle}>{toBengaliNumber(filteredMaterials.length)}</strong> টি
          </span>
        </div>

        {/* সামগ্রী তালিকা টেবিল */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3 text-center w-12">নং</th>
                  <th className="p-3">সামগ্রী / পণ্যের নাম</th>
                  <th className="p-3">ব্র‍্যান্ড / স্পেসিফিকেশন</th>
                  <th className="p-3 text-center">পরিমাপের একক</th>
                  <th className="p-3 text-right">বর্তমান দর (৳)</th>
                  <th className="p-3 text-center">সর্বশেষ আপডেট</th>
                  <th className="p-3 text-center w-28">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      কোনো নির্মাণ সামগ্রীর তথ্য পাওয়া যায়নি। নতুন সামগ্রী যোগ করতে উপরের বাটনে চাপুন।
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center font-bold text-slate-500">
                        <span style={bnSafeStyle}>{toBengaliNumber(idx + 1)}</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 text-sm">
                        {item.name}
                        {item.note && <span className="text-[11px] text-slate-400 font-normal block mt-0.5">{item.note}</span>}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {item.brandOrGrade || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          প্রতি {item.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input 
                              type="number" 
                              value={editPrice}
                              onChange={e => setEditPrice(e.target.value)}
                              className="w-24 px-2 py-1 text-xs border border-amber-500 rounded outline-none font-bold text-right"
                              placeholder="নতুন দর"
                              autoFocus
                            />
                            <button
                              onClick={() => handleQuickUpdatePrice(item.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                              title="সেভ করুন"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                              title="বাতিল"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-black text-slate-900">
                            ৳<span style={bnSafeStyle}>{toBengaliCurrency(item.price)}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center text-slate-500 font-medium whitespace-nowrap">
                        <span style={bnSafeStyle}>{toBengaliNumber(item.lastUpdatedDate || '—')}</span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditPrice(item.price);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="মূল্য দ্রুত আপডেট করুন"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
      </main>

      {/* নতুন সামগ্রী যুক্ত করার মডাল */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-600" /> নতুন নির্মাণ সামগ্রী যুক্ত করুন
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">সামগ্রীর নাম *</label>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="যেমন: সিমেন্ট, ৬০-গ্রেড রড, লাল বালি, ইট"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">পরিমাপের একক *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="যেমন: ব্যাগ / টন / সিএফটি / হাজার"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">বর্তমান দর (৳) *</label>
                  <input 
                    type="number" 
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                    placeholder="যেমন: ৫৬০"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ব্র‍্যান্ড / স্পেসিফিকেশন (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  value={formData.brandOrGrade}
                  onChange={e => setFormData({ ...formData, brandOrGrade: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="যেমন: শাহ সিমেন্ট / বিএসআরএম ৫০০ডব্লিউ / ১নং ইট"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">মন্তব্য / সাইট নোট (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="যেমন: গাড়ি ভাড়াসহ সাইটে ডেলিভারি দর"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}