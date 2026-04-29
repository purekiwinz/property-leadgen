import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
        <Link href="/" className="inline-flex items-center text-[#FF4753] font-bold hover:brightness-110 transition-all gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Privacy Policy</h1>
        
        <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
          <p>
            We collect personal information from you, including information about your:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name</li>
            <li>Contact information (email address and phone number)</li>
            <li>Location/Property Address</li>
            <li>Intentions regarding property sale or purchase</li>
            <li>Interactions with our website and advertisements (via tracking pixels)</li>
          </ul>

          <p>
            We collect your personal information directly from you when you fill out our appraisal forms, as well as via third-party advertising platforms (such as Facebook Lead Ads) when you submit your details through our advertisements.
          </p>

          <p>
            We collect your personal information in order to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide you with an accurate, custom property appraisal</li>
            <li>Contact you regarding your property and real estate needs</li>
            <li>Assist you with buying or selling property</li>
            <li>Measure the effectiveness of our advertising campaigns</li>
          </ul>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Cookies and Tracking Technologies</h2>
          <p>
            We use third-party tracking technologies, including the Meta (Facebook) Pixel and LinkedIn Insight Tag, to understand how visitors interact with our website and to measure the performance of our advertising. These tools may use cookies, web beacons, and other storage technologies to collect or receive information from our website and elsewhere on the internet and use that information to provide measurement services and target ads. You can opt-out of the collection and use of information for ad targeting by visiting the privacy settings of your respective social media accounts or via services like YourOnlineChoices.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Your Rights</h2>
          <p>
            Providing some information is optional. If you choose not to enter your property address or contact details, we&apos;ll be unable to provide a customised appraisal or contact you with the report.
          </p>

          <p>
            We keep your information safe by storing it in secure cloud databases and only allowing authorized real estate personnel (Ed Scanlan and the Professionals Hibiscus team) to access it for the purposes of providing real estate services to you.
          </p>

          <p>
            You have the right to ask for a copy of any personal information we hold about you, and to ask for it to be corrected if you think it is wrong. If you&apos;d like to ask for a copy of your information, or to have it corrected, please contact us at <strong>ed.scanlan@meros.co.nz</strong>, or <strong>021 814 578</strong>.
          </p>

          <p className="text-sm mt-8 pt-8 border-t border-slate-100 text-slate-500">
            This policy complies with the New Zealand Privacy Act 2020.
            <br />
            Last updated: {new Date().toLocaleDateString('en-NZ')}
          </p>
        </div>
      </div>
    </div>
  );
}
