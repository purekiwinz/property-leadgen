import LeadGenForm from "@/components/LeadGenForm";
import ScrollToTop from "@/components/ScrollToTop";
import Image from "next/image";
import Link from "next/link";
import { Award, Clock, MapPin, Star } from "lucide-react";
import { BedroomIcon, BathroomIcon, CarParkIcon } from "@/components/PropertyIcons";
import { supabase } from "@/lib/supabase";

export const revalidate = 0; // Disable static caching so it always gets latest settings

export default async function Home({ searchParams }: { searchParams: Promise<{ suburb?: string; utm_medium?: string }> }) {
  const { suburb: rawSuburb, utm_medium } = await searchParams;
  const suburb = rawSuburb || '';
  const medium = utm_medium || '';
  // Fetch dynamic data from Supabase
  const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  const { data: rawSales } = await supabase.from('recent_sales').select('*');
  const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const sales = rawSales ? [...rawSales].sort((a, b) => {
    const toNum = (d: string | null) => { if (!d) return 0; const [m,y] = d.split(' '); const mi = MONTHS_LONG.indexOf(m); return isNaN(parseInt(y)) || mi === -1 ? 0 : parseInt(y)*12+mi; };
    const diff = toNum(b.days) - toNum(a.days);
    return diff !== 0 ? diff : new Date(b.updated_at??0).getTime() - new Date(a.updated_at??0).getTime();
  }) : [];

  const agentName = settings?.agent_name || "Ed Scanlan";
  const agentPhone = settings?.agent_phone || "021 814 578";
  const agentEmail = "ed.scanlan@meros.co.nz";
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Header/Nav Space */}
      <header className="relative w-full z-20 bg-[#373D40]/90 px-5 py-3">
        <div className="flex flex-col items-start gap-2 lg:gap-3 w-full">
          <div className="flex items-center gap-3">
            <Image
               src="/logo-dark.svg"
               alt="Professionals Hibiscus Coast"
               width={221}
               height={55}
               className="w-auto h-10 lg:h-14 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
               priority
            />
          </div>
        </div>
      </header>

      {/* Main Content with Hero Background */}
      <main className="flex-1 flex flex-col">
        {/* First-fold wrapper: header + hero fill exactly 100vh on mobile */}
        {/* Hero Section */}
        <div className="relative pt-2 px-4 flex flex-col items-center justify-center lg:justify-end flex-1 lg:flex-none lg:min-h-[850px] overflow-hidden bg-sky-200">
          <div className="absolute inset-0 z-0">
            {/* Background Image of the house/driveway - clean version */}
            <Image
              src="/hero-neaptide.jpg"
              alt="Property background"
              fill
              priority
              unoptimized
              className="object-cover object-center"
            />
          </div>

          {/* Ed — pinned to bottom-left, height capped so head clears the logo */}
          <div className="absolute bottom-0 left-0 w-1/2 hidden lg:block pointer-events-none z-10"
            style={{ height: '78%', maskImage: 'linear-gradient(to right, transparent 0%, black 30%)' }}>
            <Image
              src="/agent_transparent.webp"
              alt={agentName}
              fill
              unoptimized
              className="object-contain object-bottom brightness-100 contrast-95"
            />
          </div>

          {/* Form — centred on right half */}
          <div className="w-full max-w-7xl mx-auto relative z-20 flex flex-col lg:flex-row items-center justify-end h-full pt-16 pb-10">
            <div className="w-full md:w-[540px] lg:w-[600px] shrink-0 my-6 lg:my-0 lg:mr-32">
              <LeadGenForm suburb={suburb} medium={medium} />
            </div>
          </div>
        </div>

        {/* About Ed Scanlan Section */}
        <section className="bg-white py-24 px-4 overflow-hidden">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8 text-center">
              
              {/* Mobile/Tablet Only: Ed's Image */}
              <div className="lg:hidden relative w-48 h-48 mx-auto mb-6 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-xl">
                 <Image
                    src="/agent_transparent.webp"
                    alt={agentName}
                    fill
                    unoptimized
                    className="object-cover scale-[1.3] brightness-110"
                    style={{ objectPosition: 'center -23%' }}
                 />
              </div>

              <div className="space-y-4">
                <h2 className="text-base font-bold text-[#FF4753] tracking-[0.2em] uppercase">The Marketing Advantage</h2>
                <h3 className="text-5xl sm:text-5xl font-black text-[#0f172a] leading-tight">Meet {agentName}</h3>
                <p className="text-2xl text-slate-600 font-medium max-w-2xl mx-auto">
                  A licensed real estate professional with over 20 years of high-level real estate Advertising and Marketing experience.
                </p>
              </div>
              

              <div className="text-lg text-slate-600 space-y-6 max-w-3xl mx-auto leading-relaxed">
                <p>
                  Before transitioning his skills to real estate, {agentName.split(' ')[0]} spent 16 years at the <strong>NZ Herald</strong> and <strong>NZME</strong> in senior marketing and sales leadership roles. This unique background gives him a competitive edge in positioning your property to stand out in a crowded market.
                </p>
                <p>
                  A long-term Hibiscus Coast local of over 17 years, {agentName.split(' ')[0]} combines deep community knowledge with the professional, results-driven approach of Professionals Hibiscus Coast to deliver outcomes that exceed expectations.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 max-w-4xl mx-auto">
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-[#F6F4EF] p-3 rounded-xl">
                    <Award className="w-6 h-6 text-[#FF4753]" />
                  </div>
                  <span className="font-bold text-slate-800 text-base">Branch Manager Qualified</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-[#F6F4EF] p-3 rounded-xl">
                    <Star className="w-6 h-6 text-[#FF4753]" />
                  </div>
                  <span className="font-bold text-slate-800 text-base">5-Star Client Reviews</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-[#F6F4EF] p-3 rounded-xl">
                    <Clock className="w-6 h-6 text-[#FF4753]" />
                  </div>
                  <span className="font-bold text-slate-800 text-base">20+ Years Marketing</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-[#F6F4EF] p-3 rounded-xl">
                    <MapPin className="w-6 h-6 text-[#FF4753]" />
                  </div>
                  <span className="font-bold text-slate-800 text-base">Local Expert (17yrs)</span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <a
                  href={`tel:${agentPhone}`}
                  className="flex items-center gap-3 bg-[#FF4753] hover:brightness-110 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-lg w-full sm:w-auto justify-center"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  Call {agentName.split(' ')[0]} — {agentPhone}
                </a>
                <a
                  href={`mailto:${agentEmail}`}
                  className="flex items-center gap-3 bg-white hover:bg-slate-50 text-[#FF4753] font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-lg border-2 border-[#FF4753] w-full sm:w-auto justify-center"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  Email {agentName.split(' ')[0]}
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* Recent Sales Grid — only shown when there are sales in the database */}
        {sales && sales.filter((s: any) => s.image).length > 0 && (
        <section className="bg-slate-50 py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900">Proven Hibiscus Coast Recent Results</h2>
              <p className="text-slate-500 text-xl max-w-3xl mx-auto font-medium">We leverage smart technology and premium marketing to achieve top dollar for our clients.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sales.filter((s: any) => s.image).map((sale: any, i: number) => (
                <div key={i} className="bg-[#373D40] rounded-2xl overflow-hidden shadow-xl group relative">
                  <div className="relative h-64 w-full overflow-hidden">
                    <Image
                      src={sale.image}
                      alt={sale.address}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* SOLD diagonal band */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div
                        className="absolute bg-[#FF4753] flex items-center justify-center"
                        style={{ width: '220%', height: '80px', top: '2%', left: '-30%', transform: 'rotate(45deg)' }}
                      >
                        <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-source-serif)', fontWeight: 400 }} className="text-white text-4xl tracking-wide">Sold</span>
                      </div>
                    </div>
                    {/* Month tag */}
                    {sale.days && (
                      <div className="absolute top-4 left-4 bg-[#FF4753] px-4 py-1.5 rounded-full shadow-md">
                        <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-source-serif)', fontWeight: 400 }} className="text-sm text-white">
                          {sale.days}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-bold text-lg leading-snug mb-4 text-balance text-white">
                      {sale.address.includes(',') ? (
                        <>
                          {sale.address.substring(0, sale.address.lastIndexOf(','))},{' '}
                          <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-source-serif)', fontWeight: 400, color: '#FF4753' }}>
                            {sale.address.substring(sale.address.lastIndexOf(',') + 1).trim()}
                          </span>
                        </>
                      ) : sale.address}
                    </p>
                    {/* Property features */}
                    {(sale.beds || sale.baths || sale.parking) && (
                      <div className="flex items-center text-white font-bold text-sm">
                        {sale.beds && (
                          <>
                            <span className="flex items-center gap-2">
                              <BedroomIcon className="w-7 h-7 shrink-0 text-white" />{sale.beds}
                            </span>
                            {(sale.baths || sale.parking) && <span className="mx-4 text-[#FF4753] font-light text-lg">|</span>}
                          </>
                        )}
                        {sale.baths && (
                          <>
                            <span className="flex items-center gap-2">
                              <BathroomIcon className="w-7 h-7 shrink-0 text-white" />{sale.baths}
                            </span>
                            {sale.parking && <span className="mx-4 text-[#FF4753] font-light text-lg">|</span>}
                          </>
                        )}
                        {sale.parking && (
                          <span className="flex items-center gap-2">
                            <CarParkIcon className="w-7 h-7 shrink-0 text-white" />{sale.parking}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

      </main>

      <ScrollToTop />

      {/* Footer - CTA Bar */}
      <footer className="w-full mt-auto">
        {/* Main CTA Bar */}
        <div className="bg-[#373D40] py-10 px-8 md:px-16">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">

            {/* Logo + Agency rank */}
            <div className="flex flex-col items-end shrink-0 gap-1">
              <Image
                src="/logo-dark.svg"
                alt="Professionals Hibiscus Coast"
                width={1000}
                height={250}
                className="w-auto h-14 drop-shadow-sm"
              />
              <p className="text-white font-bold text-base leading-tight tracking-wide">Hibiscus Coast</p>
            </div>

            {/* Separator */}
            <div className="h-24 w-px bg-white/30 hidden lg:block shrink-0"></div>

            {/* Value Props */}
            <div className="space-y-2 text-base flex-1 max-w-md text-center lg:text-left">
              <p className="text-white font-bold text-lg">Hibiscus Coast Real Estate Specialists</p>
              <p className="text-white font-medium text-balance">Trusted professionals delivering exceptional results for Hibiscus Coast home owners.</p>
              <p className="text-white font-medium text-balance">Local knowledge. Professional network. Outstanding outcomes.</p>
            </div>

            {/* Separator */}
            <div className="h-24 w-px bg-white/30 hidden lg:block shrink-0"></div>

            {/* Agent Contact + Photo */}
            <div className="flex items-center gap-5 shrink-0">
              <div className="flex flex-col items-start gap-1.5">
                <p className="text-white font-black text-lg">{agentName}</p>
                <a href={`tel:${agentPhone}`} className="text-white font-semibold text-sm hover:text-white/70 transition-all">
                  {agentPhone}
                </a>
                <a href={`mailto:${agentEmail}`} className="text-white font-semibold text-sm hover:text-white/70 transition-all">
                  {agentEmail}
                </a>
                <p className="text-slate-300 text-xs">Meros Group Realty Licenced REAA (2008)</p>
              </div>
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/60 shadow-lg shrink-0 bg-slate-100">
                <Image
                  src="/agent_transparent.webp"
                  alt={agentName}
                  fill
                  unoptimized
                  className="object-cover scale-[1.3] brightness-110"
                  style={{ objectPosition: 'center -23%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="bg-[#FF4753] pt-5 pb-5 px-8 md:px-16">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-white">
            <p className="text-center sm:text-left whitespace-nowrap">&copy; {new Date().getFullYear()} {agentName}</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white/70 transition-colors">Terms of Service</Link>
              <a href="https://www.rea.govt.nz/buyers-and-sellers/read-our-guides/" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">REA Guide</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
