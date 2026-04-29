import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
        <Link href="/" className="inline-flex items-center text-[#FF4753] font-bold hover:brightness-110 transition-all gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Terms of Service</h1>
        
        <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. General Overview</h2>
          <p>
            By using this website and submitting your information for a property appraisal, you agree to these Terms of Service. These terms apply to the use of this landing page and the services provided by Ed Scanlan as a licensed real estate salesperson under Professionals Hibiscus.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Nature of the Appraisal</h2>
          <p>
            The appraisal provided is an estimate of your property&apos;s current market value based on recent sales data, market trends, and our professional opinion as licensed real estate agents. 
          </p>
          <p className="p-4 bg-orange-50 text-orange-800 rounded-xl border border-orange-100">
            <strong>Important:</strong> A real estate appraisal is not a formal registered valuation. For financing, lending, or legal purposes, you should obtain a formal valuation from a Registered Valuer.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Data Collection and Usage</h2>
          <p>
            By submitting the form (either on our website or via a third-party platform like Facebook), you consent to Ed Scanlan (Professionals Hibiscus) contacting you via phone or email regarding your property appraisal and future real estate services. Your data will be handled in accordance with our <Link href="/privacy" className="text-[#FF4753] underline hover:brightness-110">Privacy Policy</Link> and the New Zealand Privacy Act 2020.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Third-Party Platforms & Advertising</h2>
          <p>
            We use third-party platforms such as Meta (Facebook) and LinkedIn for advertising and lead generation. When you interact with our advertisements or submit information via lead forms hosted on these platforms, your data is subject to both our Privacy Policy and the respective privacy policies and terms of those platforms. We also utilise tracking pixels and tags to measure advertising effectiveness and optimise our marketing efforts.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. No Obligation</h2>
          <p>
            Requesting a property appraisal through this website or our advertisements places you under no obligation to list or sell your property with Ed Scanlan or Professionals Hibiscus. The appraisal is provided as a free, no-obligation service.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Professional Licensing</h2>
          <p>
            Ed Scanlan operates as a licensed real estate salesperson under the Real Estate Agents Act (REAA) 2008. All real estate activities are governed by the rules and regulations set out by the Real Estate Authority (REA).
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Contact Information</h2>
          <p>
            If you have any questions regarding these terms, please contact:
            <br />
            <strong>Ed Scanlan</strong>
            <br />
            Email: ed.scanlan@meros.co.nz
            <br />
            Phone: 021 814 578
          </p>
        </div>
      </div>
    </div>
  );
}
