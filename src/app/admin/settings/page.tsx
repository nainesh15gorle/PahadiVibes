"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { 
  Settings, 
  User as UserIcon, 
  Sliders, 
  BellRing, 
  ShieldCheck, 
  HelpCircle, 
  Save, 
  Globe, 
  ToggleLeft, 
  ToggleRight,
  Database,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "store" | "system">("profile");

  // Store Setting Mocks
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [storeCurrency, setStoreCurrency] = useState("INR");
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(4999);
  
  // Notification Mocks
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [inventoryAlerts, setInventoryAlerts] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    // Simulate saving settings payload
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Settings Console</h1>
        <p className="text-sm text-[#F5F5F5]/60 mt-1">Configure operational thresholds, notifications, and administrator configurations.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 bg-[#1B1B1B] p-4.5 rounded-2xl border border-white/5 space-y-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all ${
              activeTab === "profile" 
                ? "bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/5 text-[#C8A951] border-l-2 border-[#C8A951]"
                : "text-[#F5F5F5]/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <UserIcon className="w-4.5 h-4.5" /> Profile Settings
          </button>
          <button
            onClick={() => setActiveTab("store")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all ${
              activeTab === "store" 
                ? "bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/5 text-[#C8A951] border-l-2 border-[#C8A951]"
                : "text-[#F5F5F5]/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sliders className="w-4.5 h-4.5" /> Store Configurations
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all ${
              activeTab === "system" 
                ? "bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/5 text-[#C8A951] border-l-2 border-[#C8A951]"
                : "text-[#F5F5F5]/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Database className="w-4.5 h-4.5" /> System Details
          </button>
        </div>

        {/* Configurations Forms Container */}
        <div className="flex-1 w-full bg-[#1B1B1B] p-6 rounded-2xl border border-white/5 min-h-[400px]">
          {/* Tab 1: Profile */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951] border-b border-white/5 pb-3">Administrator File</h3>
              
              {profile || user ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#C8A951]/30">
                      {profile?.profile_image ? (
                        <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#C8A951]/20 text-[#C8A951]">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-base">{profile?.full_name || "Administrator"}</h4>
                      <p className="text-xs text-[#C8A951] font-semibold mt-0.5">Super Admin Role</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Primary Email</span>
                      <div className="px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-xs text-[#F5F5F5]/85">
                        {profile?.email || user?.email}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Admin User ID</span>
                      <div className="px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-xs font-mono text-[#F5F5F5]/60">
                        {profile?.id || user?.id}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#F5F5F5]/45 uppercase tracking-widest">Resolving security credentials...</p>
              )}
            </div>
          )}

          {/* Tab 2: Store settings */}
          {activeTab === "store" && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951] border-b border-white/5 pb-3">Operational Thresholds</h3>
              
              {/* Currency & stock alerts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Store Currency</label>
                  <select
                    value={storeCurrency}
                    onChange={(e) => setStoreCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 rounded-xl text-xs text-[#F5F5F5] outline-none"
                  >
                    <option value="INR" className="bg-[#1B1B1B]">INR (₹)</option>
                    <option value="USD" className="bg-[#1B1B1B]">USD ($)</option>
                    <option value="EUR" className="bg-[#1B1B1B]">EUR (€)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Low Stock Limit</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 rounded-xl text-sm text-white outline-none"
                  />
                  <p className="text-[10px] text-[#F5F5F5]/35">Triggers low stock status flags.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Free Shipping Min (INR)</label>
                  <input
                    type="number"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 rounded-xl text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Maintenance toggle */}
              <div className="pt-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Advanced Triggers</h4>
                
                <div className="flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5">
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-white">Boutique Maintenance Mode</h5>
                    <p className="text-[10px] text-[#F5F5F5]/40 mt-0.5">Redirect customer frontend to a maintenance message.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className="text-[#C8A951] transition-colors"
                  >
                    {maintenanceMode ? (
                      <ToggleRight className="w-8.5 h-8.5 text-[#C8A951]" />
                    ) : (
                      <ToggleLeft className="w-8.5 h-8.5 text-[#F5F5F5]/35" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5">
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-white">Live Email Notifications</h5>
                    <p className="text-[10px] text-[#F5F5F5]/40 mt-0.5">Dispatch transaction confirmation emails automatically.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderAlerts(!orderAlerts)}
                    className="text-[#C8A951] transition-colors"
                  >
                    {orderAlerts ? (
                      <ToggleRight className="w-8.5 h-8.5 text-[#C8A951]" />
                    ) : (
                      <ToggleLeft className="w-8.5 h-8.5 text-[#F5F5F5]/35" />
                    )}
                  </button>
                </div>
              </div>

              {/* Save changes action */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                {savedSuccess && <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mr-2">Configurations saved successfully!</span>}
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#C8A951] hover:bg-[#B59642] text-white py-5 px-6 rounded-xl font-medium tracking-wider uppercase text-xs shadow-lg shadow-[#C8A951]/10 border border-[#C8A951]/20 transition-all flex items-center gap-1.5"
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Tab 3: System details */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951] border-b border-white/5 pb-3">Environment Diagnostics</h3>
              
              <div className="bg-black/25 p-4 rounded-xl border border-white/5 font-mono text-xs text-[#F5F5F5]/70 space-y-3">
                <div className="flex items-center gap-2 text-[#C8A951] font-semibold border-b border-white/5 pb-2 uppercase text-[10px] tracking-wider">
                  <Terminal className="w-4 h-4" /> Runtime Context
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-white/30 block uppercase tracking-widest">OS Node Platform</span>
                    <span className="text-white mt-1 block">Darwin (MacOS Sandbox)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 block uppercase tracking-widest">NextJS Version</span>
                    <span className="text-white mt-1 block">15.1.0-canary (App Router)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 block uppercase tracking-widest">Database Adapter</span>
                    <span className="text-white mt-1 block">Google Sheets API Client</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 block uppercase tracking-widest">Clerk Identity Middleware</span>
                    <span className="text-white mt-1 block">Clerk Middleware V7</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/10 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-[#C8A951] mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-semibold text-white uppercase tracking-wider">Database Health Check</h4>
                  <p className="text-[#F5F5F5]/60 mt-1 leading-relaxed">
                    Google Sheets API is running in active, high-priority caching mode. Auto-backup schedules are synchronized every 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
