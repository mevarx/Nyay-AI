"use client" 

import * as React from "react"
import { Scale, User, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SignUp1 = () => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
 
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
 
  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      // Success - Redirect to dashboard (or show verification check)
      alert("Registration successful! Please check your email for verification.");
      const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:8002/dashboard.html";
      window.location.href = dashboardUrl;
    }
  };

  const handleGoogleSignUp = async () => {
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
          Create <span className="text-[#f59e0b]">Account</span>
        </h2>
        
        {/* Form */}
        <div className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
             <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Full Name"
                  type="text"
                  value={name}
                  className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50 transition-all"
                  onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Email"
                  type="email"
                  value={email}
                  className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50 transition-all"
                  onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Password"
                  type="password"
                  value={password}
                  className="w-full pl-12 pr-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50 transition-all"
                  onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            {error && (
              <div className="text-sm text-red-400 text-left">{error}</div>
            )}
          </div>
          <hr className="opacity-10" />
          <div>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-[#818cf8] text-white font-semibold px-5 py-3 rounded-full shadow-lg shadow-[#818cf8]/25 hover:bg-[#818cf8]/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-3 text-sm"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
            {/* Google Sign In */}
            <button 
              onClick={handleGoogleSignUp}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-3 font-medium text-white shadow hover:bg-white/10 transition-all mb-2 text-sm"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Sign up with Google
            </button>
            <div className="w-full text-center mt-2">
              <span className="text-xs text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/"
                  className="underline text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors"
                >
                  Sign in
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 mt-12 flex flex-col items-center text-center">
        <p className="text-gray-400 text-sm mb-2">
          Start auditing AI bias with <span className="font-medium text-white">NyayAI</span> today.
        </p>
      </div>
    </div>
  );
};
 
export { SignUp1 };
