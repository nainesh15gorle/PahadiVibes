"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Search, 
  Eye, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  User as UserIcon,
  X,
  TrendingUp,
  RefreshCw,
  Mail
} from "lucide-react";
import { MandalaLoader } from "@/components/ui/mandala-loader";

interface Customer {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  orderCount: number;
  totalSpend: number;
  orders: any[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selected Customer details modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter logic
  const filteredCustomers = customers.filter((c) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatJoinedDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-[#C8A951]/70 tracking-widest uppercase">Synchronizing customer accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Customer Directory</h1>
          <p className="text-sm text-[#F5F5F5]/60 mt-1">Review authenticated profiles, billing history, and user activity logs.</p>
        </div>
        <button
          onClick={fetchCustomers}
          className="p-3 bg-white/5 border border-white/5 hover:border-[#C8A951]/30 text-[#F5F5F5]/80 hover:text-[#C8A951] rounded-xl transition-all"
          title="Reload Customer Roster"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Stats Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-[#C8A951]/10 rounded-xl border border-[#C8A951]/20 text-[#C8A951]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Active Directory</h4>
            <div className="text-2xl font-bold text-white mt-1">{customers.length} Accounts</div>
          </div>
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Gross Customer Value</h4>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              ₹{customers.reduce((sum, c) => sum + c.totalSpend, 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Average Orders Ratio</h4>
            <div className="text-2xl font-bold text-blue-400 mt-1">
              {customers.length > 0 
                ? (customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length).toFixed(1) 
                : 0} orders
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#F5F5F5]/30" />
          <input
            type="text"
            placeholder="Search directory by customer name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] placeholder-[#F5F5F5]/30 outline-none transition-all"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-[#1B1B1B] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-black/10 text-[#F5F5F5]/50 text-[10px] font-semibold uppercase tracking-widest">
                <th className="py-4.5 px-6">Customer Profile</th>
                <th className="py-4.5 px-6">Joined Date</th>
                <th className="py-4.5 px-6 text-center">Purchased Orders</th>
                <th className="py-4.5 px-6 text-right">LTV spend</th>
                <th className="py-4.5 px-6 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-[#F5F5F5]">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-white/[0.01] transition-colors group">
                    {/* User profile details */}
                    <td className="py-4.5 px-6 flex items-center gap-4">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-[#C8A951]/20 bg-white/5 flex-shrink-0">
                        {cust.imageUrl ? (
                          <img src={cust.imageUrl} alt={cust.name} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#C8A951]/20 text-[#C8A951]">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate max-w-[220px]">{cust.name}</div>
                        <div className="text-[10px] text-[#F5F5F5]/40 mt-0.5 truncate max-w-[200px]">{cust.email}</div>
                      </div>
                    </td>

                    {/* Joined date */}
                    <td className="py-4.5 px-6 font-light text-[#F5F5F5]/60">
                      {formatJoinedDate(cust.createdAt)}
                    </td>

                    {/* Purchases count */}
                    <td className="py-4.5 px-6 text-center">
                      <span className="font-mono text-sm font-semibold text-white/80">
                        {cust.orderCount}
                      </span>
                    </td>

                    {/* LTV Spend */}
                    <td className="py-4.5 px-6 text-right font-bold text-white">
                      ₹{cust.totalSpend.toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-4.5 px-6 text-right">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="p-2 bg-white/5 border border-white/5 rounded-lg text-[#F5F5F5]/60 hover:text-[#C8A951] hover:border-[#C8A951]/30 transition-all"
                        title="Audit Customer File"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                    No customers found matching search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Orders Audit Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full max-w-[600px] bg-[#1B1B1B] border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-[#F5F5F5]/70 hover:text-white rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Customer Profile Banner */}
              <div className="flex items-center gap-4 border-b border-white/5 pb-5 mb-6">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#C8A951]/35">
                  {selectedCustomer.imageUrl ? (
                    <img src={selectedCustomer.imageUrl} alt={selectedCustomer.name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#C8A951]/20 text-[#C8A951]">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wide">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#F5F5F5]/50 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedCustomer.email}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#C8A951] uppercase tracking-wider mt-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    Member Since {formatJoinedDate(selectedCustomer.createdAt)}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase tracking-widest text-[#F5F5F5]/40 font-semibold">Total Purchased Orders</span>
                  <div className="text-xl font-bold text-white mt-1">{selectedCustomer.orderCount} orders</div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase tracking-widest text-[#F5F5F5]/40 font-semibold">Lifetime spend (LTV)</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">₹{selectedCustomer.totalSpend.toLocaleString()}</div>
                </div>
              </div>

              {/* Order History */}
              <div className="bg-black/10 rounded-xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 bg-white/5 text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/50 border-b border-white/5">
                  Order Billing History
                </div>
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                    selectedCustomer.orders.map((order: any, index: number) => (
                      <div key={index} className="p-4 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-mono text-[#C8A951] font-semibold">{order.id.slice(0, 8)}...</div>
                          <div className="text-[10px] text-[#F5F5F5]/40 mt-1">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            order.status === 'Processing' ? 'text-amber-400 bg-amber-400/5 border-amber-400/10' :
                            order.status === 'Shipped' ? 'text-blue-400 bg-blue-400/5 border-blue-400/10' :
                            order.status === 'Delivered' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10' :
                            'text-red-400 bg-red-400/5 border-red-400/10'
                          }`}>
                            {order.status}
                          </span>
                          <div className="font-bold text-white text-right w-[70px]">
                            ₹{Number(order.total).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                      No order transactions captured.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
