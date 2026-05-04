"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, User, Mail, Phone, Home, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import AddressAutocomplete from "./AddressAutocomplete";
import { supabase } from "@/lib/supabase";

type FormData = {
  address: string;
  timeline: string;
  buyingNext: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  optInMarketing: boolean;
};

const SUBURB_PLACEHOLDER: Record<string, string> = {
  'Orewa':     'e.g. 24 Moana Avenue, Orewa',
  'Millwater': 'e.g. 15 Millwater Parkway, Millwater',
  'Milldale':  'e.g. 8 Argent Lane, Milldale',
  'Red Beach': 'e.g. 42 Red Beach Road, Red Beach',
  'Stanmore Bay':    'e.g. 18 Laurence Street, Stanmore Bay',
  'Whangaparaoa':   'e.g. 5 Hibiscus Coast Highway, Whangaparaoa',
  'Gulf Harbour':   'e.g. 12 Fairway Drive, Gulf Harbour',
  'Hatfields Beach': 'e.g. 9 Hamatana Road, Hatfields Beach',
  'Silverdale':     'e.g. 3 Silverdale Street, Silverdale',
};

const HIBISCUS_COAST_SUBURBS = [
  'orewa', 'red beach', 'stanmore bay', 'manly', 'whangaparaoa',
  'gulf harbour', 'arkles bay', 'tindalls', 'matakatia', 'hobbs bay',
  'hatfields beach', 'waiwera', 'puhoi', 'wainui', 'army bay',
  'silverdale', 'millwater', 'hibiscus coast', 'stillwater',
];

function isHibiscusCoast(address: string): boolean {
  const lower = address.toLowerCase();
  return HIBISCUS_COAST_SUBURBS.some((suburb) => lower.includes(suburb));
}

