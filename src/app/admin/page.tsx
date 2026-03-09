"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Settings, List, Users, LogOut, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [activeTab, setActiveTab] = useState("leads");
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [leads, setLeads] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [sales, setSales] = useState<any[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch Leads
    const { data: leadsData } = await supabase.from('appraisal_leads').select('*').order('created_at', { ascending: false });
    if (leadsData) setLeads(leadsData);

    // Fetch Settings
    const { data: settingsData } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    if (settingsData) setSettings(settingsData);

    // Fetch Sales
    const { data: salesData } = await supabase.from('recent_sales').select('*').order('display_order', { ascending: true });
    if (salesData) setSales(salesData);

    setIsLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const updateSale = async (id: string, field: string, value: string) => {
    setSales(sales.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const saveSale = async (sale: any) => {
    const { error } = await supabase.from('recent_sales').update({
      address: sale.address,
      price: sale.price,
      days: sale.days,
      image: sale.image
    }).eq('id', sale.id);
    
    if (error) alert("Error saving sale: " + error.message);
    else alert("Sale updated successfully!");
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    const { error } = await supabase.from('appraisal_leads').delete().eq('id', id);
    if (error) alert("Error deleting lead: " + error.message);
    else setLeads(leads.filter(l => l.id !== id));
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-black text-slate-900 mb-6 text-center">Admin Login</h1>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#20C888]" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#20C888]" required />
            </div>
            {authError && <p className="text-red-500 text-sm font-semibold">{authError}</p>}
            <div className="pt-2">
              <button onClick={handleLogin} className="w-full bg-[#20C888] text-white font-bold py-3 rounded-lg hover:brightness-110 transition-all">Sign In</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col min-h-screen">
        <div className="p-6">
          <h2 className="text-2xl font-black text-white italic tracking-tighter">ARIZTO</h2>
          <p className="text-slate-400 text-sm font-medium mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'leads' ? 'bg-[#20C888] text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Users className="w-5 h-5" /> Leads
          </button>
          <button onClick={() => setActiveTab('sales')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'sales' ? 'bg-[#20C888] text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <List className="w-5 h-5" /> Recent Sales
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto h-screen">
        {activeTab === 'leads' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900">Appraisal Leads</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">Date</th>
                      <th className="p-4 font-bold border-b">Contact</th>
                      <th className="p-4 font-bold border-b">Property Address</th>
                      <th className="p-4 font-bold border-b text-center">Timeline</th>
                      <th className="p-4 font-bold border-b text-center">Source</th>
                      <th className="p-4 font-bold border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="p-4 font-medium text-slate-600 whitespace-nowrap text-center">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{lead.first_name} {lead.last_name}</div>
                          <div className="text-slate-500">{lead.email}</div>
                          <div className="text-slate-500">{lead.phone}</div>
                        </td>
                        <td className="p-4 font-bold text-slate-700 leading-relaxed min-w-[250px]">
                          {lead.address.includes(',') ? (
                            <>
                              <div>{lead.address.split(',')[0]}</div>
                              <div className="text-xs text-slate-400 font-medium">{lead.address.split(',').slice(1).join(',').trim()}</div>
                            </>
                          ) : (
                            lead.address
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap text-center">
                          <span className="bg-[#e9faf3] text-[#20C888] px-3 py-1 rounded-full text-xs font-bold">{lead.timeline}</span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            lead.source === 'facebook' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            lead.source === 'linkedin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {lead.source || 'website'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => deleteLead(lead.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">No leads found yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900">Recent Sales Listings</h2>
            <p className="text-slate-500 font-medium mb-6">These are the 3 property cards displayed on the landing page.</p>
            
            <div className="grid gap-6">
              {sales.map((sale, i) => (
                <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/3 aspect-video relative rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sale.image} alt={sale.address} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-slate-900">Listing {i + 1}</h3>
                      <button onClick={() => saveSale(sale)} className="text-sm bg-slate-100 text-slate-700 hover:bg-[#20C888] hover:text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Property Address</label>
                        <input type="text" value={sale.address} onChange={e => updateSale(sale.id, 'address', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#20C888] text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Price / Outcome</label>
                        <input type="text" value={sale.price} onChange={e => updateSale(sale.id, 'price', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#20C888] text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Label (e.g. Premium Result)</label>
                        <input type="text" value={sale.days} onChange={e => updateSale(sale.id, 'days', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#20C888] text-sm font-medium" />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Image URL</label>
                        <input type="text" value={sale.image} onChange={e => updateSale(sale.id, 'image', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#20C888] text-sm font-medium text-slate-500" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
