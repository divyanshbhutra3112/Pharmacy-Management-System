import { useState, useEffect } from 'react';
import axios from 'axios';
import init, { filter_medicines } from './wasm/wasm_engine.js';

function App() {
    const [medicines, setMedicines] = useState([]);
    const [displayData, setDisplayData] = useState([]);
    const [wasmReady, setWasmReady] = useState(false);
    const [activeTab, setActiveTab] = useState('home');

    const [filterMode, setFilterMode] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMfg, setSelectedMfg] = useState('All');
    const [selectedPurpose, setSelectedPurpose] = useState('All');

    const [formData, setFormData] = useState({
        batch_id: '', medicine_name: '', combination: '',
        date_of_expiry: '', manufacturer: '', price: '', purpose: ''
    });

    // DEFENSE 1: Safe Array Mapping (Prevents .map() crashes if data is missing)
    const safeMedicines = Array.isArray(medicines) ? medicines : [];
    const uniqueMfgs = ["All", ...new Set(safeMedicines.map(m => m?.manufacturer || "Unknown"))];
    const uniquePurposes = ["All", ...new Set(safeMedicines.map(m => m?.purpose || "Unknown"))];

    useEffect(() => {
        async function loadWasmAndData() {
            try {
                await init();
                setWasmReady(true);
                fetchMedicines();
            } catch (err) {
                console.error("Failed to load WASM:", err);
            }
        }
        loadWasmAndData();
    }, []);

    const fetchMedicines = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8080/api/medicines');
            if (Array.isArray(res.data)) {
                setMedicines(res.data);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    useEffect(() => {
        if (!wasmReady || safeMedicines.length === 0) {
            setDisplayData(safeMedicines);
            return;
        }

        if (activeTab === 'db') {
            const sorted = [...safeMedicines].sort((a, b) => (a?.medicine_name || "").localeCompare(b?.medicine_name || ""));
            setDisplayData(sorted);
            return;
        }

        // DEFENSE 2: WASM Safety Net (Prevents unhandled Rust panics from killing React)
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const jsonStr = JSON.stringify(safeMedicines);
            const resultStr = filter_medicines(jsonStr, filterMode, searchTerm, selectedMfg, selectedPurpose, todayStr);

            const parsedData = JSON.parse(resultStr);
            setDisplayData(Array.isArray(parsedData) ? parsedData : []);
        } catch (wasmError) {
            console.error("WASM Engine encountered a non-fatal error:", wasmError);
            setDisplayData(safeMedicines); // Fallback to unfiltered data so the screen stays alive
        }
    }, [medicines, filterMode, searchTerm, selectedMfg, selectedPurpose, activeTab, wasmReady]);

    // DEFENSE 3: Form Input Safety (Keep everything as strings until submission)
    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Parse the price safely only at the exact moment of transmission
            const payload = {
                ...formData,
                price: parseFloat(formData.price) || 0.0
            };

            await axios.post('http://127.0.0.1:8080/api/medicines', payload);
            fetchMedicines();
            setFormData({ batch_id: '', medicine_name: '', combination: '', date_of_expiry: '', manufacturer: '', price: '', purpose: '' });
            setActiveTab('db');
        } catch (err) {
            console.error("Error saving medicine:", err);
            alert("Failed to save to database. Check console.");
        }
    };

    const handleDelete = async (e) => {
        e.preventDefault();
        const batchIdToDelete = e.target.delete_id.value;
        if (!batchIdToDelete) return;

        if (window.confirm(`Are you absolutely sure you want to delete batch ${batchIdToDelete}?`)) {
            try {
                await axios.delete(`http://127.0.0.1:8080/api/medicines/${batchIdToDelete}`);
                fetchMedicines();
                e.target.reset();
                setActiveTab('db');
            } catch (err) {
                console.error("Error deleting medicine:", err);
                alert("Failed to delete. Check console or verify Batch ID.");
            }
        }
    };

    const MedicineTable = ({ data }) => (
        <div className="overflow-x-auto bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 shadow-xl">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-900/50 text-slate-300 border-b border-slate-700 text-sm tracking-wider uppercase">
                    <th className="p-4">Batch ID</th>
                    <th className="p-4">Medicine</th>
                    <th className="p-4">Combination</th>
                    <th className="p-4">Expiry</th>
                    <th className="p-4">Manufacturer</th>
                    <th className="p-4">Price (₹)</th>
                    <th className="p-4">Purpose</th>
                </tr>
                </thead>
                <tbody>
                {(!Array.isArray(data) || data.length === 0) ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-500">No records found matching criteria.</td></tr>
                ) : (
                    data.map((med, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                            <td className="p-4 font-mono text-sm text-slate-400">{med?.batch_id}</td>
                            <td className="p-4 font-medium text-emerald-400">{med?.medicine_name}</td>
                            <td className="p-4 text-sm text-slate-300">{med?.combination}</td>
                            <td className="p-4 text-sm text-amber-200">{med?.date_of_expiry}</td>
                            <td className="p-4 text-sm text-slate-300">{med?.manufacturer}</td>
                            {/* DEFENSE 4: Safe Number Conversion */}
                            <td className="p-4 text-sm text-slate-100 font-semibold">₹{Number(med?.price || 0).toFixed(2)}</td>
                            <td className="p-4 text-sm text-slate-400">{med?.purpose}</td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">

            <div className="w-64 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 flex flex-col z-10 shadow-2xl">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-500 to-teal-600 mr-3 shadow-lg shadow-emerald-500/20 flex items-center justify-center font-bold text-white">Rx</div>
                    <h1 className="text-xl font-bold tracking-tight text-white">PharmaDB</h1>
                </div>

                <div className="flex-1 py-6 px-3 space-y-2">
                    <button onClick={() => setActiveTab('home')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${activeTab === 'home' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                        <span className="mr-3 text-lg">🏠</span> Home (WASM Engine)
                    </button>
                    <button onClick={() => setActiveTab('db')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${activeTab === 'db' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                        <span className="mr-3 text-lg">🗄️</span> Full Database
                    </button>
                    <button onClick={() => setActiveTab('edit')} className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${activeTab === 'edit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                        <span className="mr-3 text-lg">⚙️</span> DB Edit Tools
                    </button>
                </div>

                <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                    <span>Engine Status:</span>
                    {wasmReady ? <span className="flex items-center text-emerald-500"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>Online</span> : <span className="text-red-500">Offline</span>}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden">
                <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 z-10">
                    <h2 className="text-xl font-semibold text-slate-200 tracking-wide">
                        {activeTab === 'home' && "Dashboard & Filtering Engine"}
                        {activeTab === 'db' && "Global Inventory View"}
                        {activeTab === 'edit' && "Database Management"}
                    </h2>
                    <div className="text-sm text-slate-500">System Time: {new Date().toLocaleDateString()}</div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 z-0">

                    {activeTab === 'home' && (
                        <div className="max-w-7xl mx-auto space-y-6">
                            <div className="bg-slate-800/50 p-6 rounded-xl backdrop-blur-md border border-slate-700/50 flex flex-col gap-4">

                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Omni-Search by Name, Combination, or Batch ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-4 items-center justify-between">
                                    <div className="flex gap-4">
                                        <select value={selectedMfg} onChange={(e) => setSelectedMfg(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
                                            {uniqueMfgs.map(mfg => <option key={mfg} value={mfg}>{mfg === "All" ? "All Manufacturers" : mfg}</option>)}
                                        </select>

                                        <select value={selectedPurpose} onChange={(e) => setSelectedPurpose(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none">
                                            {uniquePurposes.map(prp => <option key={prp} value={prp}>{prp === "All" ? "All Purposes" : prp}</option>)}
                                        </select>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filterMode === 'all' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>All Dates</button>
                                        <button onClick={() => setFilterMode('expired_3_days')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filterMode === 'expired_3_days' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'}`}>⚠️ 3 Days Expired</button>
                                        <button onClick={() => setFilterMode('expire_10_days')} className={`px-4 py-2 rounded-lg font-medium transition-all ${filterMode === 'expire_10_days' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-amber-400'}`}>⏳ 10 Days Warning</button>
                                    </div>
                                </div>
                            </div>
                            <MedicineTable data={displayData} />
                        </div>
                    )}

                    {activeTab === 'db' && (
                        <div className="max-w-7xl mx-auto space-y-4">
                            <p className="text-slate-400 text-sm mb-4">Showing {displayData.length} records, sorted alphabetically by Medicine Name.</p>
                            <MedicineTable data={displayData} />
                        </div>
                    )}

                    {activeTab === 'edit' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="bg-slate-800/60 backdrop-blur-lg p-8 rounded-2xl border border-slate-700 shadow-2xl">
                                <h2 className="text-2xl font-semibold mb-6 text-white flex items-center"><span className="text-emerald-400 mr-2">+</span> Add New Batch to Inventory</h2>
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold ml-1">Batch ID</label>
                                        <input required name="batch_id" value={formData.batch_id} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold ml-1">Medicine Name</label>
                                        <input required name="medicine_name" value={formData.medicine_name} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold ml-1">Combination</label>
                                        <input required name="combination" value={formData.combination} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold ml-1">Expiry Date</label>
                                        <input required name="date_of_expiry" type="date" value={formData.date_of_expiry} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold ml-1">Manufacturer</label>
                                        <input required name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold ml-1">Unit Price (₹)</label>
                                        <input required name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold ml-1">Primary Purpose</label>
                                        <input required name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="md:col-span-2 mt-4">
                                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 py-3 rounded-lg font-bold tracking-wide transition-all active:scale-[0.99]">
                                            Insert Record to Database
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="bg-rose-900/20 border border-rose-900/50 p-6 rounded-2xl">
                                <h3 className="text-rose-400 font-semibold mb-4 flex items-center">
                                    <span className="text-xl mr-2">⚠️</span> Danger Zone: Record Deletion
                                </h3>
                                <form onSubmit={handleDelete} className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-rose-300/70 uppercase tracking-wider font-semibold ml-1">Target Batch ID</label>
                                        <input required name="delete_id" placeholder="e.g., BATCH-001" className="w-full bg-slate-900/50 border border-rose-900/50 rounded-lg p-3 text-rose-100 placeholder-rose-900/50 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <button type="submit" className="bg-rose-700 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/50 px-8 py-3 rounded-lg font-bold tracking-wide transition-all active:scale-[0.99]">
                                        Permanently Delete
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;