"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  X,
  CreditCard,
  RefreshCw,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";

interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  status: string;
  createdAt: string;
  items?: any[];
  paymentMethod?: string;
  paymentStatus?: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }
    try {
      setDeletingOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
      } else {
        alert(data.error || "Failed to delete order");
      }
    } catch (err) {
      console.error("Delete order error:", err);
      alert("Failed to delete order");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
        // Sort orders by date descending
        const sorted = (data.data || []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sorted);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingOrderDetail(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedOrder(data.data);
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        // Update local order lists
        setOrders((prev) => 
          prev.map((o) => o.id === selectedOrder.id ? { ...o, status: newStatus as any } : o)
        );
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus as any } : null);
      } else {
        alert(data.error || "Failed to update order status");
      }
    } catch (err) {
      console.error("Update order status error:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Metrics
  const processingCount = orders.filter((o) => o.status === "Processing").length;
  const shippedCount = orders.filter((o) => o.status === "Shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;
  const totalSales = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);

  // Filters logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || o.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-[#C8A951]/70 tracking-widest uppercase">Aligning orders data registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Orders Hub</h1>
          <p className="text-sm text-[#F5F5F5]/60 mt-1">Review checkout cycles, process shipments, and manage logistics.</p>
        </div>
        <button
          onClick={fetchOrders}
          className="p-3 bg-white/5 border border-white/5 hover:border-[#C8A951]/30 text-[#F5F5F5]/80 hover:text-[#C8A951] rounded-xl transition-all"
          title="Refresh Registry"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5">
          <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40 mb-1.5 font-sans">Accumulated Sales</h4>
          <div className="text-2xl font-bold text-white">₹{totalSales.toLocaleString()}</div>
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex justify-between items-center">
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40 mb-1.5 font-sans">Processing</h4>
            <div className="text-2xl font-bold text-amber-400">{processingCount}</div>
          </div>
          <Clock className="w-8 h-8 text-amber-500/20" />
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex justify-between items-center">
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40 mb-1.5 font-sans">Shipped</h4>
            <div className="text-2xl font-bold text-blue-400">{shippedCount}</div>
          </div>
          <Truck className="w-8 h-8 text-blue-500/20" />
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex justify-between items-center">
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40 mb-1.5 font-sans">Delivered</h4>
            <div className="text-2xl font-bold text-emerald-400">{deliveredCount}</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
        </div>
      </div>

      {/* Filter and Search toolbar */}
      <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#F5F5F5]/30" />
          <input
            type="text"
            placeholder="Search orders by customer name, email, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] placeholder-[#F5F5F5]/30 outline-none transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[160px] self-start md:self-auto">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8A951]" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full pl-9 pr-8 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5]/80 uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all"
          >
            <option value="all" className="bg-[#1B1B1B]">All Statuses</option>
            <option value="Processing" className="bg-[#1B1B1B]">Processing</option>
            <option value="Packed" className="bg-[#1B1B1B]">Packed</option>
            <option value="Shipped" className="bg-[#1B1B1B]">Shipped</option>
            <option value="Out for Delivery" className="bg-[#1B1B1B]">Out for Delivery</option>
            <option value="Delivered" className="bg-[#1B1B1B]">Delivered</option>
            <option value="Cancelled" className="bg-[#1B1B1B]">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#1B1B1B] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-black/10 text-[#F5F5F5]/50 text-[10px] font-semibold uppercase tracking-widest">
                <th className="py-4.5 px-6">Order ID</th>
                <th className="py-4.5 px-6">Date</th>
                <th className="py-4.5 px-6">Customer</th>
                <th className="py-4.5 px-6 text-center">Status</th>
                <th className="py-4.5 px-6 text-right">Revenue</th>
                <th className="py-4.5 px-6 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-[#F5F5F5]">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-4.5 px-6 font-mono text-xs text-[#C8A951] group-hover:underline cursor-pointer" onClick={() => handleViewOrder(order)}>
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="py-4.5 px-6 font-light text-[#F5F5F5]/60">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4.5 px-6">
                      <div className="font-semibold text-white">{order.customerName}</div>
                      <div className="text-[10px] text-[#F5F5F5]/40 mt-0.5">{order.email}</div>
                    </td>
                     <td className="py-4.5 px-6 text-center">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        order.status === 'Processing' ? 'text-amber-400 bg-amber-400/5 border-amber-400/10' :
                        order.status === 'Packed' ? 'text-orange-400 bg-orange-400/5 border-orange-400/10' :
                        order.status === 'Shipped' ? 'text-blue-400 bg-blue-400/5 border-blue-400/10' :
                        order.status === 'Out for Delivery' ? 'text-purple-400 bg-purple-400/5 border-purple-400/10' :
                        order.status === 'Delivered' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10' :
                        'text-rose-500 bg-rose-500/5 border-rose-500/10'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right font-bold text-white">
                      ₹{Number(order.total).toLocaleString()}
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 bg-white/5 border border-white/5 rounded-lg text-[#F5F5F5]/60 hover:text-[#C8A951] hover:border-[#C8A951]/30 transition-all"
                          title="Audit Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          disabled={deletingOrderId === order.id}
                          className="p-2 bg-white/5 border border-white/5 rounded-lg text-rose-500 hover:text-rose-400 hover:border-rose-500/30 transition-all disabled:opacity-50"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                    No orders matched your parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Overlay Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full max-w-[640px] bg-[#1B1B1B] border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-[#F5F5F5]/70 hover:text-white rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="border-b border-white/5 pb-4.5 mb-6">
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-white">Order Audit Detail</h3>
                <p className="text-[11px] text-[#C8A951] font-mono mt-1">ID: {selectedOrder.id}</p>
              </div>

              {loadingOrderDetail ? (
                <div className="py-16 flex flex-col items-center justify-center">
                  <MandalaLoader size={36} />
                  <p className="mt-3 text-[10px] text-[#C8A951]/75 tracking-wider uppercase">Gathering order items...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status update controller */}
                  <div className="bg-black/20 p-4.5 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#F5F5F5]/40 font-semibold">Logistics Status</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          selectedOrder.status === 'Processing' ? 'text-amber-400 bg-amber-400/5 border-amber-400/10' :
                          selectedOrder.status === 'Packed' ? 'text-orange-400 bg-orange-400/5 border-orange-400/10' :
                          selectedOrder.status === 'Shipped' ? 'text-blue-400 bg-blue-400/5 border-blue-400/10' :
                          selectedOrder.status === 'Out for Delivery' ? 'text-purple-400 bg-purple-400/5 border-purple-400/10' :
                          selectedOrder.status === 'Delivered' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10' :
                          'text-rose-500 bg-rose-500/5 border-rose-500/10'
                        }`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        disabled={updatingStatus}
                        className="px-3.5 py-2 bg-[#1B1B1B] border border-white/10 hover:border-[#C8A951]/40 rounded-lg text-xs uppercase tracking-wider outline-none text-[#F5F5F5] font-semibold cursor-pointer"
                      >
                        <option value="Processing">Processing</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      {updatingStatus && <div className="w-3.5 h-3.5 border-2 border-[#C8A951]/30 border-t-[#C8A951] rounded-full animate-spin" />}
                    </div>
                  </div>

                  {/* Customer Information Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User profile */}
                    <div className="bg-black/10 p-4 rounded-xl border border-white/5 space-y-3">
                      <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#C8A951]">Customer Profile</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-white font-medium">
                          <User className="w-3.5 h-3.5 text-[#F5F5F5]/40" />
                          {selectedOrder.customerName}
                        </div>
                        <div className="flex items-center gap-2 text-[#F5F5F5]/65">
                          <Mail className="w-3.5 h-3.5 text-[#F5F5F5]/40" />
                          {selectedOrder.email}
                        </div>
                        <div className="flex items-center gap-2 text-[#F5F5F5]/65">
                          <Phone className="w-3.5 h-3.5 text-[#F5F5F5]/40" />
                          {selectedOrder.phone}
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-black/10 p-4 rounded-xl border border-white/5 space-y-3">
                      <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#C8A951]">Logistics Destination</h4>
                      <div className="space-y-1.5 text-xs text-[#F5F5F5]/70">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#F5F5F5]/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="leading-relaxed font-light">{selectedOrder.address}</p>
                            <p className="mt-1 font-semibold text-white">{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Razorpay Transaction Details */}
                  {(selectedOrder.paymentMethod === "Razorpay" || selectedOrder.razorpayOrderId || selectedOrder.razorpayPaymentId) && (
                    <div className="bg-black/10 p-4.5 rounded-xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#C8A951]">Razorpay Payment Details</h4>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/5 border-emerald-400/10">
                          {selectedOrder.paymentStatus || "Paid"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[#F5F5F5]/40 block text-[9px] uppercase tracking-wider mb-0.5">Razorpay Order ID</span>
                            <span className="font-mono text-white text-xs font-bold tracking-wider">{selectedOrder.razorpayOrderId || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-[#F5F5F5]/40 block text-[9px] uppercase tracking-wider mb-0.5">Razorpay Payment ID</span>
                            <span className="font-mono text-white text-xs font-bold tracking-wider">{selectedOrder.razorpayPaymentId || "N/A"}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-[#F5F5F5]/40 block text-[9px] uppercase tracking-wider mb-0.5">Payment Method</span>
                            <span className="text-white font-medium">{selectedOrder.paymentMethod || "Razorpay"}</span>
                          </div>
                          <div>
                            <span className="text-[#F5F5F5]/40 block text-[9px] uppercase tracking-wider mb-0.5">Verification Status</span>
                            <span className="text-emerald-400 font-medium">Auto-Verified on Checkout</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Itemized list of purchases */}
                  <div className="bg-black/10 rounded-xl border border-white/5 overflow-hidden">
                    <div className="px-4 py-3 bg-white/5 text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/50 border-b border-white/5">
                      Itemized Masterpieces
                    </div>
                    <div className="divide-y divide-white/5">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="p-4 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-semibold text-white">{item.productName}</div>
                              <div className="text-[10px] text-[#F5F5F5]/40 mt-0.5">
                                ₹{Number(item.price).toLocaleString()} × {item.quantity}
                              </div>
                            </div>
                            <div className="font-bold text-white">
                              ₹{Number(item.subtotal).toLocaleString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                          No Item Metadata Available
                        </div>
                      )}
                    </div>

                    {/* Subtotal row */}
                    <div className="p-4 bg-black/20 border-t border-white/5 flex justify-between items-center text-sm font-semibold">
                      <span className="text-[#F5F5F5]/50 uppercase text-xs tracking-wider">Accumulated Order Total</span>
                      <span className="text-[#C8A951] text-base font-bold">
                        ₹{Number(selectedOrder.total).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Delete Action in Modal */}
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      disabled={deletingOrderId === selectedOrder.id}
                      className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 hover:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingOrderId === selectedOrder.id ? "Deleting..." : "Delete Order"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
