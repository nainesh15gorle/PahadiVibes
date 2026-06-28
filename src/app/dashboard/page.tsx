"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, ShoppingBag, MapPin, LogOut, Edit3, 
  Check, AlertCircle, Calendar, Truck, Package, 
  MapPinned, Phone, Mail, ArrowRight, Eye, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MandalaLoader } from '@/components/ui/mandala-loader';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
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
  items: OrderItem[];
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
}

export default function UserDashboardPage() {
  const { user, profile, refreshProfile, signOut, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses'>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isAddressesLoading, setIsAddressesLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Edit Profile form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in?redirect_url=/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Load orders and addresses when signed in
  useEffect(() => {
    if (isSignedIn) {
      // 1. Fetch Orders
      fetch('/api/orders/user')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setOrders(data.data || []);
          }
          setIsOrdersLoading(false);
        })
        .catch((err) => {
          console.error("Orders fetch error:", err);
          setIsOrdersLoading(false);
        });

      // 2. Fetch Addresses
      fetch('/api/addresses')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAddresses(data.data || []);
          }
          setIsAddressesLoading(false);
        })
        .catch((err) => {
          console.error("Addresses fetch error:", err);
          setIsAddressesLoading(false);
        });
    }
  }, [isSignedIn]);

  // Initialize profile form
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileError("Full Name must be at least 2 characters.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update profile.");
      }

      await refreshProfile();
      setProfileSuccess("Profile updated successfully!");
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || "An error occurred.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex-1 w-full bg-background min-h-[70vh] flex flex-col items-center justify-center pt-32 pb-20">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">Opening Dashboard...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Shipped":
      case "Out for Delivery":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "Processing":
      case "Packed":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "Cancelled":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-neutral-500 bg-neutral-500/10 border-neutral-500/20";
    }
  };

  const getOrderStatusSteps = (status: string) => {
    const steps = [
      { label: "Processing", active: ["Processing", "Packed", "Shipped", "Out for Delivery", "Delivered"].includes(status) },
      { label: "Shipped", active: ["Shipped", "Out for Delivery", "Delivered"].includes(status) },
      { label: "Delivered", active: status === "Delivered" },
    ];
    return steps;
  };

  return (
    <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 font-sans">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-6 mb-8 gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold">Patron Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account, track luxury orders, and edit shipping details.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-destructive/20 text-destructive hover:bg-destructive/5 text-xs font-bold tracking-widest uppercase transition-all rounded-none"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Side Tabs */}
          <div className="lg:col-span-1 space-y-2">
            {[
              { id: 'profile', label: 'My Profile', icon: User },
              { id: 'orders', label: 'My Orders', icon: ShoppingBag },
              { id: 'addresses', label: 'My Addresses', icon: MapPin },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSelectedOrder(null);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold tracking-wide uppercase transition-all border ${
                    activeTab === tab.id
                      ? "bg-primary/5 text-primary border-primary/20 border-l-2 border-l-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent"
                  } rounded-none text-left`}
                >
                  <IconComponent className="w-5 h-5 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main Workspace Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass rounded-none p-6 md:p-8 border border-border/60 space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-4">
                    <h3 className="text-xl font-bold tracking-wide">Patron Details</h3>
                    {!isEditingProfile && (
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                      </button>
                    )}
                  </div>

                  {profileError && (
                    <div className="bg-red-500/10 text-red-500 text-sm p-3 border border-red-500/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="bg-emerald-500/10 text-emerald-500 text-sm p-3 border border-emerald-500/20 flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-11 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-none"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-11 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-none"
                          placeholder="e.g. +91 9999999999"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="submit" 
                          disabled={isSavingProfile}
                          className="bg-primary text-primary-foreground text-xs uppercase tracking-widest font-bold rounded-none h-11 px-6"
                        >
                          {isSavingProfile ? "Saving..." : "Save Changes"}
                        </Button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsEditingProfile(false);
                            if (profile) {
                              setFullName(profile.full_name);
                              setPhone(profile.phone || '');
                            }
                          }}
                          className="px-5 border border-border hover:bg-muted/30 text-xs font-bold uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold mb-1">Full Name</span>
                          <span className="font-medium text-foreground text-base">{profile?.full_name}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold mb-1">Email Address</span>
                          <span className="font-medium text-foreground text-base">{profile?.email}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold mb-1">Phone Number</span>
                          <span className="font-medium text-foreground text-base">{profile?.phone || <span className="text-muted-foreground/60 italic text-xs">Not provided</span>}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block uppercase tracking-wider font-semibold mb-1">Account Sign-in Provider</span>
                          <span className="capitalize inline-flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/20 text-primary font-bold px-2 py-0.5 mt-1">
                            {profile?.provider === 'google' ? (
                              <>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.82 15.71 17.6V20.35H19.28C21.36 18.43 22.56 15.6 22.56 12.25Z" fill="#C8A951"/>
                                  <path d="M12 23C14.97 23 17.46 22.02 19.28 20.35L15.71 17.6C14.72 18.26 13.45 18.66 12 18.66C9.18 18.66 6.8 16.76 5.92 14.21H2.23V17.07C4.04 20.66 7.7 23 12 23Z" fill="#C8A951"/>
                                  <path d="M5.92 14.21C5.69 13.54 5.57 12.78 5.57 12C5.57 11.22 5.69 10.46 5.92 9.79V6.93H2.23C1.49 8.4 1.07 10.14 1.07 12C1.07 13.86 1.49 15.6 2.23 17.07L5.92 14.21Z" fill="#C8A951"/>
                                  <path d="M12 5.34C13.62 5.34 15.06 5.9 16.2 6.99L19.35 3.84C17.46 2.08 14.97 1 12 1C7.7 1 4.04 3.34 2.23 6.93L5.92 9.79C6.8 7.24 9.18 5.34 12 5.34Z" fill="#C8A951"/>
                                </svg>
                                Google
                              </>
                            ) : "Email & Password"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'orders' && (
                <motion.div
                  key="orders-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {selectedOrder ? (
                    /* Detailed Order View with Track Progress */
                    <div className="glass rounded-none p-6 md:p-8 border border-border/60 space-y-8">
                      <div className="flex items-center gap-3 justify-between border-b border-border/40 pb-4">
                        <div>
                          <button 
                            onClick={() => setSelectedOrder(null)}
                            className="text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-primary mb-2 flex items-center gap-1.5"
                          >
                            &larr; Back to Order List
                          </button>
                          <h3 className="text-xl font-bold tracking-wide">Order Details</h3>
                        </div>
                        <span className={`border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                      </div>

                      {/* Order Tracking Progress bar */}
                      <div className="bg-[#C8A951]/5 border border-[#C8A951]/15 p-6 md:p-8">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-6 flex items-center gap-2"><Truck className="w-4.5 h-4.5" /> Delivery Progress</h4>
                        
                        <div className="relative flex justify-between items-center w-full max-w-xl mx-auto">
                          {/* Track bar line */}
                          <div className="absolute top-[15px] left-0 right-0 h-[2px] bg-border z-0" />
                          
                          {getOrderStatusSteps(selectedOrder.status).map((step, idx) => (
                            <div key={idx} className="relative z-10 flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                                step.active 
                                  ? "bg-primary border-primary text-primary-foreground" 
                                  : "bg-background border-border text-muted-foreground"
                              }`}>
                                {step.active ? <Check className="w-4 h-4" /> : idx + 1}
                              </div>
                              <span className={`text-[10px] uppercase font-bold tracking-wider mt-2.5 transition-colors ${
                                step.active ? "text-primary" : "text-muted-foreground"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">Order ID</span>
                            <span className="font-mono text-foreground font-bold">{selectedOrder.orderId}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">Placed On</span>
                            <span className="font-medium text-foreground flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> {new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">Delivery Address</span>
                            <span className="font-medium text-foreground block">{selectedOrder.customerName}</span>
                            <span className="text-muted-foreground leading-relaxed text-xs block mt-1">{selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</span>
                            <span className="text-xs font-semibold text-foreground/80 block mt-1">Phone: {selectedOrder.phone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items table */}
                      <div className="border border-border/60">
                        <div className="bg-muted/20 p-4 border-b border-border/40 font-bold text-xs uppercase tracking-wider text-muted-foreground grid grid-cols-12 gap-4">
                          <span className="col-span-6 md:col-span-7">Art Piece</span>
                          <span className="col-span-3 md:col-span-2 text-right">Price</span>
                          <span className="col-span-1 text-center">Qty</span>
                          <span className="col-span-2 text-right">Total</span>
                        </div>
                        <div className="divide-y divide-border/40">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="p-4 grid grid-cols-12 gap-4 items-center text-sm">
                              <span className="col-span-6 md:col-span-7 font-bold text-foreground">{item.productName}</span>
                              <span className="col-span-3 md:col-span-2 text-right">₹{item.price.toLocaleString()}</span>
                              <span className="col-span-1 text-center font-semibold text-muted-foreground">{item.quantity}</span>
                              <span className="col-span-2 text-right font-bold">₹{item.subtotal.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-muted/10 p-4 border-t border-border/40 flex justify-between font-bold text-base">
                          <span className="uppercase text-xs tracking-wider text-muted-foreground mt-1">Total Paid</span>
                          <span className="text-primary font-heading text-lg">₹{selectedOrder.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Order List */
                    <div className="glass rounded-none p-6 md:p-8 border border-border/60">
                      <div className="flex items-center gap-3 justify-between border-b border-border/40 pb-4 mb-6">
                        <h3 className="text-xl font-bold tracking-wide">My Order History</h3>
                        <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-0.5 uppercase tracking-wider">{orders.length} orders</span>
                      </div>

                      {isOrdersLoading ? (
                        <div className="py-16 flex flex-col items-center justify-center">
                          <MandalaLoader size={36} />
                          <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider">Loading art acquisitions...</p>
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-border/70 p-6">
                          <ShoppingBag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                          <h4 className="font-heading text-lg font-bold text-foreground mb-2">No Acquisitions Found</h4>
                          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">You haven&apos;t ordered any handcrafted masterpieces from us yet.</p>
                          <Link href="/collection">
                            <Button className="bg-primary text-primary-foreground text-xs uppercase tracking-widest font-bold rounded-none h-11 px-6">Explore Art Collection</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/40">
                          {orders.map((order) => (
                            <div key={order.id} className="py-4 md:py-6 flex flex-col sm:flex-row justify-between gap-4 first:pt-0 last:pb-0 items-start sm:items-center">
                              <div className="space-y-1.5 text-left">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="font-mono text-sm font-bold text-foreground">{order.orderId}</span>
                                  <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground flex gap-4 items-center">
                                  <span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                                  <span>₹{order.total.toLocaleString()}</span>
                                </div>
                                <div className="text-xs font-semibold text-foreground/80">
                                  {order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                                </div>
                              </div>
                              <button 
                                onClick={() => setSelectedOrder(order)}
                                className="flex items-center gap-1.5 px-4 py-2 border border-border hover:border-primary text-xs font-bold tracking-widest uppercase transition-all rounded-none self-start sm:self-auto"
                              >
                                <Eye className="w-3.5 h-3.5" /> View & Track
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'addresses' && (
                <motion.div
                  key="addresses-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass rounded-none p-6 md:p-8 border border-border/60"
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                    <h3 className="text-xl font-bold tracking-wide">Saved Addresses</h3>
                    <Link href="/addresses" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:underline">
                      <MapPinned className="w-3.5 h-3.5" /> Manage Address Book
                    </Link>
                  </div>

                  {isAddressesLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center">
                      <MandalaLoader size={36} />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="w-10 h-10 text-muted-foreground/35 mx-auto mb-4" />
                      <h4 className="font-heading text-lg font-bold text-foreground mb-1">No Addresses Saved</h4>
                      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">Save details for an effortless checkout experience.</p>
                      <Link href="/addresses">
                        <Button className="bg-primary text-primary-foreground text-xs uppercase tracking-widest font-bold rounded-none h-11 px-6">Add New Address</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {addresses.map((addr) => (
                        <div 
                          key={addr.id}
                          className="border border-border/60 p-5 rounded-none flex flex-col justify-between hover:border-primary/20 transition-all text-left bg-muted/5"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2.5">
                              <span className="font-bold text-foreground">{addr.customerName}</span>
                              {addr.isDefault && (
                                <span className="bg-primary/10 border border-primary/20 text-primary text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">Default</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground/95 leading-relaxed space-y-0.5 font-light">
                              <p>{addr.addressLine1}</p>
                              {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                              <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                              <p className="flex items-center gap-1 mt-2.5 font-semibold text-foreground/80"><Phone className="w-3 h-3 text-primary shrink-0" /> {addr.phone}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </main>
  );
}
