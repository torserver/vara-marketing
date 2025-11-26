import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { 
  AlertTriangle, Map, TrendingUp, Cpu, FileText, Video, Box, 
  LayoutDashboard, ChevronRight, LogOut 
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
// IMPORTANT: REPLACE WITH YOUR REAL FIREBASE CONFIG before deployment
const firebaseConfig = {
  apiKey: "AIzaSyADnYLG6w-XMCE545cyScyVEaPXUjycux4",
  authDomain: "tor-mulder-drone-systems.firebaseapp.com",
  projectId: "tor-mulder-drone-systems",
  storageBucket: "tor-mulder-drone-systems.firebasestorage.app",
  messagingSenderId: "767662190938",
  appId: "1:767662190938:web:6445cbe9e3500003320363",
  measurementId: "G-Y4KQXJTL4L"
};
// ------------------------------

const appId = 'drone-business-default-id';
let db, auth;

// Use global auth/db variables only if config exists
if (firebaseConfig.projectId && typeof window !== 'undefined') {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// --- MOCK DATA & AI GENERATOR ---

// Mock function to simulate Gemini reading metric data and producing a summary
const mockGenerateAISummary = (metrics) => {
  if (metrics.length < 2) return "Initial data flight complete. Awaiting second flight for trend analysis.";
  
  const latest = metrics[metrics.length - 1];
  const prev = metrics[metrics.length - 2];
  const volumeChange = latest.volume - prev.volume;
  const progressChange = latest.progress - prev.progress;
  
  return `**Week ${metrics.length} Analysis:** Site progress is **${progressChange > 0 ? 'ahead of schedule' : 'on track'}** with a net completion increase of ${progressChange}%. Total measured excavation volume is ${latest.volume}m³. The primary actionable item is to confirm material delivery to Sector 5 by end of day Friday.`;
};

// Seed Data for Demo
const seedData = (user) => {
    const mockMetrics = [
      { name: 'Wk 1', volume: 1200, progress: 10, cut: 400, fill: 200 },
      { name: 'Wk 2', volume: 2100, progress: 22, cut: 800, fill: 350 },
      { name: 'Wk 3', volume: 3400, progress: 35, cut: 1200, fill: 500 },
      { name: 'Wk 4', volume: 4100, progress: 48, cut: 1500, fill: 800 },
    ];
    
    // Check for existence of db before seeding
    if (db) {
        setDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/client_projects/demo-resort`), {
            clientName: "Anjuna Cliffside Resort",
            projectName: "Phase 1: Foundation & Grading",
            status: "Active",
            lastFlight: new Date().toISOString(),
            metrics: JSON.stringify(mockMetrics),
            aiSummary: mockGenerateAISummary(mockMetrics),
            media: [
                { type: 'video', title: 'October FPV Tour (Cinematic)', date: 'Oct 24, 2025', thumbnail: 'https://placehold.co/600x400/1c1614/f59e0b?text=FPV+TOUR' },
                { type: 'image', title: 'Roof Inspection Stills', date: 'Oct 22, 2025', thumbnail: 'https://placehold.co/600x400/1c1614/f5f3ef?text=ROOF+INSPECTION' }
            ],
            links: { threeD: "#", cloud: "#" }
        });
    }
};

// --- STYLES ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&family=Rajdhani:wght@600;700&display=swap');
    :root {
      --bg-deep: #1c1614;
      --bg-card: #2b2320;
      --text-main: #f5f3ef;
      --accent: #f59e0b;
      --border: #3c3330;
    }
    body { 
      background-color: var(--bg-deep); 
      color: var(--text-main); 
      font-family: 'Outfit', sans-serif;
    }
    h1, h2, h3, h4, .font-heading {
      font-family: 'Rajdhani', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-deep); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent); }
    .recharts-default-tooltip { z-index: 100 !important; } /* Ensure tooltips show above other elements */
  `}</style>
);

// --- COMPONENTS ---

const StatCard = ({ icon: Icon, label, value, subtext }) => (
  <div className="bg-[#2b2320] p-6 rounded-xl border border-[#3c3330] hover:border-[#f59e0b] transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-[#1c1614] rounded-lg text-[#f59e0b] group-hover:scale-110 transition-transform">
        <Icon size={24} />
      </div>
      {subtext && <span className="text-xs text-green-400 font-mono bg-green-900/20 px-2 py-1 rounded">{subtext}</span>}
    </div>
    <h3 className="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-1">{label}</h3>
    <p className="text-3xl font-heading font-bold text-[#f5f3ef]">{value}</p>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center w-full p-4 rounded-lg mb-2 transition-all duration-200 ${
      active 
        ? 'bg-[#f59e0b] text-[#1c1614] font-bold shadow-lg' 
        : 'text-gray-400 hover:bg-[#3c3330] hover:text-[#f5f3ef]'
    }`}
  >
    <Icon size={20} className="mr-3" />
    <span className="font-heading text-lg">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto" />}
  </button>
);

// --- MAIN APP ---
const App = () => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth & Init
  useEffect(() => {
    if (!auth) { setError("Firebase config missing."); setLoading(false); return; }

    // Use default token if provided, otherwise sign in anonymously
    const initAuth = async () => {
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        try {
            if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
            else await signInAnonymously(auth);
        } catch (e) {
            setError("Authentication failed.");
        }
    };
    initAuth();

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user || !db) return;

    // Fetch private project data for the current user
    const q = query(collection(db, `/artifacts/${appId}/users/${user.uid}/client_projects`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data, 
          // Parse the metrics stringified array back into an object
          metrics: typeof data.metrics === 'string' ? JSON.parse(data.metrics) : (data.metrics || []) 
        };
      });
      setProjects(docs);
      if (docs.length > 0 && !selectedProject) setSelectedProject(docs[0]);
      setLoading(false);
    }, (err) => setError("Failed to load projects."));

    return () => unsubscribe();
  }, [user]);

  // Mock Data Seeding (Only if empty)
  useEffect(() => {
    if (user && projects.length === 0 && !loading) {
      seedData(user);
    }
  }, [user, projects, loading]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#1c1614] text-[#f59e0b] font-heading text-xl">LOADING SECURE PORTAL...</div>;
  if (error) return <div className="h-screen flex items-center justify-center bg-[#1c1614] text-red-500">{error}</div>;

  const metrics = selectedProject?.metrics || [];
  const latestMetric = metrics[metrics.length - 1] || {};
  const aiSummaryHtml = selectedProject?.aiSummary?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // For bolding inside summary

  return (
    <div className="flex h-screen bg-[#1c1614] text-[#f5f3ef] overflow-hidden">
      <GlobalStyles />
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#16110f] border-r border-[#3c3330] flex flex-col p-6 flex-shrink-0">
        <div className="mb-10 flex items-center space-x-3">
          {/* Hexagon Logo */}
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
             <path d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0Z" fill="#f59e0b"/>
          </svg>
          <div>
            <h1 className="text-2xl font-bold leading-none tracking-wider">AERIAL</h1>
            <span className="text-xs text-gray-500 tracking-[0.2em]">CLIENT ACCESS</span>
          </div>
        </div>

        {/* Project Selector */}
        {projects.length > 1 && (
            <div className="mb-8">
              <p className="text-xs text-gray-500 uppercase font-bold mb-4 ml-2">Select Project</p>
              <select 
                className="w-full bg-[#2b2320] border border-[#3c3330] text-[#f5f3ef] p-3 rounded-lg focus:ring-2 focus:ring-[#f59e0b] outline-none font-heading"
                onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value))}
                value={selectedProject?.id || ''}
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
            </div>
        )}

        {/* Navigation */}
        <nav className="flex-1">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Overview" />
          <TabButton active={activeTab === '3d'} onClick={() => setActiveTab('3d')} icon={Box} label="3D Digital Twin" />
          <TabButton active={activeTab === 'media'} onClick={() => setActiveTab('media')} icon={Video} label="Media & FPV" />
          <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={FileText} label="Files & Reports" />
        </nav>

        {/* User Info & Logout */}
        <div className="mt-auto pt-6 border-t border-[#3c3330]">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-[#f59e0b] text-[#1c1614] flex items-center justify-center font-bold text-lg">
              {user?.uid.slice(0,1).toUpperCase() || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold">{selectedProject?.clientName.split(' ')[0] || 'Client'}</p>
              <p className="text-xs text-gray-500">ID: {user?.uid.slice(0,6)}...</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center text-xs text-gray-500 hover:text-red-400 transition">
            <LogOut size={14} className="mr-2" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8">
        {selectedProject && (
          <div className="max-w-6xl mx-auto">
            
            {/* HEADER */}
            <header className="flex justify-between items-end mb-8 pb-6 border-b border-[#3c3330]">
              <div>
                <span className="text-[#f59e0b] font-mono text-sm mb-1 block">PROJECT ID: {selectedProject.id.toUpperCase().slice(0,8)}</span>
                <h2 className="text-4xl font-bold text-white">{selectedProject.projectName}</h2>
                <p className="text-gray-400 mt-1">{selectedProject.clientName}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-900 text-xs font-bold uppercase tracking-wide">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  {selectedProject.status || 'Active'}
                </div>
                <p className="text-xs text-gray-500 mt-2">Last Flight: {new Date(selectedProject.lastFlight).toLocaleDateString()}</p>
              </div>
            </header>

            {/* DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard icon={TrendingUp} label="Overall Progress" value={`${latestMetric.progress}%`} subtext={`+${(latestMetric.progress - (metrics[metrics.length - 2]?.progress || 0)).toFixed(1)}% this week`} />
                  <StatCard icon={Map} label="Total Survey Area" value="4.2 Ha" subtext="GSD: 2.4cm/px" />
                  <StatCard icon={Box} label="Cut/Fill Volume" value={`${latestMetric.volume}m³`} subtext={`Net: ${(latestMetric.cut - latestMetric.fill)}m³`} />
                </div>

                {/* AI Insight */}
                <div className="bg-gradient-to-r from-[#2b2320] to-[#2b2320] p-6 rounded-xl border border-[#f59e0b]/30 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]"></div>
                  <div className="flex items-start">
                    <div className="p-3 bg-[#f59e0b]/10 rounded-lg text-[#f59e0b] mr-4">
                      <Cpu size={28} />
                    </div>
                    <div>
                      <h3 className="text-[#f59e0b] text-lg font-bold mb-1 font-heading">Gemini Site Analysis</h3>
                      <p className="text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: aiSummaryHtml }} />
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#2b2320] p-6 rounded-xl border border-[#3c3330]">
                    <h3 className="text-lg font-bold mb-6 flex items-center"><TrendingUp size={18} className="mr-2 text-[#f59e0b]"/> Volumetric Progress (m³)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={metrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3c3330" vertical={false} />
                        <XAxis dataKey="name" stroke="#888" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#888" tick={{fill: '#888', fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#1c1614', border: '1px solid #3c3330', borderRadius: '8px'}}
                          itemStyle={{color: '#f5f3ef'}}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10 }} />
                        <Bar dataKey="cut" name="Cut" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="fill" name="Fill" stackId="a" fill="#4d4340" radius={[0, 0, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-[#2b2320] p-6 rounded-xl border border-[#3c3330]">
                     <h3 className="text-lg font-bold mb-6 flex items-center"><Map size={18} className="mr-2 text-[#f59e0b]"/> Site Completion Rate (%)</h3>
                     <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3c3330" vertical={false} />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{backgroundColor: '#1c1614', border: '1px solid #3c3330'}} />
                        <Line type="monotone" dataKey="progress" name="Progress" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 3D DIGITAL TWIN TAB */}
            {activeTab === '3d' && (
              <div className="bg-[#2b2320] rounded-xl border border-[#3c3330] overflow-hidden h-[70vh] relative animate-in zoom-in-95 duration-300">
                <div className="absolute inset-0 flex items-center justify-center bg-[#1c1614] z-0">
                   <div className="text-center">
                     <Box size={64} className="mx-auto text-[#3c3330] mb-4" />
                     <p className="text-gray-500 font-heading text-xl">Interactive 3D Model Viewer Placeholder</p>
                     <p className="text-xs text-gray-600 mt-2">Replace this section with an iframe hosting your Sketchfab or WebODM/Potree 3D model.</p>
                   </div>
                </div>
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedProject.media?.map((item, i) => (
                  <div key={i} className="bg-[#2b2320] rounded-xl border border-[#3c3330] overflow-hidden group cursor-pointer hover:border-[#f59e0b] transition-all">
                    <div className="h-48 bg-black relative overflow-hidden">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-12 h-12 bg-[#f59e0b]/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                           <Video className="text-[#1c1614] ml-1" fill="currentColor" />
                         </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs font-bold font-mono">4K {item.type.toUpperCase()}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-heading font-bold text-lg text-[#f5f3ef]">{item.title}</h3>
                        <span className="text-xs text-gray-500">{item.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FILES TAB */}
            {activeTab === 'files' && (
              <div className="bg-[#2b2320] rounded-xl border border-[#3c3330] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#3c3330] text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">File Name</th>
                      <th className="p-4 font-medium">Type</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-300">
                    <tr className="border-b border-[#3c3330] hover:bg-[#3c3330]/50 transition">
                      <td className="p-4 font-medium text-white flex items-center"><FileText size={16} className="mr-3 text-[#f59e0b]"/> Survey_Report_Wk4.pdf</td>
                      <td className="p-4">PDF Report</td>
                      <td className="p-4">Oct 25, 2025</td>
                      <td className="p-4 text-right"><button className="text-[#f59e0b] hover:underline text-xs font-bold font-heading">DOWNLOAD</button></td>
                    </tr>
                    <tr className="border-b border-[#3c3330] hover:bg-[#3c3330]/50 transition">
                      <td className="p-4 font-medium text-white flex items-center"><Box size={16} className="mr-3 text-[#f59e0b]"/> Site_Point_Cloud.laz</td>
                      <td className="p-4">LiDAR Data</td>
                      <td className="p-4">Oct 24, 2025</td>
                      <td className="p-4 text-right"><button className="text-[#f59e0b] hover:underline text-xs font-bold font-heading">DOWNLOAD</button></td>
                    </tr>
                    <tr className="hover:bg-[#3c3330]/50 transition">
                      <td className="p-4 font-medium text-white flex items-center"><Map size={16} className="mr-3 text-[#f59e0b]"/> Orthomosaic_HighRes.tiff</td>
                      <td className="p-4">GeoTIFF Map</td>
                      <td className="p-4">Oct 22, 2025</td>
                      <td className="p-4 text-right"><button className="text-[#f59e0b] hover:underline text-xs font-bold font-heading">DOWNLOAD</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;