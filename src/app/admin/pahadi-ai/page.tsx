"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Shield,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Sliders,
  DollarSign,
  Activity,
  CreditCard,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Copy,
  Layers,
  BarChart3,
  Bot
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

type TabKey = "overview" | "cases" | "activity" | "analytics" | "controls" | "lab";

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  OPEN: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  IN_RECOVERY: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  RECOVERED: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  LOST: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  DISMISSED: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" }
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  RETRY_PAYMENT: { bg: "bg-[#C8A951]/20", text: "text-[#C8A951]" },
  SEND_REMINDER: { bg: "bg-purple-500/20", text: "text-purple-300" },
  NO_ACTION: { bg: "bg-zinc-500/20", text: "text-zinc-400" }
};

export default function PahadiAIDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Overview Data
  const [overview, setOverview] = useState<any>(null);

  // Cases Data
  const [cases, setCases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Selected Case for Modal
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseData, setSelectedCaseData] = useState<any>(null);
  const [caseModalLoading, setCaseModalLoading] = useState(false);
  const [analyzingCase, setAnalyzingCase] = useState(false);

  // Activity Stream Data
  const [activity, setActivity] = useState<any[]>([]);

  // Policy Settings Data
  const [policySettings, setPolicySettings] = useState({
    automaticRecoveryEnabled: true,
    maxRetryAttempts: 2,
    maxAutomaticRecoveryAmount: 10000,
    minRecoveryProbabilityThreshold: 0.10
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Demo Lab State
  const [demoRunning, setDemoRunning] = useState<string | null>(null);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch all primary dashboard data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [overviewRes, casesRes, activityRes, settingsRes] = await Promise.all([
        fetch("/api/admin/pahadi-ai/overview").then((r) => r.json()),
        fetch("/api/admin/pahadi-ai/cases").then((r) => r.json()),
        fetch("/api/admin/pahadi-ai/activity").then((r) => r.json()),
        fetch("/api/admin/pahadi-ai/settings").then((r) => r.json())
      ]);

      if (overviewRes.success) setOverview(overviewRes);
      if (casesRes.success) setCases(casesRes.cases || []);
      if (activityRes.success) setActivity(activityRes.actions || []);
      if (settingsRes.success && settingsRes.policy) setPolicySettings(settingsRes.policy);
    } catch (err) {
      console.error("Failed to load Pahadi AI dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time polling interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Load single case details when modal opens
  const openCaseDetails = async (id: string) => {
    setSelectedCaseId(id);
    setCaseModalLoading(true);
    try {
      const res = await fetch(`/api/admin/pahadi-ai/cases/${id}`).then((r) => r.json());
      if (res.success) {
        setSelectedCaseData(res);
      }
    } catch (err) {
      console.error("Failed to load case details:", err);
    } finally {
      setCaseModalLoading(false);
    }
  };

  // Run on-demand agent analysis on current case
  const runAgentAnalysis = async (id: string) => {
    setAnalyzingCase(true);
    try {
      const res = await fetch(`/api/admin/pahadi-ai/cases/${id}`, { method: "POST" }).then((r) => r.json());
      if (res.success) {
        await openCaseDetails(id);
        await fetchData(true);
      }
    } catch (err) {
      console.error("Analysis execution failed:", err);
    } finally {
      setAnalyzingCase(false);
    }
  };

  // Save Policy Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch("/api/admin/pahadi-ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policySettings)
      }).then((r) => r.json());

      if (res.success) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3500);
        await fetchData(true);
      }
    } catch (err) {
      console.error("Failed to update policy settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Execute Demo Scenario in AI Recovery Lab
  const triggerDemoScenario = async (scenario: string) => {
    setDemoRunning(scenario);
    setDemoResult(null);
    try {
      const res = await fetch("/api/admin/pahadi-ai/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      }).then((r) => r.json());

      setDemoResult(res);
      await fetchData(true);
    } catch (err) {
      console.error("Demo scenario execution failed:", err);
    } finally {
      setDemoRunning(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered cases for cases table
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      searchQuery === "" ||
      (c.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customer_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.order_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.case_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || c.recovery_status === statusFilter;
    const matchesAction = actionFilter === "ALL" || c.recommendedAction === actionFilter;

    return matchesSearch && matchesStatus && matchesAction;
  });

  const kpis = overview?.kpis || {
    revenueAtRisk: 0,
    revenueRecovered: 0,
    recoveryRate: 0,
    caseRecoveryRate: 0,
    activeCasesCount: 0,
    totalCasesCount: 0
  };

  const chartData = overview?.dailyTrend || [];

  const statusPieData = [
    { name: "Recovered", value: overview?.statusCounts?.RECOVERED || 0, color: "#10B981" },
    { name: "In Recovery", value: overview?.statusCounts?.IN_RECOVERY || 0, color: "#3B82F6" },
    { name: "Open", value: overview?.statusCounts?.OPEN || 0, color: "#F59E0B" },
    { name: "Lost", value: overview?.statusCounts?.LOST || 0, color: "#EF4444" },
    { name: "Dismissed", value: overview?.statusCounts?.DISMISSED || 0, color: "#71717A" }
  ].filter((d) => d.value > 0);

  const actionPieData = [
    { name: "Retry Payment", value: overview?.actionCounts?.RETRY_PAYMENT || 0, color: "#C8A951" },
    { name: "Send Reminder", value: overview?.actionCounts?.SEND_REMINDER || 0, color: "#A855F7" },
    { name: "No Action", value: overview?.actionCounts?.NO_ACTION || 0, color: "#71717A" }
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[#C8A951]/20 border-t-[#C8A951] animate-spin" />
          <Brain className="w-6 h-6 text-[#C8A951] absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-xs uppercase tracking-widest text-white/60 font-medium">
          Initializing Pahadi AI Console...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* ------------------------------------------------------------- */}
      {/* HEADER: Brand, Status, & Quick Actions */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1B1B1B] via-[#1B1B1B]/90 to-[#171717] border border-[#C8A951]/20 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-[#C8A951]/10 border border-[#C8A951]/30 text-[#C8A951]">
            <Brain className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase font-heading">
                Pahadi AI
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-xs text-[#F5F5F5]/60 mt-1">
              Autonomous Revenue Recovery & Drop-off Prevention Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-white/5 text-white/50 border-white/10"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {autoRefresh ? "Live Stream (8s)" : "Stream Paused"}
          </button>

          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#C8A951]" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setActiveTab("lab")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#C8A951] to-[#DFBE65] text-black shadow-lg shadow-[#C8A951]/20 hover:brightness-110 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            AI Recovery Lab
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION TABS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#1B1B1B] border border-white/5 overflow-x-auto">
        {[
          { key: "overview", label: "Overview & KPIs", icon: BarChart3 },
          { key: "cases", label: `Recovery Cases (${cases.length})`, icon: Layers },
          { key: "activity", label: "Live Agent Stream", icon: Activity },
          { key: "analytics", label: "Revenue Analytics", icon: TrendingUp },
          { key: "controls", label: "Agent Policy Controls", icon: Sliders },
          { key: "lab", label: "AI Recovery Lab (Demo)", icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium tracking-wide uppercase transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-[#C8A951]/20 text-[#C8A951] border border-[#C8A951]/30 font-semibold"
                  : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#C8A951]" : "text-white/40"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================= */}
      {/* TAB 1: OVERVIEW & KPIS */}
      {/* ============================================================= */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Revenue at Risk */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
                <span>Revenue at Risk</span>
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  ₹{kpis.revenueAtRisk.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-white/50 mt-1">
                  Active in {kpis.activeCasesCount} open & recovering order(s)
                </p>
              </div>
            </div>

            {/* Card 2: Revenue Recovered */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
                <span>Revenue Recovered</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-tight">
                  ₹{kpis.revenueRecovered.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-emerald-400/80 mt-1">
                  Verified via cryptographic webhooks
                </p>
              </div>
            </div>

            {/* Card 3: Recovery Rate */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-[#C8A951]/30 transition-all">
              <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
                <span>Recovery Rate</span>
                <span className="p-2 rounded-lg bg-[#C8A951]/10 text-[#C8A951]">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl md:text-3xl font-bold text-[#C8A951] tracking-tight">
                  {kpis.recoveryRate}%
                </div>
                <p className="text-xs text-white/50 mt-1">
                  Financial conversion rate ({kpis.caseRecoveryRate}% case rate)
                </p>
              </div>
            </div>

            {/* Card 4: Active Cases */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
                <span>Active Cases</span>
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Bot className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {kpis.activeCasesCount}
                  <span className="text-xs font-normal text-white/40 ml-2">/ {kpis.totalCasesCount} total</span>
                </div>
                <p className="text-xs text-blue-400 mt-1">
                  Monitored by autonomous brain
                </p>
              </div>
            </div>
          </div>

          {/* Quick Chart & Live Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Day Revenue Velocity Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Recovery Velocity (Last 7 Days)
                  </h3>
                  <p className="text-xs text-white/50">
                    Revenue at risk vs. Autonomous revenue recovered
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Recovered
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    At Risk
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="date" stroke="#ffffff40" fontSize={11} />
                    <YAxis stroke="#ffffff40" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1F1F1F", border: "1px solid #333", borderRadius: 8 }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                    />
                    <Area type="monotone" dataKey="recovered" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRecovered)" />
                    <Area type="monotone" dataKey="atRisk" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorAtRisk)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Policy Status & Live Summary */}
            <div className="p-6 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#C8A951]" />
                    Policy Guardrails
                  </h3>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#C8A951]/10 text-[#C8A951] border border-[#C8A951]/30">
                    Active
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/70">Auto Recovery</span>
                    <span className={`text-xs font-bold ${policySettings.automaticRecoveryEnabled ? "text-emerald-400" : "text-rose-400"}`}>
                      {policySettings.automaticRecoveryEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/70">Max Retries</span>
                    <span className="text-xs font-bold text-white">
                      {policySettings.maxRetryAttempts} Attempts
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/70">Max Auto Amount</span>
                    <span className="text-xs font-bold text-[#C8A951]">
                      ₹{policySettings.maxAutomaticRecoveryAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/70">Min Probability</span>
                    <span className="text-xs font-bold text-white">
                      {Math.round(policySettings.minRecoveryProbabilityThreshold * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("controls")}
                className="w-full mt-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#C8A951]" />
                Adjust Guardrails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: RECOVERY CASES TABLE */}
      {/* ============================================================= */}
      {activeTab === "cases" && (
        <div className="flex flex-col gap-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#1B1B1B] border border-white/5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer, order ID, or case ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-black/30 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#C8A951]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#C8A951] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_RECOVERY">In Recovery</option>
                <option value="RECOVERED">Recovered</option>
                <option value="LOST">Lost</option>
                <option value="DISMISSED">Dismissed</option>
              </select>

              {/* Action Filter */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#C8A951] cursor-pointer"
              >
                <option value="ALL">All Actions</option>
                <option value="RETRY_PAYMENT">Retry Payment</option>
                <option value="SEND_REMINDER">Send Reminder</option>
                <option value="NO_ACTION">No Action</option>
              </select>
            </div>
          </div>

          {/* Cases Table */}
          <div className="rounded-2xl bg-[#1B1B1B] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="bg-black/30 text-white/50 uppercase font-semibold border-b border-white/5 text-[11px] tracking-wider">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">AI Probability</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-white/40">
                        No recovery cases found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => {
                      const st = STATUS_COLORS[c.recovery_status] || STATUS_COLORS.OPEN;
                      const act = ACTION_COLORS[c.recommendedAction] || ACTION_COLORS.NO_ACTION;
                      const prob = Math.round((c.recoveryProbability || 0) * 100);

                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Customer */}
                          <td className="p-4 font-medium text-white">
                            <div>{c.customer_name || "Valued Customer"}</div>
                            <div className="text-[11px] text-white/40">{c.customer_email || "No email"}</div>
                          </td>

                          {/* Order ID */}
                          <td className="p-4 font-mono text-[11px] text-white/70">
                            {c.order_id}
                          </td>

                          {/* Amount */}
                          <td className="p-4 font-bold text-white">
                            ₹{Number(c.amount).toLocaleString("en-IN")}
                          </td>

                          {/* Recovery Probability */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    prob >= 75
                                      ? "bg-emerald-400"
                                      : prob >= 40
                                      ? "bg-[#C8A951]"
                                      : "bg-rose-400"
                                  }`}
                                  style={{ width: `${prob}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold">{prob}%</span>
                            </div>
                          </td>

                          {/* Recommended Action */}
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${act.bg} ${act.text}`}>
                              {(c.recommendedAction || "NO_ACTION").replace("_", " ")}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.text} ${st.border}`}>
                              {c.recovery_status}
                            </span>
                          </td>

                          {/* Created */}
                          <td className="p-4 text-[11px] text-white/50">
                            {new Date(c.created_at).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <button
                              onClick={() => openCaseDetails(c.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#C8A951]/10 text-[#C8A951] hover:bg-[#C8A951]/20 border border-[#C8A951]/30 transition-all cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: LIVE AGENT ACTIVITY STREAM */}
      {/* ============================================================= */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-[#1B1B1B] border border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C8A951]" />
                Live Agent Audit Stream
              </h3>
              <p className="text-xs text-white/50">
                Immutable chronological log of all autonomous evaluations, policy decisions, and payment events.
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              STREAM ACTIVE
            </span>
          </div>

          <div className="rounded-2xl bg-[#1B1B1B] border border-white/5 p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {activity.length === 0 ? (
              <div className="text-center py-12 text-white/40">No agent actions recorded yet.</div>
            ) : (
              activity.map((act) => {
                let badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                if (act.action_type === "POLICY_APPROVED" || act.action_type === "PAYMENT_RECOVERED") {
                  badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                } else if (act.action_type === "POLICY_BLOCKED" || act.action_type === "RECOVERY_FAILED") {
                  badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                } else if (act.action_type === "RECOVERY_INITIATED") {
                  badgeColor = "bg-[#C8A951]/10 text-[#C8A951] border-[#C8A951]/20";
                }

                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                          {act.action_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {act.customer_name || "Customer"} • {act.order_id || act.case_friendly_id}
                          {act.amount ? ` • ₹${Number(act.amount).toLocaleString("en-IN")}` : ""}
                        </div>
                        <p className="text-xs text-white/60 mt-0.5">{act.reasoning}</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-white/40 whitespace-nowrap">
                      {new Date(act.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: REVENUE ANALYTICS */}
      {/* ============================================================= */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown Chart */}
          <div className="p-6 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Recovery Cases by Status
            </h3>
            <p className="text-xs text-white/50 mb-6">Distribution across lifecycle states</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F1F1F", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Breakdown Chart */}
          <div className="p-6 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Autonomous Recovery Decisions
            </h3>
            <p className="text-xs text-white/50 mb-6">Action distribution decided by agent brain</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionPieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} />
                  <YAxis stroke="#ffffff40" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F1F1F", border: "1px solid #333", borderRadius: 8 }}
                  />
                  <Bar dataKey="value" fill="#C8A951" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 5: AGENT POLICY CONTROLS */}
      {/* ============================================================= */}
      {activeTab === "controls" && (
        <div className="max-w-2xl mx-auto p-6 md:p-8 rounded-2xl bg-[#1B1B1B] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <div className="p-2 rounded-lg bg-[#C8A951]/10 text-[#C8A951]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Autonomous Policy Controls
              </h2>
              <p className="text-xs text-white/50">
                Directly configures the deterministic financial policy engine in real-time.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Control 1: Global Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
              <div>
                <label className="text-sm font-semibold text-white">Automatic Recovery</label>
                <p className="text-xs text-white/50">Master switch for autonomous payment recovery</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPolicySettings((s) => ({
                    ...s,
                    automaticRecoveryEnabled: !s.automaticRecoveryEnabled
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  policySettings.automaticRecoveryEnabled ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    policySettings.automaticRecoveryEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Control 2: Max Retries */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 uppercase">
                Maximum Retry Attempts
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={policySettings.maxRetryAttempts}
                onChange={(e) =>
                  setPolicySettings((s) => ({ ...s, maxRetryAttempts: parseInt(e.target.value, 10) || 1 }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#C8A951]"
              />
              <p className="text-[11px] text-white/40">
                Number of retry actions allowed before marking case as blocked (Default: 2).
              </p>
            </div>

            {/* Control 3: Max Auto Recovery Amount */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 uppercase">
                Maximum Automatic Recovery Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50">₹</span>
                <input
                  type="number"
                  min={100}
                  step={500}
                  value={policySettings.maxAutomaticRecoveryAmount}
                  onChange={(e) =>
                    setPolicySettings((s) => ({
                      ...s,
                      maxAutomaticRecoveryAmount: parseInt(e.target.value, 10) || 1000
                    }))
                  }
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#C8A951]"
                />
              </div>
              <p className="text-[11px] text-white/40">
                Transactions above this threshold require manual manager approval (Default: ₹10,000).
              </p>
            </div>

            {/* Control 4: Minimum Probability */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-white/70 uppercase">
                <span>Minimum Probability Threshold</span>
                <span className="text-[#C8A951]">
                  {Math.round(policySettings.minRecoveryProbabilityThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.9}
                step={0.05}
                value={policySettings.minRecoveryProbabilityThreshold}
                onChange={(e) =>
                  setPolicySettings((s) => ({
                    ...s,
                    minRecoveryProbabilityThreshold: parseFloat(e.target.value)
                  }))
                }
                className="w-full accent-[#C8A951]"
              />
              <p className="text-[11px] text-white/40">
                Minimum AI recovery score required to trigger an action (Default: 10%).
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Policy settings updated and applied to agent brain.
              </div>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs bg-[#C8A951] hover:bg-[#DFBE65] text-black transition-all shadow-lg cursor-pointer"
            >
              {savingSettings ? "Saving Settings..." : "Save Policy Configuration"}
            </button>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 6: AI RECOVERY LAB (HACKATHON DEMO MODE) */}
      {/* ============================================================= */}
      {activeTab === "lab" && (
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1B1B1B] to-[#252015] border border-[#C8A951]/30">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-[#C8A951]" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                AI Recovery Lab — Interactive Demonstration Sandbox
              </h2>
            </div>
            <p className="text-xs text-white/70">
              Trigger realistic revenue drop-off simulations to observe the autonomous agent diagnose, score, evaluate policy, and initiate recovery in real-time.
            </p>
          </div>

          {/* 5 Scenario Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Scenario 1 */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-[#C8A951]/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Primary Scenario
                  </span>
                  <span className="text-xs font-bold text-white">₹4,999</span>
                </div>
                <h4 className="text-sm font-bold text-white">1. Temporary Payment Failure</h4>
                <p className="text-xs text-white/60 mt-1">
                  Customer experiences bank timeout. 3 prior purchases boost recovery probability to 84%.
                </p>
              </div>
              <button
                onClick={() => triggerDemoScenario("temp_failure")}
                disabled={demoRunning !== null}
                className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#C8A951] text-black hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {demoRunning === "temp_failure" ? "Executing Brain..." : "Run Simulation"}
              </button>
            </div>

            {/* Scenario 2 */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-purple-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Reminder Flow
                  </span>
                  <span className="text-xs font-bold text-white">₹3,500</span>
                </div>
                <h4 className="text-sm font-bold text-white">2. Repeated Failure</h4>
                <p className="text-xs text-white/60 mt-1">
                  Multiple checkout dropoffs reduce immediate retry score, selecting SEND_REMINDER.
                </p>
              </div>
              <button
                onClick={() => triggerDemoScenario("repeat_failure")}
                disabled={demoRunning !== null}
                className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {demoRunning === "repeat_failure" ? "Executing Brain..." : "Run Simulation"}
              </button>
            </div>

            {/* Scenario 3 */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-rose-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Policy Blocked
                  </span>
                  <span className="text-xs font-bold text-rose-400">₹18,500</span>
                </div>
                <h4 className="text-sm font-bold text-white">3. High Value Limit Exceeded</h4>
                <p className="text-xs text-white/60 mt-1">
                  Order amount exceeds ₹10,000 threshold. Policy engine safely blocks automatic link dispatch.
                </p>
              </div>
              <button
                onClick={() => triggerDemoScenario("high_value")}
                disabled={demoRunning !== null}
                className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {demoRunning === "high_value" ? "Evaluating Policy..." : "Run Simulation"}
              </button>
            </div>

            {/* Scenario 4 */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-amber-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Limit Guard
                  </span>
                  <span className="text-xs font-bold text-white">2 Retries</span>
                </div>
                <h4 className="text-sm font-bold text-white">4. Retry Limit Reached</h4>
                <p className="text-xs text-white/60 mt-1">
                  Customer has already reached maximum 2 retries. Policy engine blocks spam.
                </p>
              </div>
              <button
                onClick={() => triggerDemoScenario("retry_limit")}
                disabled={demoRunning !== null}
                className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {demoRunning === "retry_limit" ? "Evaluating Policy..." : "Run Simulation"}
              </button>
            </div>

            {/* Scenario 5 */}
            <div className="p-5 rounded-2xl bg-[#1B1B1B] border border-white/5 flex flex-col justify-between hover:border-emerald-500/40 transition-all lg:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Full Webhook Handshake
                  </span>
                  <span className="text-xs font-bold text-emerald-400">₹4,999 Settled</span>
                </div>
                <h4 className="text-sm font-bold text-white">5. Verified Webhook Settlement</h4>
                <p className="text-xs text-white/60 mt-1">
                  Simulates incoming cryptographically signed Razorpay Webhook transitioning case to RECOVERED and updating metrics.
                </p>
              </div>
              <button
                onClick={() => triggerDemoScenario("settlement")}
                disabled={demoRunning !== null}
                className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {demoRunning === "settlement" ? "Verifying Webhook..." : "Run Full Handshake"}
              </button>
            </div>
          </div>

          {/* Live Simulation Output Inspector */}
          {demoResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-[#1B1B1B] border border-[#C8A951]/30 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-[#C8A951] uppercase tracking-wider">
                    {demoResult.scenario} — Live Output
                  </h3>
                  <p className="text-xs text-white/60">{demoResult.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-white/5 text-[11px] font-mono text-white/80 border border-white/10">
                  {demoResult.expected}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto max-h-72">
                <pre>{JSON.stringify(demoResult.result, null, 2)}</pre>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* CASE DETAILS MODAL / DRAWER */}
      {/* ============================================================= */}
      <AnimatePresence>
        {selectedCaseId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-[#1B1B1B] border border-[#C8A951]/30 shadow-2xl flex flex-col overflow-hidden text-white"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/30">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold uppercase tracking-wider text-white">
                      Case Analysis: {selectedCaseData?.case?.case_id || selectedCaseId}
                    </h2>
                    {selectedCaseData?.case?.recovery_status && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[selectedCaseData.case.recovery_status]?.bg} ${STATUS_COLORS[selectedCaseData.case.recovery_status]?.text} ${STATUS_COLORS[selectedCaseData.case.recovery_status]?.border}`}>
                        {selectedCaseData.case.recovery_status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Order ID: {selectedCaseData?.case?.order_id} • Amount: ₹{selectedCaseData?.case?.amount?.toLocaleString("en-IN")}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedCaseId(null);
                    setSelectedCaseData(null);
                  }}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {caseModalLoading ? (
                  <div className="text-center py-12 text-white/40">Loading diagnostic details...</div>
                ) : selectedCaseData ? (
                  <>
                    {/* Diagnostic Summary */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          AI Diagnostic Classification
                        </span>
                        <span className="text-xs font-bold text-[#C8A951]">
                          {selectedCaseData.analysis?.diagnosis?.category}
                        </span>
                      </div>
                      <p className="text-xs text-white/80">
                        {selectedCaseData.analysis?.diagnosis?.reason}
                      </p>
                    </div>

                    {/* Scoring & Expected Value */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-xs text-white/50 font-semibold uppercase">Recovery Probability</div>
                        <div className="text-2xl font-bold text-emerald-400 mt-1">
                          {Math.round((selectedCaseData.analysis?.score?.recoveryProbability || 0) * 100)}%
                        </div>
                        <p className="text-[11px] text-white/40 mt-1">Calculated via deterministic loyalty baseline</p>
                      </div>

                      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-xs text-white/50 font-semibold uppercase">Expected Revenue Recovery</div>
                        <div className="text-2xl font-bold text-white mt-1">
                          ₹{selectedCaseData.analysis?.score?.expectedRecovery?.toLocaleString("en-IN")}
                        </div>
                        <p className="text-[11px] text-white/40 mt-1">
                          Order Value (₹{selectedCaseData.case.amount}) × Probability
                        </p>
                      </div>
                    </div>

                    {/* Decision & Policy Engine */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          Decision & Policy Evaluation
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedCaseData.analysis?.policy?.allowed ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          POLICY: {selectedCaseData.analysis?.policy?.allowed ? "APPROVED" : "BLOCKED"}
                        </span>
                      </div>
                      <div className="text-xs text-white/80">
                        <strong>Action Selected:</strong> {selectedCaseData.analysis?.decision?.action} [Priority: {selectedCaseData.analysis?.decision?.priority}]
                      </div>
                      <div className="text-[11px] text-white/50">
                        {selectedCaseData.analysis?.policy?.reason}
                      </div>
                    </div>

                    {/* Payment Link details if present */}
                    {selectedCaseData.case?.metadata?.paymentLink && (
                      <div className="p-4 rounded-xl bg-[#C8A951]/10 border border-[#C8A951]/30 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#C8A951] uppercase">Razorpay Payment Link</div>
                          <div className="text-[11px] text-white/70 font-mono mt-0.5">
                            {selectedCaseData.case.metadata.paymentLink.shortUrl}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedCaseData.case.metadata.paymentLink.shortUrl)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C8A951] text-black flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? "Copied" : "Copy Link"}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-white/40">Case data not available.</div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-between">
                <button
                  onClick={() => runAgentAnalysis(selectedCaseId)}
                  disabled={analyzingCase}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#C8A951] hover:bg-[#DFBE65] text-black transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {analyzingCase ? "Re-Analyzing..." : "Re-Run Agent Brain"}
                </button>

                <button
                  onClick={() => setSelectedCaseId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