export default function LeadGenForm({ suburb = '', medium = '', source = '' }: { suburb?: string; medium?: string; source?: string }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (suburb && typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'ViewContent', { content_name: suburb, content_category: 'suburb' });
    }
  }, [suburb]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showAreaWarning, setShowAreaWarning] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    address: "",
    timeline: "",
    buyingNext: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    optInMarketing: false,
  });

  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleAddressNext = (address?: string) => {
    const val = address ?? formData.address;
    if (!val) return;
    
    if (typeof window !== 'undefined') {
      if ((window as any).fbq) {
        (window as any).fbq('track', 'Search', { search_string: val, content_category: 'property_address' });
      }
      if ((window as any).gtag) {
        (window as any).gtag('event', 'search', { search_term: val });
      }
    }

    if (isHibiscusCoast(val)) {
      setShowAreaWarning(false);
      if (typeof window !== 'undefined') {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Contact', { content_name: suburb || 'unknown', content_category: 'appraisal_form' });
        }
        if ((window as any).gtag) {
          (window as any).gtag('event', 'begin_checkout', { 
            coupon: suburb || 'none',
            items: [{ item_name: 'Appraisal Request', item_category: 'form_start' }]
          });
        }
      }
      nextStep();
    } else {
      setShowAreaWarning(true);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    const eventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'SubmitApplication', { content_name: suburb || 'unknown', content_category: 'appraisal_form', eventID: eventId });
    }

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: formData.address,
          timeline: formData.timeline,
          buyingNext: formData.buyingNext,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          optInMarketing: formData.optInMarketing,
          suburb,
          medium,
          ...(source ? { source } : {}),
          eventId,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save lead");
      }

      if (typeof window !== 'undefined') {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Lead', suburb
            ? { content_name: suburb, content_category: 'suburb', eventID: eventId }
            : { eventID: eventId });
          (window as any).fbq('track', 'CompleteRegistration', { content_name: suburb || 'unknown', content_category: 'appraisal_form', eventID: `${eventId}-cr` });
        }

        if ((window as any).gtag) {
          const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
          const gaId = process.env.NEXT_PUBLIC_GA_ID;
          
          // Google Ads conversion
          if (googleAdsId) {
            (window as any).gtag('event', 'generate_lead', { send_to: googleAdsId });
          }
          
          // GA4 event
          if (gaId) {
            (window as any).gtag('event', 'generate_lead', {
              transaction_id: eventId,
              value: 0,
              currency: 'NZD',
              items: [{ item_name: 'Appraisal Request', item_category: 'form_complete', item_variant: suburb || 'unknown' }]
            });
          }
        }
      }

      const linkedinConversionId = process.env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID;
      if (linkedinConversionId && typeof window !== 'undefined' && (window as any).lintrk) {
        (window as any).lintrk('track', { conversion_id: parseInt(linkedinConversionId, 10) });
      }

      setStep(5);
    } catch (error: any) {
      console.error("Submission error:", error);
      setSubmitError(`Error: ${error.message || "There was an issue submitting your request."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  const BRAND_COLOR = "#FF4753";

  return (
    <div className="w-full max-w-xl mx-auto bg-[#373D40] rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Progress Bar */}
      {step < 5 && (
        <div className="w-full h-1.5 bg-white/10">
          <motion.div
            className="h-full bg-[#FF4753]"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="px-6 pt-5 pb-5 sm:px-10 sm:pb-8 sm:pt-8 flex flex-col justify-start sm:justify-center overflow-visible">
        <AnimatePresence mode="wait">
          {/* STEP 1: Address */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3 sm:space-y-5"
            >
              <div className="text-center space-y-2 sm:space-y-3">
                <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
                  {suburb ? (
                    <>What&apos;s your<br />
                      <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#FF4753', fontFamily: 'var(--font-source-serif)' }}>{suburb}</span>
                      {" "}home worth?
                    </>
                  ) : (
                    <>What&apos;s your home worth in<br />
                      <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#FF4753', fontFamily: 'var(--font-source-serif)' }}>today&apos;s market?</span>
                    </>
                  )}
                </h1>
                <p className="text-sm sm:text-base text-white/60 font-medium">
                  Get a free market appraisal. No pressure. Just real, local insight.
                </p>
                <div className="inline-flex items-center bg-[#ECE7DC] px-5 py-2.5 rounded-full" style={{ fontStyle: 'italic', fontFamily: 'var(--font-source-serif)', fontWeight: 400, color: '#FF4753' }}>
                  {suburb ? `Enter your ${suburb} address` : 'Enter your Hibiscus Coast Address'}
                </div>
              </div>

              <div data-analytics-step="1_address">
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(val) => { updateForm("address", val); setShowAreaWarning(false); }}
                  onSelect={handleAddressNext}
                  placeholder={suburb ? SUBURB_PLACEHOLDER[suburb] : undefined}

                />
              </div>

              {showAreaWarning && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-3 sm:p-4 text-sm text-amber-300 space-y-2 sm:space-y-3">
                  <p className="font-bold">This address appears to be outside the Hibiscus Coast area.</p>
                  <p className="text-xs sm:text-sm text-amber-300/80">Ed Scanlan specialises in the Hibiscus Coast. Would you like to continue anyway?</p>
                  <div className="flex gap-3">
                    <button onClick={nextStep} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl transition-all text-sm">
                      Continue Anyway
                    </button>
                    <button onClick={() => setShowAreaWarning(false)} className="flex-1 bg-white/10 border border-white/20 text-white/80 font-bold py-2 rounded-xl transition-all text-sm">
                      Change Address
                    </button>
                  </div>
                </div>
              )}

              {!showAreaWarning && (
                <button
                  onClick={() => handleAddressNext()}
                  disabled={!formData.address}
                  style={{ backgroundColor: formData.address ? BRAND_COLOR : 'rgba(255,255,255,0.12)' }}
                  className="w-full flex items-center justify-center gap-2 text-white py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-bold transition-all shadow-lg hover:brightness-110 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          )}

          {/* STEP 2: Timeline */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3 sm:space-y-6"
            >
              <div className="text-center space-y-1 sm:space-y-3">
                <h2 className="text-xl sm:text-3xl font-black text-white leading-tight text-balance">When are you thinking of selling?</h2>
                <p className="text-white/60 text-sm sm:text-base font-medium">This helps Ed prioritize your report.</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-4" data-analytics-step="2_timeline">
                {["ASAP", "3-6 Months", "6-12 Months", "Just curious"].map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      updateForm("timeline", time);
                      if (typeof window !== 'undefined') {
                        if ((window as any).fbq) {
                          (window as any).fbq('track', 'Schedule', { content_name: time, content_category: 'appraisal_timeline', suburb: suburb || 'unknown' });
                          (window as any).fbq('trackCustom', 'FormStep', { step_name: 'selling_timeline', value: time, suburb: suburb || 'unknown' });
                        }
                        if ((window as any).gtag) {
                          (window as any).gtag('event', 'select_content', {
                            content_type: 'selling_timeline',
                            item_id: time
                          });
                        }
                      }
                      nextStep();
                    }}
                    className={`p-3 sm:p-4 border-2 rounded-2xl text-sm sm:text-lg font-bold transition-all ${
                      formData.timeline === time
                        ? "border-[#FF4753] bg-[#FF4753]/15 text-white"
                        : "border-white/20 bg-white/5 text-white/80 hover:border-[#FF4753] hover:bg-white/10"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <button onClick={prevStep} className="text-white/40 hover:text-white/70 font-bold text-sm mx-auto block pt-1">
                Back
              </button>
            </motion.div>
          )}

          {/* STEP 3: Buying Next */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3 sm:space-y-6"
            >
              <div className="text-center space-y-1 sm:space-y-3">
                <h2 className="text-xl sm:text-3xl font-black text-white leading-tight text-balance">Buying after you sell?</h2>
                <p className="text-white/60 text-sm sm:text-base font-medium">Ed can help source your next home off-market.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-4" data-analytics-step="3_buying_next">
                {["Yes, I need to buy", "No, just selling for now"].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      updateForm("buyingNext", option);
                      if (typeof window !== 'undefined') {
                        if ((window as any).fbq) {
                          (window as any).fbq('trackCustom', 'FormStep', { step_name: 'buying_intent', value: option, suburb: suburb || 'unknown' });
                        }
                        if ((window as any).gtag) {
                          (window as any).gtag('event', 'select_content', {
                            content_type: 'buying_intent',
                            item_id: option
                          });
                        }
                      }
                      nextStep();
                    }}
                    className={`p-3 sm:p-4 border-2 rounded-2xl text-sm sm:text-lg font-bold transition-all flex items-center gap-3 sm:gap-4 ${
                      formData.buyingNext === option
                        ? "border-[#FF4753] bg-[#FF4753]/15 text-white"
                        : "border-white/20 bg-white/5 text-white/80 hover:border-[#FF4753] hover:bg-white/10"
                    }`}
                  >
                    <Home className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${formData.buyingNext === option ? "text-[#FF4753]" : "text-white/30"}`} />
                    {option}
                  </button>
                ))}
              </div>
              <button onClick={prevStep} className="text-white/40 hover:text-white/70 font-bold text-sm mx-auto block pt-1">
                Back
              </button>
            </motion.div>
          )}

          {/* STEP 4: Contact Details */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="text-center space-y-1 mb-4 sm:space-y-3 sm:mb-6">
                <h2 className="text-xl sm:text-3xl font-black text-white leading-tight text-balance">Send My Custom Report</h2>
                <p className="text-white/60 text-sm sm:text-base font-medium text-balance">Ed will prepare your appraisal personally.</p>
              </div>

              <form onSubmit={submitForm} className="space-y-2.5 sm:space-y-4" data-analytics-step="4_submit">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-white/70 mb-1 ml-1">First Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-white/40" />
                      </div>
                      <input
                        required
                        type="text"
                        className="w-full pl-10 sm:pl-12 pr-3 py-2.5 sm:py-3.5 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-[#FF4753] focus:border-[#FF4753] text-white font-bold outline-none transition-all text-sm sm:text-base placeholder:text-white/30"
                        value={formData.firstName}
                        onChange={(e) => updateForm("firstName", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-white/70 mb-1 ml-1">Last Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-[#FF4753] focus:border-[#FF4753] text-white font-bold outline-none transition-all text-sm sm:text-base placeholder:text-white/30"
                      value={formData.lastName}
                      onChange={(e) => updateForm("lastName", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-white/70 mb-1 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-white/40" />
                    </div>
                    <input
                      required
                      type="email"
                      className="w-full pl-10 sm:pl-12 pr-3 py-2.5 sm:py-3.5 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-[#FF4753] focus:border-[#FF4753] text-white font-bold outline-none transition-all text-sm sm:text-base placeholder:text-white/30"
                      value={formData.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-white/70 mb-1 ml-1">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-white/40" />
                    </div>
                    <input
                      required
                      type="tel"
                      className="w-full pl-10 sm:pl-12 pr-3 py-2.5 sm:py-3.5 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-[#FF4753] focus:border-[#FF4753] text-white font-bold outline-none transition-all text-sm sm:text-base placeholder:text-white/30"
                      value={formData.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl" style={{ background: '#ECE7DC' }}>
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF4753] shrink-0 mt-0.5" />
                  <p className="leading-snug text-xs" style={{ fontStyle: 'italic', fontFamily: 'var(--font-source-serif)', fontWeight: 400, color: '#FF4753' }}>
                    Licensed REAA 2008. Your information is protected under the NZ Privacy Act 2020.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 hover:border-[#FF4753]/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.optInMarketing}
                    onChange={(e) => {
                      updateForm("optInMarketing", e.target.checked);
                      if (e.target.checked && typeof window !== 'undefined' && (window as any).fbq) {
                        (window as any).fbq('track', 'Subscribe', { content_name: "Ed's Quarterly Market Update", content_category: 'newsletter' });
                      }
                    }}
                    className="mt-1 w-5 h-5 shrink-0 accent-[#FF4753] cursor-pointer"
                  />
                  <span className="text-sm text-white/70 leading-snug group-hover:text-white/90 transition-colors">
                    <span className="text-white font-bold">Tick</span> to receive Ed&apos;s Quarterly report on local property sales and to keep me informed about the Hibiscus Coast market. You can unsubscribe any time.
                  </span>
                </label>

                {submitError && (
                  <p className="text-red-400 text-sm font-bold text-center">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: BRAND_COLOR }}
                  className="w-full text-white py-3 sm:py-5 rounded-2xl text-base sm:text-xl font-black hover:brightness-110 transition-all shadow-lg shadow-[#FF4753]/20 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin"/> Processing...</>
                  ) : (
                    "Get My Appraisal"
                  )}
                </button>

                <button type="button" onClick={prevStep} disabled={isSubmitting} className="text-white/40 hover:text-white/70 font-bold text-sm mx-auto block pt-1">
                  Back
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 5: Success */}
          {step === 5 && (
            <motion.div
              key="step5"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              className="text-center space-y-3 sm:space-y-6 py-4 sm:py-10"
            >
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 sm:w-12 sm:h-12 text-[#FF4753]" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Got it, {formData.firstName}!</h2>
              <div className="space-y-3 sm:space-y-4">
                <p className="text-white/70 text-base sm:text-xl font-medium leading-relaxed">
                  Ed Scanlan is preparing your professional appraisal for: <br/>
                  <span className="text-white font-black">
                    {formData.address.includes(',') ? formData.address.substring(0, formData.address.lastIndexOf(',')).replace(/\s*\d{4}\s*$/, '') : formData.address}
                    {formData.address.includes(',') && (
                      <>, <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-source-serif)', fontWeight: 400, color: '#FF4753' }}>
                        {formData.address.substring(formData.address.lastIndexOf(',') + 1).replace(/\s*\d{4}\s*$/, '').trim()}
                      </span></>
                    )}
                  </span>
                </p>
                <p className="p-3 sm:p-6 rounded-xl sm:rounded-2xl text-sm sm:text-base leading-relaxed" style={{ background: '#ECE7DC', fontStyle: 'italic', fontFamily: 'var(--font-source-serif)', fontWeight: 400, color: '#FF4753' }}>
                  A copy of the digital report will be sent to your email, and Ed will be in touch shortly to discuss the data with you.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
