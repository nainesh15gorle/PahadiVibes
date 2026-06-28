"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Clock, Package, Truck, CheckCircle2, 
  MapPin, Phone, User, Calendar, CreditCard, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { useToast } from "@/components/ui/Toast";

interface TrackedOrder {
  id: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}

export default function TrackOrderPage() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const { toast } = useToast();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim() || !phoneInput.trim()) {
      toast("Please enter both Order ID and Mobile Number.", "warning");
      return;
    }

    setLoading(true);
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/track?orderId=${encodeURIComponent(orderIdInput.trim())}&phone=${encodeURIComponent(phoneInput.trim())}`);
      const data = await res.json();

      if (data.success && data.data) {
        setOrder(data.data);
        toast("Order details retrieved successfully.", "success");
      } else {
        toast(data.error || "No matching order found.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("A network error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Tracking Timeline steps configuration
  const timelineSteps = [
    { label: "Payment Confirmed", key: "Paid", icon: CreditCard, desc: "Your payment has been received and secured via Razorpay." },
    { label: "Processing", key: "Processing", icon: Clock, desc: "Our artisans are preparing your order details." },
    { label: "Packed", key: "Packed", icon: Package, desc: "Your handcrafted goods have been packed with extreme care." },
    { label: "Shipped", key: "Shipped", icon: Truck, desc: "Your package is currently in transit with our logistics partner." },
    { label: "Out for Delivery", key: "Out for Delivery", icon: Truck, desc: "The package has reached your city and is out for local delivery." },
    { label: "Delivered", key: "Delivered", icon: CheckCircle2, desc: "Handcrafted masterwork successfully delivered to your doorstep." }
  ];

  // Helper to get active step index based on order status
  const getActiveStepIndex = (status: string) => {
    const statusMap: Record<string, number> = {
      "Pending Verification": 0,
      "Payment Verified": 0,
      "Processing": 1,
      "Packed": 2,
      "Shipped": 3,
      "Out for Delivery": 4,
      "Delivered": 5
    };
    return statusMap[status] !== undefined ? statusMap[status] : 1;
  };

  const activeIndex = order ? getActiveStepIndex(order.status) : 0;
  const isCancelled = order?.status === "Cancelled" || order?.status === "Payment Rejected";

  return (
    <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 font-sans">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl">
        
        {/* Luxury Header */}
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-semibold text-primary tracking-widest uppercase mb-2 block">Pahadi Vibes Delivery</span>
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">Track Your Masterpiece</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enter your unique Order ID and the Mobile Number used during checkout to view real-time delivery timelines and artisan processing progress.
          </p>
        </div>

        {/* Tracking Input Card */}
        <div className="glass rounded-none p-6 md:p-8 border border-border/60 shadow-lg mb-10 max-w-2xl mx-auto">
          <form onSubmit={handleTrack} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="flex flex-col gap-2">
                <label htmlFor="orderId" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order ID</label>
                <input
                  type="text"
                  id="orderId"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  className="h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none"
                  placeholder="e.g. d68a35e4..."
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none"
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Locating Order...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Track Order Status
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Tracking Details Display */}
        <AnimatePresence mode="wait">
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-8 text-left"
            >
              {/* Order Status Summary Bar */}
              <div className="glass rounded-none p-6 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Current Delivery Status</span>
                  <h3 className={`text-xl font-bold font-heading mt-1 uppercase tracking-wider ${isCancelled ? 'text-destructive' : 'text-primary'}`}>
                    {isCancelled ? order.status : timelineSteps[activeIndex].label}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted-foreground border-t md:border-t-0 border-border/40 pt-4 md:pt-0">
                  <div>
                    <span className="font-semibold block text-foreground/70 uppercase tracking-wider text-[10px]">Order Date</span>
                    <span className="font-light mt-0.5 block">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-foreground/70 uppercase tracking-wider text-[10px]">Total Value</span>
                    <span className="font-bold text-foreground block font-mono">₹{order.total.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-foreground/70 uppercase tracking-wider text-[10px]">Method</span>
                    <span className="font-light text-foreground/90 block">Razorpay API</span>
                  </div>
                </div>
              </div>

              {/* Cancelled Alert Banner */}
              {isCancelled && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-5 rounded-none flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5 rotate-180" />
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider">Order Unfulfilled</h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      This order was marked as <strong>{order.status}</strong>. Please reach out to our Customer Relations team at <span className="font-semibold">support@pahadivibes.com</span> for any refund inquiries or verification issues.
                    </p>
                  </div>
                </div>
              )}

              {/* TIMELINE PATH (Vertical for mobile, horizontal on large screens) */}
              {!isCancelled && (
                <div className="glass rounded-none p-6 md:p-8 border border-border/60 shadow-md">
                  <h3 className="font-heading text-lg font-bold border-b border-border pb-3 mb-8">Artisan & Shipping Progress</h3>
                  
                  {/* Timeline Visual Container */}
                  <div className="relative pl-8 md:pl-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
                    {/* Background Progress Line */}
                    <div className="absolute left-3.5 md:left-[8%] top-0 md:top-5.5 w-[2px] md:w-[84%] h-full md:h-[2px] bg-border z-0" />
                    <div 
                      className="absolute left-3.5 md:left-[8%] top-0 md:top-5.5 w-[2px] md:w-[84%] bg-primary z-0 transition-all duration-1000" 
                      style={{ 
                        height: typeof window !== 'undefined' && window.innerWidth < 768 ? `${(activeIndex / 5) * 100}%` : '2px',
                        width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${(activeIndex / 5) * 84}%` : '2px'
                      }}
                    />

                    {timelineSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isCompleted = index < activeIndex;
                      const isActive = index === activeIndex;
                      const isPending = index > activeIndex;

                      return (
                        <div key={index} className="relative z-10 flex flex-row md:flex-col items-start md:items-center text-left md:text-center md:flex-1">
                          
                          {/* Circle Badge */}
                          <div className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all duration-700 md:mb-3 flex-shrink-0 ${
                            isCompleted 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : isActive 
                                ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20 ring-4 ring-primary/10" 
                                : "bg-background border-border text-muted-foreground"
                          }`}>
                            <StepIcon className="w-4 h-4" />
                          </div>

                          {/* Step Labels */}
                          <div className="ml-4 md:ml-0 px-1">
                            <h4 className={`text-xs font-bold uppercase tracking-wider transition-colors duration-700 ${
                              isActive ? "text-primary font-black" : isPending ? "text-muted-foreground/70" : "text-foreground"
                            }`}>
                              {step.label}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] leading-normal font-light md:mx-auto hidden md:block">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Details & Address Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Ordered Items Summary */}
                <div className="glass rounded-none p-5 border border-border/60 md:col-span-2 space-y-4">
                  <h3 className="font-heading text-lg font-bold border-b border-border pb-2">Order Items</h3>
                  <div className="divide-y divide-border/40 max-h-64 overflow-y-auto pr-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center text-sm">
                        <div>
                          <h4 className="font-bold text-foreground">{item.productName}</h4>
                          <span className="text-xs text-muted-foreground">Quantity: {item.quantity} × ₹{item.price.toLocaleString()}</span>
                        </div>
                        <span className="font-semibold font-mono text-foreground">₹{item.subtotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4 flex justify-between font-bold text-base">
                    <span>Total Amount Paid</span>
                    <span className="text-primary font-heading">₹{order.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Shipping & Delivery Address Panel */}
                <div className="glass rounded-none p-5 border border-border/60 md:col-span-1 space-y-4">
                  <h3 className="font-heading text-lg font-bold border-b border-border pb-2">Delivery Address</h3>
                  <div className="space-y-3 text-xs text-muted-foreground leading-relaxed font-light">
                    <p className="flex items-start gap-2 text-foreground font-semibold"><User className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> {order.customerName}</p>
                    <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> <span>{order.address}, {order.city}, {order.state} - {order.pincode}</span></p>
                    <p className="flex items-start gap-2 text-foreground/90 font-medium"><Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> {order.phone}</p>
                    {order.email && <p className="flex items-start gap-2 font-mono truncate"><span>{order.email}</span></p>}
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
