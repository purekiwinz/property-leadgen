"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { List, Users, LogOut, Save, Trash2, Upload, Link2, QrCode, Copy, ChevronDown, ChevronUp, Plus, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Session } from "@supabase/supabase-js";
import { Lead, Sale, Link, LinkClick } from "@/types/database";

function sortSales(list: Sale[]): Sale[] {
  return [...list].sort((a, b) =>
    (a.display_order ?? 9999) - (b.display_order ?? 9999)
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState("leads");
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Links state
  const [linkForm, setLinkForm] = useState<Partial<Link> | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [linkClicks, setLinkClicks] = useState<Record<string, LinkClick[]>>({});
  const [loadingClicks, setLoadingClicks] = useState<string | null>(null);

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

    const linksHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const linksRes = await fetch('/api/admin/links', { headers: linksHeaders });
    if (linksRes.ok) setLinks(await linksRes.json());

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

  // ── Link helpers ────────────────────────────────────────────────
  const authHeader = async (): Promise<Record<string, string>> => {
    const { data: { session: s } } = await supabase.auth.getSession();
    return s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : {};
  };

  const fetchLinks = async () => {
    const h = await authHeader();
    const res = await fetch('/api/admin/links', { headers: h });
    if (res.ok) setLinks(await res.json());
  };

  const saveLink = async () => {
    if (!linkForm) return;
    setLinkSaving(true);
    const method = linkForm.id ? 'PUT' : 'POST';
    const h = await authHeader();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clicks_total, clicks_today, clicks_week, clicks_month, ...linkPayload } = linkForm;
    const res = await fetch('/api/admin/links', {
      method,
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify(linkPayload),
    });
    setLinkSaving(false);
    if (!res.ok) { alert('Save failed: ' + (await res.json()).error); return; }
    setLinkForm(null);
    fetchLinks();
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Delete this link and all its click data?')) return;
    const h = await authHeader();
    const res = await fetch(`/api/admin/links?id=${id}`, { method: 'DELETE', headers: h });
    if (!res.ok) { alert('Delete failed'); return; }
    setLinks(links.filter(l => l.id !== id));
  };

  const fetchLinkClicks = async (linkId: string) => {
    if (linkClicks[linkId]) { setExpandedLinkId(expandedLinkId === linkId ? null : linkId); return; }
    setLoadingClicks(linkId);
    const h = await authHeader();
    const res = await fetch(`/api/admin/links/${linkId}/clicks`, { headers: h });
    if (res.ok) {
      const data = await res.json();
      setLinkClicks(prev => ({ ...prev, [linkId]: data }));
    }
    setLoadingClicks(null);
    setExpandedLinkId(linkId);
  };

  const downloadQR = async (link: Link) => {
    const shortUrl = `${window.location.origin}/links/${link.code}`;
    const res = await fetch('/api/links/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: shortUrl, code: link.code, color: link.qr_color || '#387f73' }),
    });
    if (!res.ok) { alert('QR generation failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `qr-${link.code}.png`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyShortUrl = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/links/${code}`);
  };

  const newLinkDefaults = (): Partial<Link> => ({
    code: `qr${Math.floor(1000 + Math.random() * 9000)}`,
    label: '',
    destination_url: '',
    source: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    qr_color: '#387f73',
    is_active: true,
  });
  // ────────────────────────────────────────────────────────────────

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

  const saveSale = async (sale: Sale) => {
    const { error } = await supabase.from('recent_sales').update({
      address: sale.address,
      days: sale.days,
      beds: sale.beds,
      baths: sale.baths,
      parking: sale.parking,
      sale_method: sale.sale_method,
      image: sale.image,
      display_order: sale.display_order,
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
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
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
          <button onClick={() => setActiveTab('links')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'links' ? 'bg-[#FF4753] text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
            <Link2 className="w-5 h-5" /> Short Links
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
                      {sale.image && <img src={sale.image} alt={sale.address} className="w-full h-full object-cover" />}
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

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Sort Order</label>
                        <input type="number" min="1" value={sale.display_order || ''} onChange={e => updateSale(sale.id, 'display_order', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF4753] text-sm font-medium" placeholder="1" />
                      </div>
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

        {activeTab === 'links' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900">Short Links <span className="text-lg text-slate-400 font-medium">({links.length})</span></h2>
              <button
                onClick={() => setLinkForm(newLinkDefaults())}
                className="flex items-center gap-2 bg-[#387f73] text-white font-bold px-4 py-2.5 rounded-xl hover:brightness-110 transition-all"
              >
                <Plus className="w-4 h-4" /> New Link
              </button>
            </div>

            {/* Create / Edit form */}
            {linkForm && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-black text-slate-900 text-lg">{linkForm.id ? 'Edit Link' : 'New Link'}</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Short Code</label>
                    <input
                      type="text"
                      value={linkForm.code}
                      onChange={e => setLinkForm({ ...linkForm, code: e.target.value })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm font-mono font-bold"
                      placeholder="qr1234"
                    />
                    <p className="text-xs text-slate-400 mt-1">/links/{linkForm.code || '…'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={linkForm.label || ''}
                      onChange={e => setLinkForm({ ...linkForm, label: e.target.value })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm"
                      placeholder="Facebook Orewa May 2026"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Destination URL</label>
                    <input
                      type="url"
                      value={linkForm.destination_url}
                      onChange={e => setLinkForm({ ...linkForm, destination_url: e.target.value })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm"
                      placeholder="https://leads.edscanlan.co.nz"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Source <span className="font-normal text-slate-400">(lead origin → HubSpot)</span></label>
                    <select
                      value={linkForm.source || ''}
                      onChange={e => setLinkForm({ ...linkForm, source: e.target.value })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm bg-white"
                    >
                      <option value="">— none —</option>
                      <option value="website">website</option>
                      <option value="dle">dle</option>
                      <option value="letterbox">letterbox</option>
                      <option value="flyer">flyer</option>
                      <option value="signboard">signboard</option>
                      <option value="facebook">facebook</option>
                      <option value="instagram">instagram</option>
                      <option value="google">google</option>
                      <option value="email">email</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                </div>

                {/* UTM parameters — source & medium are dropdowns, rest free-form */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">utm_source <span className="text-red-400">*</span></label>
                    <select
                      value={linkForm.utm_source || ''}
                      onChange={e => setLinkForm({ ...linkForm, utm_source: e.target.value })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm bg-white"
                    >
                      <option value="">— select —</option>
                      <optgroup label="Print">
                        <option value="letterbox">letterbox</option>
                        <option value="flyer">flyer</option>
                        <option value="signboard">signboard</option>
                        <option value="brochure">brochure</option>
                        <option value="postcard">postcard</option>
                        <option value="window_card">window_card</option>
                        <option value="open_home_programme">open_home_programme</option>
                      </optgroup>
                      <optgroup label="Digital">
                        <option value="facebook">facebook</option>
                        <option value="instagram">instagram</option>
                        <option value="google">google</option>
                        <option value="realestate_com_au">realestate_com_au</option>
                        <option value="domain">domain</option>
                        <option value="mailchimp">mailchimp</option>
                        <option value="email_signature">email_signature</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">utm_medium <span className="text-red-400">*</span></label>
                    <select
                      value={linkForm.utm_medium || ''}
                      onChange={e => setLinkForm({ ...linkForm, utm_medium: e.target.value })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm bg-white"
                    >
                      <option value="">— select —</option>
                      <option value="qr">qr — print QR code</option>
                      <option value="cpc">cpc — paid digital ad</option>
                      <option value="social">social — organic social</option>
                      <option value="email">email — email campaign</option>
                      <option value="referral">referral — listing portal</option>
                      <option value="direct_mail">direct_mail — posted mail</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">utm_campaign <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={linkForm.utm_campaign || ''}
                      onChange={e => setLinkForm({ ...linkForm, utm_campaign: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm"
                      placeholder="14_maple_st_launch"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">utm_content</label>
                    <input
                      type="text"
                      value={linkForm.utm_content || ''}
                      onChange={e => setLinkForm({ ...linkForm, utm_content: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm"
                      placeholder="open_home_flyer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">utm_term</label>
                    <input
                      type="text"
                      value={linkForm.utm_term || ''}
                      onChange={e => setLinkForm({ ...linkForm, utm_term: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm"
                      placeholder="audience_segment"
                    />
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">QR Code Colour</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={linkForm.qr_color || '#387f73'}
                        onChange={e => setLinkForm({ ...linkForm, qr_color: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={linkForm.qr_color || '#387f73'}
                        onChange={e => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setLinkForm({ ...linkForm, qr_color: v });
                        }}
                        className="w-28 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-[#387f73] text-sm font-mono"
                        placeholder="#387f73"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={linkForm.is_active}
                      onChange={e => setLinkForm({ ...linkForm, is_active: e.target.checked })}
                      className="w-4 h-4 accent-[#387f73]"
                    />
                    Active
                  </label>

                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => setLinkForm(null)}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLink}
                      disabled={linkSaving || !linkForm.code || !linkForm.destination_url}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-[#387f73] text-white hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {linkSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Links table */}
            <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden${linkForm ? ' hidden' : ''}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-bold border-b">Link</th>
                      <th className="p-4 font-bold border-b text-center">Today</th>
                      <th className="p-4 font-bold border-b text-center">7 days</th>
                      <th className="p-4 font-bold border-b text-center">30 days</th>
                      <th className="p-4 font-bold border-b text-center">All time</th>
                      <th className="p-4 font-bold border-b"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {links.map(link => (
                      <>
                        <tr key={link.id} className="hover:bg-slate-50 transition-colors text-sm">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${link.is_active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900">/links/{link.code}</span>
                                  <button onClick={() => copyShortUrl(link.code)} title="Copy URL" className="text-slate-400 hover:text-[#387f73] transition-colors">
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {link.label && <div className="text-xs text-slate-500 font-medium mt-0.5">{link.label}</div>}
                                <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{link.destination_url}</div>
                                {(link.utm_source || link.utm_medium || link.utm_campaign) && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {link.utm_source && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{link.utm_source}</span>}
                                    {link.utm_medium && <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{link.utm_medium}</span>}
                                    {link.utm_campaign && <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{link.utm_campaign}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-800">{link.clicks_today ?? 0}</td>
                          <td className="p-4 text-center font-bold text-slate-800">{link.clicks_week ?? 0}</td>
                          <td className="p-4 text-center font-bold text-slate-800">{link.clicks_month ?? 0}</td>
                          <td className="p-4 text-center font-bold text-slate-800">{link.clicks_total ?? 0}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 justify-end">
                              {/* QR colour swatch */}
                              <span
                                className="w-5 h-5 rounded border border-slate-200 flex-shrink-0"
                                style={{ background: link.qr_color || '#387f73' }}
                                title={`QR colour: ${link.qr_color || '#387f73'}`}
                              />
                              <button onClick={() => downloadQR(link)} title="Download QR code" className="p-1.5 text-slate-400 hover:text-[#387f73] transition-colors">
                                <QrCode className="w-4 h-4" />
                              </button>
                              <a href={`/links/${link.code}`} target="_blank" rel="noopener" title="Open link" className="p-1.5 text-slate-400 hover:text-[#387f73] transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => fetchLinkClicks(link.id)}
                                title="View click history"
                                className="p-1.5 text-slate-400 hover:text-[#387f73] transition-colors"
                              >
                                {expandedLinkId === link.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setLinkForm({ ...link })} title="Edit" className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteLink(link.id)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedLinkId === link.id && (
                          <tr key={`${link.id}-clicks`}>
                            <td colSpan={6} className="bg-slate-50 px-6 py-4 border-b">
                              {loadingClicks === link.id ? (
                                <p className="text-sm text-slate-500">Loading clicks…</p>
                              ) : (linkClicks[link.id]?.length ?? 0) === 0 ? (
                                <p className="text-sm text-slate-500">No clicks recorded yet.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="text-slate-400 uppercase tracking-wider">
                                        <th className="pb-2 pr-4 font-bold text-left">Time</th>
                                        <th className="pb-2 pr-4 font-bold text-left">Referer</th>
                                        <th className="pb-2 pr-4 font-bold text-left">IP</th>
                                        <th className="pb-2 font-bold text-left">User Agent</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {(linkClicks[link.id] || []).map((click: LinkClick) => (
                                        <tr key={click.id} className="text-slate-600">
                                          <td className="py-1.5 pr-4 whitespace-nowrap font-medium">
                                            {new Date(click.clicked_at).toLocaleString('en-NZ', { dateStyle: 'short', timeStyle: 'short' })}
                                          </td>
                                          <td className="py-1.5 pr-4 max-w-[200px] truncate text-slate-500">
                                            {click.referer || <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="py-1.5 pr-4 font-mono text-slate-500">{click.ip_address}</td>
                                          <td className="py-1.5 max-w-[280px] truncate text-slate-400">{click.user_agent}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <p className="text-xs text-slate-400 mt-2">Showing last {linkClicks[link.id]?.length} clicks</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {links.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-medium">No links yet. Create your first short link above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
