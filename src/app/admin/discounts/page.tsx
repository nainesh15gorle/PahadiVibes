"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Percent, 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  X, 
  RefreshCw, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";

interface Discount {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  expiryDate: string | null;
  active: boolean;
  createdAt: string;
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState<number | "">("");
  const [expiryDate, setExpiryDate] = useState("");
  const [active, setActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/discounts");
      const data = await res.json();
      if (data.success) {
        setDiscounts(data.data || []);
      }
    } catch (err) {
      console.error("Fetch discounts error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let generated = "MANDALA-";
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(generated);
  };

  const handleToggleActive = async (discount: Discount) => {
    try {
      setTogglingId(discount.id);
      const res = await fetch(`/api/discounts/${discount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !discount.active })
      });
      const data = await res.json();
      if (data.success) {
        setDiscounts((prev) => 
          prev.map((d) => d.id === discount.id ? { ...d, active: !d.active } : d)
        );
      }
    } catch (err) {
      console.error("Toggle discount active error:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const validationErrors: Record<string, string> = {};
    if (!code.trim()) validationErrors.code = "Coupon code is required.";
    if (value === "" || Number(value) <= 0) validationErrors.value = "Value must be positive.";
    if (type === "percentage" && Number(value) > 100) {
      validationErrors.value = "Percentage cannot exceed 100%.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitting(false);
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      expiryDate: expiryDate || null,
      active
    };

    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCode("");
        setType("percentage");
        setValue("");
        setExpiryDate("");
        setActive(true);
        setShowAddForm(false);
        fetchDiscounts();
      } else {
        setErrors({ code: data.error || "Failed to create coupon" });
      }
    } catch (err) {
      console.error("Create discount error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/discounts/${deleteId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setDiscounts(discounts.filter((d) => d.id !== deleteId));
        setDeleteId(null);
      } else {
        alert(data.error || "Failed to delete discount code");
      }
    } catch (err) {
      console.error("Delete discount error:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Metrics
  const activeCount = discounts.filter((d) => d.active).length;
  const inactiveCount = discounts.filter((d) => !d.active).length;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-[#C8A951]/70 tracking-widest uppercase">Calculating promo allocations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Promotion Codes</h1>
          <p className="text-sm text-[#F5F5F5]/60 mt-1">Manage marketing campaigns, seasonal discounts and loyalty offers.</p>
        </div>
        {!showAddForm && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-[#C8A951] hover:bg-[#B59642] text-white py-5 px-6 rounded-xl font-medium tracking-wider uppercase text-xs shadow-lg shadow-[#C8A951]/10 border border-[#C8A951]/20 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Coupon
          </Button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-[#C8A951]/10 rounded-xl border border-[#C8A951]/20 text-[#C8A951]">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Active Campaigns</h4>
            <div className="text-2xl font-bold text-white mt-1">{activeCount} Codes</div>
          </div>
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-zinc-500/10 rounded-xl border border-zinc-500/20 text-zinc-400">
            <ToggleLeft className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Inactive Campaigns</h4>
            <div className="text-2xl font-bold text-zinc-400 mt-1">{inactiveCount} Codes</div>
          </div>
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-[#D4A373]/10 rounded-xl border border-[#D4A373]/20 text-[#D4A373]">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Total Coupons Created</h4>
            <div className="text-2xl font-bold text-white mt-1">{discounts.length} Campaigns</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Discounts List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#C8A951]" /> Discount Registry
              </h3>
              <button
                onClick={fetchDiscounts}
                className="text-[#C8A951] hover:text-[#B59642] p-1 rounded-lg transition-colors"
                title="Reload List"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[#F5F5F5]/50 text-[10px] font-semibold uppercase tracking-widest">
                    <th className="pb-3.5 pr-4">Code</th>
                    <th className="pb-3.5 px-4">Type</th>
                    <th className="pb-3.5 px-4 text-right">Benefit</th>
                    <th className="pb-3.5 px-4 text-center">Expiry</th>
                    <th className="pb-3.5 px-4 text-center">Active</th>
                    <th className="pb-3.5 pl-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-[#F5F5F5]">
                  {discounts.length > 0 ? (
                    discounts.map((discount) => {
                      const isExpired = discount.expiryDate && new Date(discount.expiryDate).getTime() < Date.now();
                      return (
                        <tr key={discount.id} className="hover:bg-white/[0.01] transition-colors group">
                          {/* Code */}
                          <td className="py-4 pr-4 font-mono font-bold text-[#C8A951]">
                            {discount.code}
                          </td>
                          {/* Type */}
                          <td className="py-4 px-4 uppercase tracking-wider text-xs font-light text-[#F5F5F5]/70">
                            {discount.type}
                          </td>
                          {/* Benefit */}
                          <td className="py-4 px-4 text-right font-bold text-white">
                            {discount.type === "percentage" ? `${discount.value}% OFF` : `₹${discount.value} OFF`}
                          </td>
                          {/* Expiry */}
                          <td className={`py-4 px-4 text-center text-xs font-light ${isExpired ? 'text-red-400' : 'text-[#F5F5F5]/65'}`}>
                            {discount.expiryDate ? (
                              <span className="flex items-center justify-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#F5F5F5]/30" />
                                {new Date(discount.expiryDate).toLocaleDateString()}
                              </span>
                            ) : (
                              "No Expiry"
                            )}
                          </td>
                          {/* Active Toggle */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleToggleActive(discount)}
                                disabled={togglingId === discount.id}
                                className={`text-[#C8A951] hover:text-[#B59642] transition-colors ${togglingId === discount.id ? 'opacity-50' : ''}`}
                              >
                                {discount.active ? (
                                  <ToggleRight className="w-6.5 h-6.5 text-[#C8A951]" />
                                ) : (
                                  <ToggleLeft className="w-6.5 h-6.5 text-[#F5F5F5]/30" />
                                )}
                              </button>
                            </div>
                          </td>
                          {/* Delete */}
                          <td className="py-4 pl-4 text-right">
                            <button
                              onClick={() => setDeleteId(discount.id)}
                              className="p-1.5 bg-white/5 border border-white/5 rounded-md text-[#F5F5F5]/50 hover:text-red-400 hover:border-red-500/20 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                        No active discount campaigns.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Creation Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5 space-y-6 h-fit"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> New Coupon
                </h3>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="text-xs text-[#F5F5F5]/40 hover:text-white uppercase tracking-wider font-semibold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Code field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Coupon Code</label>
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="text-[10px] text-[#C8A951] hover:underline uppercase tracking-wider font-bold"
                    >
                      Auto Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FESTIVE20"
                    className={`w-full px-4 py-3 bg-black/20 border ${errors.code ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-sm font-mono text-white outline-none transition-all`}
                  />
                  {errors.code && <p className="text-[11px] text-red-400 mt-1">{errors.code}</p>}
                </div>

                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Benefit Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5] uppercase tracking-wider outline-none cursor-pointer"
                  >
                    <option value="percentage" className="bg-[#1B1B1B]">Percentage (%)</option>
                    <option value="fixed" className="bg-[#1B1B1B]">Fixed Amount (₹)</option>
                  </select>
                </div>

                {/* Value */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Discount value</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={type === "percentage" ? "15" : "500"}
                    className={`w-full px-4 py-3 bg-black/20 border ${errors.value ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-sm text-[#F5F5F5] outline-none transition-all`}
                  />
                  {errors.value && <p className="text-[11px] text-red-400 mt-1">{errors.value}</p>}
                </div>

                {/* Expiry Date */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Expiration Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5] outline-none cursor-pointer"
                  />
                  <p className="text-[10px] text-[#F5F5F5]/30">Optional. Leave empty for permanent code.</p>
                </div>

                {/* Active Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer group bg-black/10 p-3.5 rounded-xl border border-white/5 hover:border-[#C8A951]/20 transition-all">
                  <div className="relative flex items-center justify-center w-5 h-5 border border-[#C8A951]/40 rounded group-hover:border-[#C8A951] transition-colors bg-black/20">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="peer sr-only"
                    />
                    {active && <Check className="w-3.5 h-3.5 text-[#C8A951]" />}
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-white group-hover:text-[#C8A951] transition-colors">Activate Immediately</span>
                  </div>
                </label>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#C8A951] hover:bg-[#B59642] disabled:bg-[#C8A951]/55 text-white py-5 rounded-xl uppercase tracking-widest text-xs font-semibold border border-[#C8A951]/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Deploy Coupon"
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[420px] bg-[#1B1B1B] border border-red-500/20 rounded-2xl p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/40" />
              <div className="flex items-start gap-4 mt-2">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                  <Percent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold uppercase tracking-wider text-white">Delete Coupon Code?</h3>
                  <p className="text-xs text-[#F5F5F5]/60 mt-1.5 leading-relaxed">
                    This action is permanent. Customers will no longer be able to apply this promotion code at checkout.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-[#F5F5F5] rounded-xl text-xs uppercase tracking-wider font-semibold border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white rounded-xl text-xs uppercase tracking-wider font-semibold shadow-lg shadow-red-600/10 transition-all flex items-center gap-1.5"
                >
                  {deleting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Delete Campaign"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
