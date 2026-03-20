"use client" 

import * as React from "react"
import { Scale } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SignIn1 = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
 
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
 
  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      // Success - Redirect to vanilla dashboard
      const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:8002/dashboard.html";
      window.location.href = dashboardUrl;
    }
  };

  const handleGoogleSignIn = async () => {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:8002/dashboard.html",
      },
    });
    if (authError) alert(authError.message);
  };
 
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden w-full">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#818cf8]/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-gradient-to-b from-white/10 to-transparent backdrop-blur-md border border-white/10 shadow-2xl p-8 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#818cf8]/20 mb-6 shadow-lg shadow-[#818cf8]/20 border border-[#818cf8]/30">
          <Scale className="w-6 h-6 text-[#818cf8]" />
        </div>
        {/* Title */}
        <h2 className="text-2xl font-bold tracking-tight text-white mb-6 text-center">
          Nyay<span className="text-[#f59e0b]">AI</span>
        </h2>
        {/* Form */}
        <div className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Email"
              type="email"
              value={email}
              className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50 transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <div className="text-sm text-red-400 text-left">{error}</div>
            )}
          </div>
          <hr className="opacity-10" />
          <div>
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full bg-[#818cf8] text-white font-semibold px-5 py-3 rounded-full shadow-lg shadow-[#818cf8]/25 hover:bg-[#818cf8]/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-3 text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
            {/* Google Sign In */}
            <button 
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-3 font-medium text-white shadow hover:bg-white/10 transition-all mb-2 text-sm"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>
            <div className="w-full text-center mt-2">
              <span className="text-xs text-gray-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="underline text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors"
                >
                  Sign up, it&apos;s free!
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* User count and avatars */}
      <div className="relative z-10 mt-12 flex flex-col items-center text-center">
        <p className="text-gray-400 text-sm mb-2">
          Join <span className="font-medium text-white">justice advocates</span> auditing AI for a fairer future.
        </p>
        <div className="flex">
          <img
            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover -ml-2"
          />
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover -ml-2"
          />
          <img
            src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-black object-cover -ml-2"
          />
        </div>
      </div>
    </div>
  );
};
 
export { SignIn1 };
