"use client";

import { useState } from "react";
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
};

export default function LeadGenForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  const [formData, setFormData] = useState<FormData>({
    address: "",
    timeline: "",
    buyingNext: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const { error } = await supabase.from('appraisal_leads').insert([{
        address: formData.address,
        timeline: formData.timeline,
        buying_next: formData.buyingNext,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        source: 'website'
      }]);

      if (error) {
        console.error("Supabase insert error details:", error);
        throw new Error(error.message || "Failed to save to database");
      }
      
      // Fire Meta Pixel 'Lead' event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead');
      }

      // Fire LinkedIn Conversion event
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

  const BRAND_COLOR = "#20C888";
  const BRAND_COLOR_HOVER = "#1bb379";
  const BRAND_LIGHT = "#e9faf3";

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
      {/* Progress Bar */}
      {step < 5 && (
        <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
          <motion.div
            className="h-full bg-[#20C888]"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="p-8 sm:p-12 min-h-[450px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: Address */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Property Appraisal</h2>
                <p className="text-slate-500 text-lg font-medium">Enter your Hibiscus Coast address</p>
              </div>

              <div className="mt-8">
                <AddressAutocomplete 
                  value={formData.address}
                  onChange={(val) => updateForm("address", val)}
                  onSelect={nextStep}
                />
              </div>

              <button
                onClick={nextStep}
                disabled={!formData.address}
                style={{ backgroundColor: formData.address ? BRAND_COLOR : '#cbd5e1' }}
                className="w-full mt-6 flex items-center justify-center gap-2 text-white py-4 rounded-2xl text-lg font-bold transition-all shadow-lg hover:brightness-110 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
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
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-black text-slate-900 leading-tight text-balance">When are you thinking of selling?</h2>
                <p className="text-slate-500 font-medium">This helps Ed prioritize your report.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {["ASAP", "3-6 Months", "6-12 Months", "Just curious"].map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      updateForm("timeline", time);
                      nextStep();
                    }}
                    className={`p-4 border-2 rounded-2xl text-lg font-bold transition-all ${
                      formData.timeline === time
                        ? "border-[#20C888] bg-[#e9faf3] text-[#20C888]"
                        : "border-slate-100 hover:border-[#20C888] text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <button onClick={prevStep} className="text-slate-400 hover:text-slate-600 font-bold text-sm mx-auto block mt-6">
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
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Buying after you sell?</h2>
                <p className="text-slate-500 font-medium">Ed can help source your next home off-market.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-8">
                {["Yes, I need to buy", "No, just selling for now"].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      updateForm("buyingNext", option);
                      nextStep();
                    }}
                    className={`p-4 border-2 rounded-2xl text-lg font-bold transition-all flex items-center gap-4 ${
                      formData.buyingNext === option
                        ? "border-[#20C888] bg-[#e9faf3] text-[#20C888]"
                        : "border-slate-100 hover:border-[#20C888] text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Home className={`w-6 h-6 ${formData.buyingNext === option ? "text-[#20C888]" : "text-slate-300"}`} />
                    {option}
                  </button>
                ))}
              </div>
              <button onClick={prevStep} className="text-slate-400 hover:text-slate-600 font-bold text-sm mx-auto block mt-6">
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
              <div className="text-center space-y-3 mb-8">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Send My Custom Report</h2>
                <p className="text-slate-500 font-medium text-balance">Ed will prepare your appraisal personally.</p>
              </div>

              <form onSubmit={submitForm} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-300" />
                      </div>
                      <input
                        required
                        type="text"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#20C888] focus:border-[#20C888] text-slate-900 font-medium outline-none transition-all"
                        value={formData.firstName}
                        onChange={(e) => updateForm("firstName", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Last Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#20C888] focus:border-[#20C888] text-slate-900 font-medium outline-none transition-all"
                      value={formData.lastName}
                      onChange={(e) => updateForm("lastName", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-300" />
                    </div>
                    <input
                      required
                      type="email"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#20C888] focus:border-[#20C888] text-slate-900 font-medium outline-none transition-all"
                      value={formData.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-300" />
                    </div>
                    <input
                      required
                      type="tel"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#20C888] focus:border-[#20C888] text-slate-900 font-medium outline-none transition-all"
                      value={formData.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs text-slate-400 mt-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-[#20C888] shrink-0" />
                  <p className="leading-relaxed">
                    Licensed REAA 2008. Your information is protected under the NZ Privacy Act 2020 and used only for your appraisal.
                  </p>
                </div>
                
                {submitError && (
                  <p className="text-red-500 text-sm font-bold text-center">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: BRAND_COLOR }}
                  className="w-full mt-6 text-white py-5 rounded-2xl text-xl font-black hover:brightness-110 transition-all shadow-xl shadow-[#20C888]/20 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-6 h-6 animate-spin"/> Processing...</>
                  ) : (
                    "Get My Appraisal"
                  )}
                </button>
                
                <button type="button" onClick={prevStep} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 font-bold text-sm mx-auto block mt-6">
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
              className="text-center space-y-6 py-10"
            >
              <div className="w-24 h-24 bg-[#e9faf3] rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <CheckCircle2 className="w-12 h-12 text-[#20C888]" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Got it, {formData.firstName}!</h2>
              <div className="space-y-4">
                <p className="text-slate-600 text-xl font-medium leading-relaxed">
                  Ed Scanlan is preparing your professional appraisal for: <br/>
                  <span className="text-slate-900 font-black italic">{formData.address}</span>.
                </p>
                <p className="text-slate-500 bg-slate-50 p-6 rounded-2xl text-base border border-slate-100 font-medium leading-relaxed">
                  A copy of the digital report will be sent to your email, and Ed will be in touch shortly to discuss the data with you.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Social Proof Footer */}
      {step < 5 && (
        <div className="bg-slate-900 p-6 text-center">
          <div className="text-sm font-bold text-white flex items-center justify-center gap-3">
            <div>
              <span className="text-[#20C888]">Arizto</span> - Hibiscus Coast&apos;s Smart Real Estate Choice
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
