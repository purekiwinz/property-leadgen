import LeadGenForm from "@/components/LeadGenForm";
import Image from "next/image";
import Link from "next/link";
import { Award, CheckCircle, Clock, MapPin, Star, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const revalidate = 0; // Disable static caching so it always gets latest settings

export default async function Home() {
  // Fetch dynamic data from Supabase
  const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  const { data: sales } = await supabase.from('recent_sales').select('*').order('display_order', { ascending: true });

  const agentName = settings?.agent_name || "Ed Scanlan";
  const agentPhone = settings?.agent_phone || "021 814 578";
  const agentEmail = settings?.agent_email || "ed.s@arizto.co.nz";
  
  // Fallback if no sales returned
  const recentSales = sales && sales.length > 0 ? sales : [
    { 
      address: "608/11 Tamariki Avenue, Orewa", 
      price: "Sold Nov 2025", 
      days: "Premium Apartment", 
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600" 
    },
    { 
      address: "5 Grovenor Drive, Orewa", 
      price: "$2,036,000", 
      days: "High-End Result", 
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=600" 
    },
    { 
      address: "12 Parkview Drive, Gulf Harbour", 
      price: "$1,435,000", 
      days: "Hibiscus Coast", 
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=600" 
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header/Nav Space */}
      <header className="absolute top-0 w-full z-10 p-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#20C888] text-white font-black px-3 py-1 rounded text-xl italic tracking-tighter shadow-lg">
            ARIZTO
          </div>
          <div className="h-8 w-px bg-white/30 hidden sm:block"></div>
          <div className="font-bold text-lg tracking-tight text-white drop-shadow-md hidden sm:block">
            {agentName}
          </div>
        </div>
        <div className="text-sm font-semibold text-white/90 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/20">
          Hibiscus Coast Specialist
        </div>
      </header>

      {/* Main Content with Hero Background */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 px-4 flex flex-col items-center justify-center min-h-[600px] lg:min-h-[750px]">
          <div className="absolute inset-0 z-0">
            <Image 
              src="https://images.unsplash.com/photo-1722068574950-c331f9a2b745?auto=format&fit=crop&q=80&w=2000"
              alt="Aerial shot of Hibiscus Coast New Zealand"
              fill
              priority
              className="object-cover object-center"
            />
            {/* Dark Overlay for text readability */}
            <div className="absolute inset-0 bg-black/40 z-0"></div>
          </div>
          
          <div className="w-full max-w-4xl text-center mb-12 space-y-6 relative z-10 text-white">
            <div className="inline-flex items-center gap-2 bg-[#20C888] text-white px-4 py-2 rounded-full text-sm font-bold mb-2 shadow-xl animate-pulse">
              <TrendingUp className="w-4 h-4" /> Hibiscus Coast Market Update 2026
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] drop-shadow-2xl">
              Thinking of Selling <br className="hidden sm:block"/>
              on the Coast?
            </h1>
            <p className="text-lg sm:text-2xl text-slate-100 max-w-2xl mx-auto drop-shadow-lg font-medium leading-relaxed">
              Get an expert, data-driven appraisal from {agentName}. Leverage 20 years of marketing expertise to achieve a premium result for your home.
            </p>
          </div>

          {/* The Lead Gen Form - Positioned to overlap */}
          <div className="w-full relative z-20 -mb-48 sm:-mb-64">
            <LeadGenForm />
          </div>
        </div>

        {/* Spacer for the overlapping form */}
        <div className="h-56 sm:h-72 bg-slate-50 w-full"></div>

        {/* About Ed Scanlan Section */}
        <section className="bg-white py-24 px-4 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 relative">
                <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-50 aspect-[4/5] w-full max-w-md mx-auto">
                  <Image 
                    src="/ed-scanlan-clean.png" 
                    alt={`${agentName} - Arizto Real Estate`}
                    fill
                    className="object-cover"
                  />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#20C888]/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl"></div>
              </div>
              
              <div className="lg:w-1/2 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-[#20C888] tracking-[0.2em] uppercase italic">The Marketing Advantage</h2>
                  <h3 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight">Meet {agentName}</h3>
                  <p className="text-xl text-slate-600 font-medium">
                    A licensed real estate professional with over 20 years of high-level marketing and storytelling experience.
                  </p>
                </div>
                
                <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
                  <p>
                    Before transitioning his skills to real estate, {agentName.split(' ')[0]} spent 16 years at the <strong>NZ Herald</strong> and <strong>NZME</strong> in senior marketing and sales leadership roles. This unique background gives him a competitive edge in positioning your property to stand out in a crowded market.
                  </p>
                  <p>
                    A long-term Hibiscus Coast local of over 14 years, {agentName.split(' ')[0]} combines deep community knowledge with the innovative, digital-first approach of Arizto Real Estate to deliver results that exceed expectations.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#e9faf3] p-2 rounded-lg">
                      <Award className="w-6 h-6 text-[#20C888]" />
                    </div>
                    <span className="font-bold text-slate-800">Branch Manager Qualified</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#e9faf3] p-2 rounded-lg">
                      <Star className="w-6 h-6 text-[#20C888]" />
                    </div>
                    <span className="font-bold text-slate-800">5-Star Client Reviews</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#e9faf3] p-2 rounded-lg">
                      <Clock className="w-6 h-6 text-[#20C888]" />
                    </div>
                    <span className="font-bold text-slate-800">20+ Years Marketing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#e9faf3] p-2 rounded-lg">
                      <MapPin className="w-6 h-6 text-[#20C888]" />
                    </div>
                    <span className="font-bold text-slate-800">Local Expert (14yrs)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Sales Grid */}
        <section className="bg-slate-50 py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-black text-slate-900">Proven Hibiscus Coast Results</h2>
              <p className="text-slate-500 text-xl max-w-2xl mx-auto font-medium">We leverage smart technology and premium marketing to achieve top dollar for our clients.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {recentSales.map((sale: any, i: number) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 group hover:translate-y-[-8px] transition-all duration-300">
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image 
                      src={sale.image} 
                      alt={sale.address}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-[#20C888] text-white text-xs font-black px-4 py-2 rounded-full shadow-lg">
                      {sale.days}
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-black text-slate-900 mb-2">{sale.price}</h3>
                    <p className="text-slate-500 flex items-center gap-2 text-base font-bold">
                      <MapPin className="h-5 w-5 text-[#20C888]" />
                      {sale.address}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
      </main>

      {/* Footer */}
      <footer className="w-full py-20 bg-slate-900 text-slate-400 text-base mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-[#20C888] text-white font-black px-2 py-0.5 rounded italic tracking-tighter text-lg">
                  ARIZTO
                </div>
                <div className="font-bold text-white text-lg">{agentName}</div>
              </div>
              <div className="space-y-2 leading-relaxed">
                <p className="text-white font-bold text-sm">Licensed Real Estate Professional (REAA 2008)</p>
                <p>Serving the Hibiscus Coast with smarter technology and better results.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-white font-bold text-lg uppercase tracking-wider">Contact {agentName.split(' ')[0]}</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <span className="text-[#20C888]">📞</span>
                  </div>
                  <span className="font-medium text-slate-200">{agentPhone}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <span className="text-[#20C888]">✉️</span>
                  </div>
                  <span className="font-medium text-slate-200">{agentEmail}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-white font-bold text-lg uppercase tracking-wider">Legal</h4>
              <ul className="space-y-4">
                <li><Link href="/privacy" className="hover:text-[#20C888] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#20C888] transition-colors">Terms of Service</Link></li>
                <li><a href="https://www.rea.govt.nz/buyers-and-sellers/read-our-guides/" target="_blank" rel="noopener noreferrer" className="hover:text-[#20C888] transition-colors">REA Guide</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} {agentName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
