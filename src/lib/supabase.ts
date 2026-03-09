import { createClient } from "@supabase/supabase-js";

// Uses placeholder values if environment variables are not set during development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.1234567890abcdef";

if (supabaseUrl === "https://placeholder-project.supabase.co") {
  console.warn("⚠️ Using placeholder Supabase URL. Make sure NEXT_PUBLIC_SUPABASE_URL is set in your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
