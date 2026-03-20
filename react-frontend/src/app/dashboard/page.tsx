"use client";

import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  LogOut,
  AlertTriangle,
  BarChart2,
  Database,
  ArrowUpRight,
  Shield,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// ── Nav links matching dashboard.html ──────────────────
const LINKS = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0 text-indigo-400" />,
  },
  {
    label: "New Audit",
    href: "http://localhost:8002/upload.html",
    icon: <Upload className="h-5 w-5 flex-shrink-0 text-indigo-400" />,
  },
  {
    label: "Learn Hub",
    href: "http://localhost:8002/learn.html",
    icon: <BookOpen className="h-5 w-5 flex-shrink-0 text-indigo-400" />,
  },
];

// ── Mock audit rows (matches dashboard.js structure) ───
const MOCK_AUDITS = [
  { id: "demo_audit_726", name: "hiring_data_2024.csv", date: "20 Mar 2026", column: "hired", status: "HIGH", score: 78 },
  { id: "demo_audit_349", name: "loan_approvals.csv",   date: "19 Mar 2026", column: "approved", status: "MODERATE", score: 45 },
  { id: "demo_audit_102", name: "admissions_2023.csv",  date: "17 Mar 2026", column: "admitted", status: "LOW", score: 18 },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    HIGH: "bg-red-500/10 text-red-400 border-red-500/30",
    CRITICAL: "bg-red-500/10 text-red-400 border-red-500/30",
    MODERATE: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border border-transparent uppercase tracking-wide", styles[status] ?? styles.LOW)}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-indigo-500/40 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border", accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-3xl font-extrabold text-white leading-none mb-1">{value}</p>
        <p className="text-sm font-medium text-white/60">{label}</p>
      </div>
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{sub}</p>
    </motion.div>
  );
}

// ── Logo components ──────────────────────────────────
function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 py-1 relative z-20">
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <Shield className="w-4 h-4 text-white" />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold text-base whitespace-pre"
      >
        <span className="text-indigo-400">Nyay</span>
        <span className="text-amber-400">AI</span>
      </motion.span>
    </Link>
  );
}

function LogoIcon() {
  return (
    <Link href="/dashboard" className="flex items-center py-1 relative z-20">
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <Shield className="w-4 h-4 text-white" />
      </div>
    </Link>
  );
}

// ── Main Dashboard Page ──────────────────────────────
export default function DashboardPage() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-black w-full overflow-hidden",
        "h-screen"
      )}
    >
      {/* ── Sidebar ── */}
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            {open ? <Logo /> : <LogoIcon />}

            {/* Nav links */}
            <div className="mt-8 flex flex-col gap-1">
              {LINKS.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>

          {/* Bottom — user + logout */}
          <div className="flex flex-col gap-1">
            <div className={cn(
              "flex items-center gap-3 py-2.5 px-2 rounded-lg",
              "border border-white/10 bg-white/[0.03]",
              open ? "opacity-100" : ""
            )}>
              {/* Avatar initials */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                NA
              </div>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col min-w-0"
                  >
                    <span className="text-sm font-semibold text-white truncate">NyayAI User</span>
                    <span className="text-xs text-white/40 truncate">Acme Corp</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <SidebarLink
              link={{
                label: "Logout",
                href: "http://localhost:8002/login.html",
                icon: <LogOut className="h-5 w-5 flex-shrink-0 text-red-400" />,
              }}
              className="hover:bg-red-500/10 text-red-400"
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Overview</h1>
            <p className="text-sm text-white/40 mt-0.5">Welcome back — here's your bias audit summary</p>
          </div>
          <Link
            href="http://localhost:8002/upload.html"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-amber-500/25"
          >
            <Upload className="w-4 h-4" />
            New Audit
          </Link>
        </div>

        <div className="p-6 md:p-8 w-full">

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <StatCard
              label="Total Audits"
              value={MOCK_AUDITS.length}
              sub="Lifetime"
              icon={BarChart2}
              accent="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              delay={0.05}
            />
            <StatCard
              label="Critical Bias Flags"
              value={MOCK_AUDITS.filter(a => a.status === "HIGH" || a.status === "CRITICAL").length}
              sub="Needs Attention"
              icon={AlertTriangle}
              accent="bg-red-500/10 text-red-400 border-red-500/20"
              delay={0.1}
            />
            <StatCard
              label="Unique Datasets"
              value={MOCK_AUDITS.length}
              sub="Analyzed by NyayAI"
              icon={Database}
              accent="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              delay={0.15}
            />
          </div>

          {/* Recent Audits Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden"
          >
            {/* Table header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h2 className="font-bold text-white text-base">Recent Audits</h2>
              <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Dataset</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Outcome Column</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Bias Level</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_AUDITS.map((audit, i) => (
                    <motion.tr
                      key={audit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.07 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <Database className="w-4 h-4 text-indigo-400" />
                          </div>
                          <span className="text-sm font-medium text-white">{audit.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/50">{audit.date}</td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-md font-mono">{audit.column}</code>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={audit.status} />
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`http://localhost:8002/report.html?audit_id=${audit.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          View Report <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {MOCK_AUDITS.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-white/30">
                  <Database className="w-10 h-10 mb-3" />
                  <p className="text-sm">No audits yet. Upload a dataset to get started.</p>
                  <Link href="http://localhost:8002/upload.html" className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                    Start Audit <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick action cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Link
              href="http://localhost:8002/upload.html"
              className="group flex items-center gap-4 bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Upload className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">Upload New Dataset</p>
                <p className="text-xs text-white/40 mt-0.5">Audit a CSV for hidden bias</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors" />
            </Link>

            <Link
              href="http://localhost:8002/learn.html"
              className="group flex items-center gap-4 bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                <BookOpen className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">Learn About Bias</p>
                <p className="text-xs text-white/40 mt-0.5">Free resources — no ML expertise needed</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
            </Link>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
