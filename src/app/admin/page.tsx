"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { List, Users, LogOut, Save, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseSoldMonth(days: string | null): number {
  if (!days) return 0;
  const [mon, yr] = days.split(' ');
  const m = MONTHS_LONG.indexOf(mon);
  const y = parseInt(yr);
  if (m === -1 || isNaN(y)) return 0;
  return y * 12 + m;
}

function sortSales(list: any[]): any[] {
  return [...list].sort((a, b) => {
    const diff = parseSoldMonth(b.days) - parseSoldMonth(a.days);
    if (diff !== 0) return diff;
    // Same month — newest updated_at first
    return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime();
  });
}

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
  const [sales, setSales] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;

    // Fetch leads via server-side API (uses service role key — bypasses schema/RLS issues)
    const leadsRes = await fetch("/api/admin/leads", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (leadsRes.ok) {
      const leadsData = await leadsRes.json();
      setLeads(leadsData);
    } else {
      const err = await leadsRes.json().catch(() => ({ error: "Failed to fetch leads" }));
      setFetchError("Leads: " + err.error);
    }

    const { data: salesData, error: salesError } = await supabase.from('recent_sales').select('*');
    if (salesError) setFetchError('Sales: ' + salesError.message);
    if (salesData) setSales(sortSales(salesData));

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

  const updateSale = (id: string, field: string, value: string) => {
    setSales(sales.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const saveSale = async (sale: any) => {
    const { error } = await supabase.from('recent_sales').update({
      address: sale.address,
      days: sale.days,
      beds: sale.beds ? parseInt(sale.beds) : null,
      baths: sale.baths ? parseFloat(sale.baths) : null,
      parking: sale.parking,
      sale_method: sale.sale_method,
      image: sale.image,
    }).eq('id', sale.id);

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      // Re-fetch so updated_at is current, then re-sort
      const { data: fresh } = await supabase.from('recent_sales').select('*');
      if (fresh) setSales(sortSales(fresh));
      alert("Saved!");
    }
  };

  const handleImageUpload = async (saleId: string, file: File) => {
    setUploadingId(saleId);
    try {
      const sale = sales.find(s => s.id === saleId);
      const form = new FormData();
      form.append("file", file);
      form.append("address", sale?.address || saleId);

      const res = await fetch("/api/upload-image", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      // Persist immediately to DB so image isn't lost if Save isn't clicked
      const { error } = await supabase.from('recent_sales').update({ image: json.publicUrl }).eq('id', saleId);
      if (error) throw new Error("Image uploaded but failed to save: " + error.message);
      setSales(sales.map(s => s.id === saleId ? { ...s, image: json.publicUrl } : s));
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;
    const res = await fetch(`/api/admin/leads?id=${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Delete failed" }));
      alert("Error: " + err.error);
    } else {
      setLeads(leads.filter(l => l.id !== id));
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Image src="/logo-light.svg" alt="Logo" width={300} height={75} />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753]" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753]" required />
            </div>
            {authError && <p className="text-red-500 text-sm font-semibold">{authError}</p>}
            <button type="submit" className="w-full bg-[#FF4753] text-white font-bold py-3 rounded-lg hover:brightness-110 transition-all mt-2">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-[#373D40] text-white flex flex-col min-h-screen">
        <div className="p-6 border-b border-white/10">
          <Image src="/logo-dark.svg" alt="Logo" width={220} height={55} />
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'leads' ? 'bg-[#FF4753] text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
            <Users className="w-5 h-5" /> Leads
          </button>
          <button onClick={() => setActiveTab('sales')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'sales' ? 'bg-[#FF4753] text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
            <List className="w-5 h-5" /> Recent Sales
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-white/60 hover:text-red-300 hover:bg-white/10 transition-all">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto h-screen">
        {activeTab === 'leads' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900">Appraisal Leads <span className="text-lg text-slate-400 font-medium">({leads.length})</span></h2>
            {fetchError?.startsWith('Leads:') && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">
                ⚠️ {fetchError}
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">Date</th>
                      <th className="p-4 font-bold border-b">Contact</th>
                      <th className="p-4 font-bold border-b">Property Address</th>
                      <th className="p-4 font-bold border-b text-center">Timeline</th>
                      <th className="p-4 font-bold border-b text-center">Buying Next</th>
                      <th className="p-4 font-bold border-b text-center">Source</th>
                      <th className="p-4 font-bold border-b"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="p-4 font-medium text-slate-600 whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString('en-NZ')}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{lead.first_name} {lead.last_name}</div>
                          <div className="text-slate-500">{lead.email}</div>
                          <div className="text-slate-500">{lead.phone}</div>
                        </td>
                        <td className="p-4 font-bold text-slate-700 min-w-[220px]">
                          {lead.address?.includes(',') ? (
                            <>
                              <div>{lead.address.split(',')[0]}</div>
                              <div className="text-xs text-slate-400 font-medium">{lead.address.split(',').slice(1).join(',').trim()}</div>
                            </>
                          ) : lead.address}
                        </td>
                        <td className="p-4 whitespace-nowrap text-center">
                          <span className="bg-[#FFF0F1] text-[#FF4753] px-3 py-1 rounded-full text-xs font-bold">{lead.timeline}</span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-center text-xs text-slate-500 font-medium">{lead.buying_next || '—'}</td>
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
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-medium">No leads yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900">Recent Sales</h2>
            {fetchError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">
                ⚠️ {fetchError}
              </div>
            )}
            {!fetchError && sales.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm font-medium">
                No sales records found. Make sure the SQL seed data was run and the <strong>leadgen</strong> schema is exposed in Supabase → Settings → API → Exposed schemas.
              </div>
            )}
            <div className="grid gap-6">
              {sales.map((sale, i) => (
                <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6">
                  {/* Image + Upload */}
                  <div className="w-full md:w-56 shrink-0 space-y-2">
                    <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sale.image} alt={sale.address} className="w-full h-full object-cover" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={el => { fileInputRefs.current[sale.id] = el; }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(sale.id, file);
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[sale.id]?.click()}
                      disabled={uploadingId === sale.id}
                      className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingId === sale.id ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-black text-slate-900">Listing {i + 1}</h3>
                      <button onClick={() => saveSale(sale)} className="text-sm bg-slate-100 text-slate-700 hover:bg-[#FF4753] hover:text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save
                      </button>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Property Address</label>
                      <input type="text" value={sale.address || ''} onChange={e => updateSale(sale.id, 'address', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753] text-sm font-medium" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Bedrooms</label>
                        <input type="number" value={sale.beds || ''} onChange={e => updateSale(sale.id, 'beds', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753] text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Bathrooms</label>
                        <input type="number" step="0.5" value={sale.baths || ''} onChange={e => updateSale(sale.id, 'baths', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753] text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Parking</label>
                        <input type="text" value={sale.parking || ''} onChange={e => updateSale(sale.id, 'parking', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753] text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Month Sold</label>
                        <select value={sale.days || ''} onChange={e => updateSale(sale.id, 'days', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753] text-sm font-medium bg-white">
                          <option value="">— Not set —</option>
                          {(() => {
                            const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                            const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            const now = new Date();
                            const options = [];
                            for (let year = now.getFullYear(); year >= 2025; year--) {
                              const lastMonth = year === now.getFullYear() ? now.getMonth() : 11;
                              for (let m = lastMonth; m >= 0; m--) {
                                const value = `${MONTHS_LONG[m]} ${year}`;
                                const label = `${MONTHS_SHORT[m]} ${year}`;
                                options.push(<option key={value} value={value}>{label}</option>);
                              }
                            }
                            return options;
                          })()}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Sale Method</label>
                      <select value={sale.sale_method || 'By Negotiation'} onChange={e => updateSale(sale.id, 'sale_method', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753] text-sm font-medium bg-white">
                        <option>By Negotiation</option>
                        <option>Auction unless Sold Prior</option>
                        <option>Tender</option>
                        <option>Deadline Sale</option>
                        <option>Set Sale</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Image URL</label>
                      <input type="text" value={sale.image || ''} readOnly className="w-full p-2.5 border border-slate-100 rounded-lg text-sm text-slate-400 bg-slate-50 cursor-default select-all" />
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
