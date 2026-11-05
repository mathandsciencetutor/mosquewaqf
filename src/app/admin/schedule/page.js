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
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Building2, 
  CalendarClock, 
  PlusCircle, 
  Search, 
  Printer, 
  LogOut, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CloudRain, 
  Sun, 
  FileCheck, 
  FlaskConical, 
  ChevronRight,
  Plus,
  Edit3,
  Sliders,
  Trash2,
  Calendar,
  Layers,
  Filter
} from 'lucide-react';

// ইংরেজি সংখ্যাকে বাংলায় রূপান্তর
function toBengaliNumber(num) {
  if (num === undefined || num === null || num === '') return '০';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[d]);
}

const bnSafeStyle = {
  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif",
  display: 'inline-block',
  lineHeight: '1.4'
};

// তারিখের ব্যবধান বা ডেডলাইন ওভারডিউ চেক
function isOverdue(endDate, progress) {
  if (!endDate || progress >= 100) return false;
  const today = new Date().toISOString().split('T')[0];
  return endDate < today;
}

export default function ScheduleAndQualityDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('GANTT'); // 'GANTT', 'DIARY', 'TESTS'
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('ALL');
  
  // ডেটা স্টেট
  const [milestones, setMilestones] = useState([]);
  const [diaryLogs, setDiaryLogs] = useState([]);
  const [cylinderTests, setCylinderTests] = useState([]);

  // মডাল স্টেট
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // অগ্রগতি এডিট করার স্টেট
  const [selectedEditMilestone, setSelectedEditMilestone] = useState(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState('In Progress');

  // টেস্ট রেজাল্ট এন্ট্রি স্টেট
  const [selectedEditTest, setSelectedEditTest] = useState(null);
  const [testResultPSI, setTestResultPSI] = useState('');
  const [testCertInput, setTestCertInput] = useState('');

  // ফর্ম স্টেট
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    floor: 'গ্রাউন্ড ফ্লোর',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    progress: 0,
    status: 'In Progress'
  });

  const [diaryForm, setDiaryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    floor: 'গ্রাউন্ড ফ্লোর',
    workSummary: '',
    weather: 'রৌদ্রোজ্জ্বল (অনুকূল)',
    obstacles: '',
    engineerName: 'সাইট ইঞ্জিনিয়ার'
  });

  const [testForm, setTestForm] = useState({
    sampleDate: new Date().toISOString().split('T')[0],
    structureLocation: '',
    testType: '২৮ দিন (28 Days)',
    targetPSI: '3000',
    achievedPSI: '',
    labName: 'বুয়েট ব্যুরো অফ রিসার্চ / সরকারি ল্যাব',
    certNo: '',
    status: 'Awaiting Report'
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        await Promise.all([fetchDiaryLogs(), fetchCylinderTests(), fetchMilestones()]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // ফায়ারবেস থেকে লোড করা
  const fetchMilestones = async () => {
    try {
      const q = query(collection(db, 'project_milestones'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setMilestones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('মাইলস্টোন লোড ত্রুটি:', e);
    }
  };

  const fetchDiaryLogs = async () => {
    try {
      const q = query(collection(db, 'site_diary'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setDiaryLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('ডায়েরি লোড ত্রুটি:', e);
    }
  };

  const fetchCylinderTests = async () => {
    try {
      const q = query(collection(db, 'cylinder_tests'), orderBy('sampleDate', 'desc'));
      const snap = await getDocs(q);
      setCylinderTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('টেস্ট লোড ত্রুটি:', e);
    }
  };

  // ১. মাইলস্টোন সেভ
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      const p = Number(milestoneForm.progress) || 0;
      const item = { 
        ...milestoneForm, 
        progress: p,
        status: p >= 100 ? 'Completed' : milestoneForm.status,
        createdAt: serverTimestamp() 
      };
      await addDoc(collection(db, 'project_milestones'), item);
      setShowMilestoneModal(false);
      setMilestoneForm({
        title: '',
        floor: 'গ্রাউন্ড ফ্লোর',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        progress: 0,
        status: 'In Progress'
      });
      fetchMilestones();
    } catch (e) {
      console.error(e);
    }
  };

  // ২. অগ্রগতি ও স্ট্যাটাস আপডেট
  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    if (!selectedEditMilestone) return;

    try {
      const finalProgress = Number(editProgress);
      let finalStatus = editStatus;
      if (finalProgress >= 100) {
        finalStatus = 'Completed';
      } else if (finalProgress > 0 && finalStatus === 'Planned') {
        finalStatus = 'In Progress';
      }

      const docRef = doc(db, 'project_milestones', selectedEditMilestone.id);
      await updateDoc(docRef, {
        progress: finalProgress,
        status: finalStatus
      });

      setSelectedEditMilestone(null);
      fetchMilestones();
    } catch (err) {
      console.error('অগ্রগতি আপডেট ত্রুটি:', err);
    }
  };

  // ৩. ডিলিট হ্যান্ডলার
  const handleDeleteItem = async (collectionName, id, refreshFn) => {
    if (confirm('আপনি কি নিশ্চিতভাবে এই রেকর্ডটি মুছে ফেলতে চান?')) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        refreshFn();
      } catch (e) {
        console.error('ডিলিট ত্রুটি:', e);
      }
    }
  };

  // ৪. সাইট ডায়েরি সেভ
  const handleAddDiary = async (e) => {
    e.preventDefault();
    try {
      const item = { ...diaryForm, createdAt: serverTimestamp() };
      await addDoc(collection(db, 'site_diary'), item);
      setShowDiaryModal(false);
      setDiaryForm({
        date: new Date().toISOString().split('T')[0],
        floor: 'গ্রাউন্ড ফ্লোর',
        workSummary: '',
        weather: 'রৌদ্রোজ্জ্বল (অনুকূল)',
        obstacles: '',
        engineerName: 'সাইট ইঞ্জিনিয়ার'
      });
      fetchDiaryLogs();
    } catch (e) {
      console.error(e);
    }
  };

  // ৫. সিলিন্ডার টেস্ট সেভ
  const handleAddTest = async (e) => {
    e.preventDefault();
    try {
      const target = Number(testForm.targetPSI) || 3000;
      const achieved = testForm.achievedPSI ? Number(testForm.achievedPSI) : null;
      let testStatus = 'Awaiting Report';
      if (achieved !== null && achieved > 0) {
        testStatus = achieved >= target ? 'Passed' : 'Failed';
      }

      const item = { 
        ...testForm, 
        targetPSI: target,
        achievedPSI: achieved,
        status: testStatus,
        createdAt: serverTimestamp() 
      };
      await addDoc(collection(db, 'cylinder_tests'), item);
      setShowTestModal(false);
      setTestForm({
        sampleDate: new Date().toISOString().split('T')[0],
        structureLocation: '',
        testType: '২৮ দিন (28 Days)',
        targetPSI: '3000',
        achievedPSI: '',
        labName: 'বুয়েট ব্যুরো অফ রিসার্চ / সরকারি ল্যাব',
        certNo: '',
        status: 'Awaiting Report'
      });
      fetchCylinderTests();
    } catch (e) {
      console.error(e);
    }
  };

  // ৬. সিলিন্ডার রেজাল্ট আপডেট
  const handleSaveTestResult = async (e) => {
    e.preventDefault();
    if (!selectedEditTest) return;
    try {
      const target = Number(selectedEditTest.targetPSI) || 3000;
      const achieved = Number(testResultPSI);
      const isPass = achieved >= target;

      await updateDoc(doc(db, 'cylinder_tests', selectedEditTest.id), {
        achievedPSI: achieved,
        certNo: testCertInput,
        status: isPass ? 'Passed' : 'Failed'
      });
      setSelectedEditTest(null);
      fetchCylinderTests();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-slate-600">লোড হচ্ছে...</div>;
  }

  // ডায়নামিক কেপিআই মেট্রিক্স ক্যালকুলেশন
  const completedCount = milestones.filter(m => m.status === 'Completed' || m.progress >= 100).length;
  // চলমান কাজ থাকলে সেটা দেখাবে, না থাকলে সর্বশেষ যুক্ত করা কাজ দেখাবে
  const activeRunningMilestone = milestones.find(m => m.status === 'In Progress' && m.progress < 100) || milestones[0];

  // ফিল্টার করা মাইলস্টোন
  const filteredMilestones = milestones.filter(m => {
    if (selectedFloorFilter === 'ALL') return true;
    return m.floor === selectedFloorFilter;
  });

  // ফ্লোরের তালিকা
  const uniqueFloors = Array.from(new Set(milestones.map(m => m.floor).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* টপবার */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-xs">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-[10px] text-indigo-800 uppercase leading-tight">নির্মাণ অগ্রগতি ও মান নিয়ন্ত্রণ</p>
              <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">প্রজেক্ট শিডিউল, সাইট ডায়েরি ও কোয়ালিটি টেস্ট</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> রিপোর্ট প্রিন্ট
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
        
        {/* ১. ওভারভিউ মেট্রিক্স কার্ডস (রিয়েলটাইম ডায়নামিক) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-500 block">মোট মাইলস্টোন</span>
            <p className="text-xl font-black text-slate-800 mt-1">
              <span style={bnSafeStyle}>{toBengaliNumber(milestones.length)}</span> টি
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">
              সম্পন্ন: {toBengaliNumber(completedCount)} টি
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs bg-indigo-50/20">
            <span className="text-xs font-bold uppercase text-indigo-700 block">বর্তমান রানিং টাস্ক</span>
            <p className="text-base font-extrabold text-indigo-900 mt-1 truncate" title={activeRunningMilestone ? activeRunningMilestone.title : ''}>
              {activeRunningMilestone ? activeRunningMilestone.title : 'কোনো টাস্ক নেই'}
            </p>
            <span className="text-[10px] text-indigo-600 font-semibold">
              অগ্রগতি: {activeRunningMilestone ? toBengaliNumber(activeRunningMilestone.progress) : '০'}% সম্পন্ন
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-500 block">সাইট ডায়েরি এন্ট্রি</span>
            <p className="text-xl font-black text-slate-800 mt-1">
              <span style={bnSafeStyle}>{toBengaliNumber(diaryLogs.length)}</span> দিন
            </p>
            <span className="text-[10px] text-slate-400">দৈনিক কাজের রেজিস্টার</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs bg-teal-50/20">
            <span className="text-xs font-bold uppercase text-teal-700 block">সিলিন্ডার টেস্ট রিপোর্ট</span>
            <p className="text-xl font-black text-teal-900 mt-1">
              <span style={bnSafeStyle}>{toBengaliNumber(cylinderTests.length)}</span> টি স্যাম্পল
            </p>
            <span className="text-[10px] text-teal-600">
              উত্তীর্ণ: {toBengaliNumber(cylinderTests.filter(t => t.status === 'Passed').length)} টি
            </span>
          </div>
        </div>

        {/* ২. সেকশন সুইচ ট্যাব ও অ্যাকশন বাটন */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-4">
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('GANTT')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'GANTT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>গ্যান্ট চার্ট ও মাইলস্টোন</span>
            </button>
            <button
              onClick={() => setActiveTab('DIARY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'DIARY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>সাইট ডায়েরি (কাজের লগ)</span>
            </button>
            <button
              onClick={() => setActiveTab('TESTS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'TESTS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>সিলিন্ডার ও কোয়ালিটি টেস্ট</span>
            </button>
          </div>

          <div>
            {activeTab === 'GANTT' && (
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> নতুন মাইলস্টোন যোগ
              </button>
            )}
            {activeTab === 'DIARY' && (
              <button
                onClick={() => setShowDiaryModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> আজকের সাইট ডায়েরি লিখুন
              </button>
            )}
            {activeTab === 'TESTS' && (
              <button
                onClick={() => setShowTestModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> নতুন সিলিন্ডার টেস্ট স্যাম্পল
              </button>
            )}
          </div>
        </div>

        {/* ৩. ট্যাব ১: গ্যান্ট চার্ট ও মাইলস্টোন ভিউ */}
        {activeTab === 'GANTT' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">প্রকল্পের ফিজিক্যাল সময়সীমা ও মাইলস্টোন ট্র্যাকিং</h3>
                <p className="text-xs text-slate-500">অগ্রগতি পরিবর্তন বা সংশোধন করতে সংশ্লিষ্ট বাটন ব্যবহার করুন</p>
              </div>

              {/* ফ্লোর ফিল্টার */}
              {uniqueFloors.length > 0 && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedFloorFilter}
                    onChange={e => setSelectedFloorFilter(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none bg-white font-medium text-slate-700"
                  >
                    <option value="ALL">সকল ফ্লোর</option>
                    {uniqueFloors.map((fl, i) => (
                      <option key={i} value={fl}>{fl}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {filteredMilestones.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">কোনো মাইলস্টোন পাওয়া যায়নি। নতুন মাইলস্টোন তৈরি করুন।</div>
              ) : (
                filteredMilestones.map((m) => {
                  const overdue = isOverdue(m.endDate, m.progress);
                  return (
                    <div key={m.id} className={`p-4 rounded-xl border transition bg-slate-50/50 ${
                      overdue ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 hover:border-indigo-300'
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm sm:text-base">{m.title}</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded">
                              {m.floor}
                            </span>
                            {overdue && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> সময়সীমা অতিক্রম করেছে (Overdue)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            সময়কাল: <span style={bnSafeStyle}>{toBengaliNumber(m.startDate)}</span> হতে <span style={bnSafeStyle}>{toBengaliNumber(m.endDate || 'চলমান')}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.status === 'Completed' || m.progress >= 100 ? 'bg-emerald-100 text-emerald-800' :
                            overdue ? 'bg-rose-100 text-rose-800' :
                            m.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {m.status === 'Completed' || m.progress >= 100 ? 'সম্পন্ন' : 
                             overdue ? 'বিলম্বিত' :
                             m.status === 'In Progress' ? 'চলমান' : 'পরিকল্পিত'}
                          </span>
                          
                          <span className="text-xs sm:text-sm font-black text-slate-800" style={bnSafeStyle}>
                            {toBengaliNumber(m.progress)}%
                          </span>

                          {/* অগ্রগতি আপডেট বাটন */}
                          <button
                            onClick={() => {
                              setSelectedEditMilestone(m);
                              setEditProgress(m.progress || 0);
                              setEditStatus(m.status || 'In Progress');
                            }}
                            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition cursor-pointer ml-1"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>আপডেট</span>
                          </button>

                          {/* ডিলিট বাটন */}
                          <button
                            onClick={() => handleDeleteItem('project_milestones', m.id, fetchMilestones)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* প্রোগ্রেস বার */}
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            m.status === 'Completed' || m.progress >= 100 ? 'bg-emerald-500' : 
                            overdue ? 'bg-rose-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(m.progress || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ৪. ট্যাব ২: সাইট ডায়েরি */}
        {activeTab === 'DIARY' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">সাইট ইঞ্জিনিয়ার দৈনিক ডায়েরি (Site Log)</h3>
                <p className="text-xs text-slate-500">প্রতিদিনের কাজের সারসংক্ষেপ, আবহাওয়া এবং বাধা</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {diaryLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">কোনো ডায়েরি এন্ট্রি পাওয়া যায়নি। আজকের কাজের লগ যুক্ত করুন।</div>
              ) : (
                diaryLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50/70 transition">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          তারিখ: <span style={bnSafeStyle}>{toBengaliNumber(log.date)}</span>
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200">
                          {log.floor}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                          {log.weather?.includes('বৃষ্টি') ? <CloudRain className="w-3 h-3 text-blue-500" /> : <Sun className="w-3 h-3 text-amber-500" />}
                          {log.weather}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 font-medium">ইনস্পেকশন: {log.engineerName}</span>
                        <button
                          onClick={() => handleDeleteItem('site_diary', log.id, fetchDiaryLogs)}
                          className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="লগ মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      <strong>কাজের বিবরণ:</strong> {log.workSummary}
                    </p>

                    {log.obstacles && (
                      <div className="mt-2 text-xs bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span><strong>বাধা / সমস্যা:</strong> {log.obstacles}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ৫. ট্যাব ৩: সিলিন্ডার টেস্ট রিপোর্ট */}
        {activeTab === 'TESTS' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">কংক্রিট সিলিন্ডার টেস্ট রেজিস্টার (PSI Strength Test)</h3>
                <p className="text-xs text-slate-500">ঢালাইয়ের স্থায়িত্ব ও কম্প্রেসিভ শক্তির ল্যাব টেস্ট রিপোর্ট</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">স্যাম্পল তারিখ</th>
                    <th className="p-3">কাঠামো / ফ্লোর</th>
                    <th className="p-3">টেস্ট ধরন</th>
                    <th className="p-3">টার্গেট শক্তি</th>
                    <th className="p-3">ল্যাবে প্রাপ্ত শক্তি</th>
                    <th className="p-3">ল্যাব ও সার্টিফিকেট</th>
                    <th className="p-3 text-center">ফলাফল</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cylinderTests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">কোনো সিলিন্ডার টেস্ট রেকর্ড নেই।</td>
                    </tr>
                  ) : (
                    cylinderTests.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-medium whitespace-nowrap">
                          <span style={bnSafeStyle}>{toBengaliNumber(t.sampleDate)}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{t.structureLocation}</td>
                        <td className="p-3 text-slate-600">{t.testType}</td>
                        <td className="p-3 font-bold text-slate-800">
                          <span style={bnSafeStyle}>{toBengaliNumber(t.targetPSI)}</span> PSI
                        </td>
                        <td className="p-3 font-bold">
                          {t.achievedPSI ? (
                            <span className={t.status === 'Passed' ? 'text-emerald-700' : 'text-rose-600'} style={bnSafeStyle}>
                              {toBengaliNumber(t.achievedPSI)} PSI
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[11px] font-normal">ল্যাবে পাঠানো হয়েছে</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          <span>{t.labName}</span>
                          {t.certNo && <span className="block text-[10px] text-slate-400">সার্টিফিকেট: {t.certNo}</span>}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'Passed' ? 'bg-emerald-100 text-emerald-800' :
                            t.status === 'Failed' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status === 'Passed' ? 'উত্তীর্ণ (Passed)' :
                             t.status === 'Failed' ? 'ব্যর্থ (Failed)' : 'রিপোর্টের অপেক্ষা'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {t.status === 'Awaiting Report' && (
                              <button
                                onClick={() => {
                                  setSelectedEditTest(t);
                                  setTestResultPSI('');
                                  setTestCertInput(t.certNo || '');
                                }}
                                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                              >
                                রেজাল্ট এন্ট্রি
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteItem('cylinder_tests', t.id, fetchCylinderTests)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
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

      {/* মডাল ১: অগ্রগতি আপডেট পপআপ মডাল */}
      {selectedEditMilestone && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" /> অগ্রগতি আপডেট করুন
                </h3>
                <p className="text-xs text-slate-500 truncate">{selectedEditMilestone.title} ({selectedEditMilestone.floor})</p>
              </div>
              <button onClick={() => setSelectedEditMilestone(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgress} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">কাজের সমাপ্তি অগ্রগতি (%)</label>
                  <span className="text-base font-black text-indigo-700 font-mono">
                    {editProgress}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  value={editProgress}
                  onChange={e => setEditProgress(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>০% (শুরু হয়নি)</span>
                  <span>৫০%</span>
                  <span>১০০% (সম্পূর্ণ)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">কাজের বর্তমান অবস্থা (Status)</label>
                <select 
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none bg-white font-medium"
                >
                  <option value="Planned">পরিকল্পিত (Planned)</option>
                  <option value="In Progress">চলমান (In Progress)</option>
                  <option value="Completed">সম্পন্ন (Completed - ১০০%)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedEditMilestone(null)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  আপডেট সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* মডাল ২: সিলিন্ডার রেজাল্ট এন্ট্রি পপআপ */}
      {selectedEditTest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-teal-600" /> ল্যাবরেটরি টেস্ট রেজাল্ট এন্ট্রি
                </h3>
                <p className="text-xs text-slate-500">{selectedEditTest.structureLocation}</p>
              </div>
              <button onClick={() => setSelectedEditTest(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTestResult} className="space-y-3">
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600">
                <span>ডিজাইন টার্গেট শক্তি: <strong>{selectedEditTest.targetPSI} PSI</strong></span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">ল্যাবে প্রাপ্ত শক্তি (Achieved PSI) *</label>
                <input 
                  type="number" 
                  required
                  autoFocus
                  value={testResultPSI}
                  onChange={e => setTestResultPSI(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-bold border-slate-300 outline-none"
                  placeholder="যেমন: ৩২৫০"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">টেস্ট সার্টিফিকেট নং / মেমো</label>
                <input 
                  type="text" 
                  value={testCertInput}
                  onChange={e => setTestCertInput(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: BUET-CE-2026-890"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedEditTest(null)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  রেজাল্ট সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* মডাল ৩: নতুন মাইলস্টোন তৈরি */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">নতুন মাইলস্টোন তৈরি</h3>
              <button onClick={() => setShowMilestoneModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">কাজের শিরোনাম *</label>
                <input 
                  type="text" 
                  required 
                  value={milestoneForm.title}
                  onChange={e => setMilestoneForm({...milestoneForm, title: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: ফ্লোর ঢালাই, কলাম ঢালাই"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ফ্লোর / পর্যায় *</label>
                <input 
                  type="text" 
                  required 
                  value={milestoneForm.floor}
                  onChange={e => setMilestoneForm({...milestoneForm, floor: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: গ্রাউন্ড ফ্লোর, ১ম তলা"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">শুরুর তারিখ</label>
                  <input 
                    type="date" 
                    value={milestoneForm.startDate}
                    onChange={e => setMilestoneForm({...milestoneForm, startDate: e.target.value})}
                    className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">সমাপ্তির তারিখ</label>
                  <input 
                    type="date" 
                    value={milestoneForm.endDate}
                    onChange={e => setMilestoneForm({...milestoneForm, endDate: e.target.value})}
                    className="w-full mt-1 px-2.5 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">প্রাথমিক অগ্রগতি (%)</label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={milestoneForm.progress}
                  onChange={e => setMilestoneForm({...milestoneForm, progress: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowMilestoneModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* মডাল ৪: সাইট ডায়েরি এন্ট্রি */}
      {showDiaryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">আজকের সাইট ডায়েরি এন্ট্রি</h3>
              <button onClick={() => setShowDiaryModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDiary} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">তারিখ *</label>
                  <input 
                    type="date" 
                    required 
                    value={diaryForm.date}
                    onChange={e => setDiaryForm({...diaryForm, date: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">আবহাওয়া *</label>
                  <select 
                    value={diaryForm.weather}
                    onChange={e => setDiaryForm({...diaryForm, weather: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none bg-white font-medium"
                  >
                    <option value="রৌদ্রোজ্জ্বল (অনুকূল)">রৌদ্রোজ্জ্বল (অনুকূল)</option>
                    <option value="মেঘলা / হালকা বৃষ্টি">মেঘলা / হালকা বৃষ্টি</option>
                    <option value="ভারী বৃষ্টি (কাজ ব্যাহত)">ভারী বৃষ্টি (কাজ ব্যাহত)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ফ্লোর / কাজের স্থান *</label>
                <input 
                  type="text" 
                  required 
                  value={diaryForm.floor}
                  onChange={e => setDiaryForm({...diaryForm, floor: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: গ্রাউন্ড ফ্লোর ঢালাই"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">কাজের বিস্তারিত বিবরণ *</label>
                <textarea 
                  rows={3} 
                  required 
                  value={diaryForm.workSummary}
                  onChange={e => setDiaryForm({...diaryForm, workSummary: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="আজ কতজন শ্রমিক কাজ করেছে, কত সিএফটি বা কত স্কয়ার ফিট কাজ হয়েছে..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">কোনো বাধা বা সমস্যা থাকলে লিখুন (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  value={diaryForm.obstacles}
                  onChange={e => setDiaryForm({...diaryForm, obstacles: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: বিদ্যুৎ বিভ্রাট ২ ঘণ্টা, সিমেন্ট আনলোড দেরি"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowDiaryModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  ডায়েরি সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* মডাল ৫: সিলিন্ডার টেস্ট স্যাম্পল এন্ট্রি */}
      {showTestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">সিলিন্ডার টেস্ট স্যাম্পল রেজিস্টার</h3>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTest} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">স্যাম্পল গ্রহণের তারিখ *</label>
                  <input 
                    type="date" 
                    required 
                    value={testForm.sampleDate}
                    onChange={e => setTestForm({...testForm, sampleDate: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">টেস্টের মেয়াদ *</label>
                  <select 
                    value={testForm.testType}
                    onChange={e => setTestForm({...testForm, testType: e.target.value})}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none bg-white font-medium"
                  >
                    <option value="৭ দিন (7 Days)">৭ দিন (7 Days)</option>
                    <option value="২৮ দিন (28 Days)">২৮ দিন (28 Days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">কোন অংশের ঢালাই (কাঠামো) *</label>
                <input 
                  type="text" 
                  required 
                  value={testForm.structureLocation}
                  onChange={e => setTestForm({...testForm, structureLocation: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: গ্রাউন্ড ফ্লোর ছাদ ও বিম ঢালাই"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ডিজাইন টার্গেট PSI *</label>
                <input 
                  type="number" 
                  required 
                  value={testForm.targetPSI}
                  onChange={e => setTestForm({...testForm, targetPSI: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="3000"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ল্যাবরেটরির নাম</label>
                <input 
                  type="text" 
                  value={testForm.labName}
                  onChange={e => setTestForm({...testForm, labName: e.target.value})}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs border-slate-300 outline-none"
                  placeholder="যেমন: বুয়েট ব্যুরো অফ রিসার্চ / সরকারি ল্যাব"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowTestModal(false)}
                  className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  স্যাম্পল যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* অফিসিয়াল প্রিন্ট ভিউ */}
      <div className="hidden print:block print-area p-8 max-w-3xl mx-auto border-2 border-slate-900 bg-white text-black font-sans">
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
          <h1 className="text-2xl font-black">আব্দুল হাকিম ওয়াক্‌ফ এস্টেট নির্মাণ প্রকল্প</h1>
          <p className="text-xs text-slate-700">জিলা স্কুল রোড জামে মসজিদ ও মাদ্রাসা অধীন, ময়মনসিংহ।</p>
          <div className="inline-block border border-slate-900 px-4 py-1 mt-2 font-bold text-sm bg-slate-100">
            সাইট শিডিউল ও কোয়ালিটি ইনস্পেকশন রিপোর্ট
          </div>
        </div>

        <h3 className="font-bold text-sm mb-2 border-b pb-1">১. ফিজিক্যাল মাইলস্টোন স্ট্যাটাস</h3>
        <table className="w-full text-left text-xs border border-slate-900 mb-6">
          <thead className="bg-slate-100 font-bold border-b border-slate-900">
            <tr>
              <th className="p-2 border-r border-slate-900">পর্যায় / টাস্ক</th>
              <th className="p-2 border-r border-slate-900">ফ্লোর</th>
              <th className="p-2 border-r border-slate-900">সময়সীমা</th>
              <th className="p-2 text-right">অগ্রগতি</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, i) => (
              <tr key={i} className="border-b border-slate-400">
                <td className="p-2 border-r border-slate-400 font-semibold">{m.title}</td>
                <td className="p-2 border-r border-slate-400">{m.floor}</td>
                <td className="p-2 border-r border-slate-400">
                  <span style={bnSafeStyle}>{toBengaliNumber(m.startDate)}</span> হতে <span style={bnSafeStyle}>{toBengaliNumber(m.endDate || 'চলমান')}</span>
                </td>
                <td className="p-2 text-right font-bold"><span style={bnSafeStyle}>{toBengaliNumber(m.progress)}</span>%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="font-bold text-sm mb-2 border-b pb-1">২. সিলিন্ডার শক্তি পরীক্ষা (Quality Control)</h3>
        <table className="w-full text-left text-xs border border-slate-900 mb-8">
          <thead className="bg-slate-100 font-bold border-b border-slate-900">
            <tr>
              <th className="p-2 border-r border-slate-900">ঢালাই স্থান</th>
              <th className="p-2 border-r border-slate-900">তারিখ</th>
              <th className="p-2 border-r border-slate-900">টার্গেট PSI</th>
              <th className="p-2 border-r border-slate-900">প্রাপ্ত PSI</th>
              <th className="p-2 text-center">ফলাফল</th>
            </tr>
          </thead>
          <tbody>
            {cylinderTests.map((t, i) => (
              <tr key={i} className="border-b border-slate-400">
                <td className="p-2 border-r border-slate-400 font-semibold">{t.structureLocation}</td>
                <td className="p-2 border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(t.sampleDate)}</span></td>
                <td className="p-2 border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(t.targetPSI)}</span></td>
                <td className="p-2 border-r border-slate-400"><span style={bnSafeStyle}>{toBengaliNumber(t.achievedPSI || '—')}</span></td>
                <td className="p-2 text-center font-bold">
                  {t.status === 'Passed' ? 'উত্তীর্ণ' : t.status === 'Failed' ? 'ব্যর্থ' : 'অপেক্ষমাণ'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 pt-16 text-center text-xs font-semibold text-slate-800">
          <div>
            <div className="w-44 border-t border-slate-800 mx-auto pt-1">সাইট ইঞ্জিনিয়ার</div>
          </div>
          <div>
            <div className="w-44 border-t border-slate-800 mx-auto pt-1">প্রকল্প সভাপতি / মুতাওয়াল্লী</div>
          </div>
        </div>
      </div>
    </div>
  );
}