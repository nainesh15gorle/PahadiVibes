"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, Plus, Minus, ShoppingBag, ArrowLeft, 
  CheckCircle2, CreditCard, Truck, ShieldCheck, 
  ChevronRight, AlertCircle, ShoppingCart, MapPin, 
  Edit, Check, User, Mail, Phone, Globe
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { useToast } from "@/components/ui/Toast";

export default function CartPage() {
  const { cart, setCart, updateQuantity, removeFromCart, clearCart, cartTotal, totalItems, isLoaded } = useCart();
  const { toast } = useToast();
  
  // Steps: "cart" | "shipping" | "review" | "success"
  const [step, setStep] = useState<"cart" | "shipping" | "review" | "success">("cart");
  const [loading, setLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Guest Address State
  const [guestAddress, setGuestAddress] = useState<any | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(true);
  
  const [addressForm, setAddressForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    country: "India",
  });

  const [addressFormErrors, setAddressFormErrors] = useState<Record<string, string>>({});

  // Dynamic Razorpay Script Loader
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Fetch latest stock for all items in the cart on load
  const stockSyncedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || cart.length === 0 || stockSyncedRef.current) return;
    stockSyncedRef.current = true;

    const fetchLatestStock = async () => {
      try {
        let hasChanges = false;
        const updatedCartItems = await Promise.all(
          cart.map(async (item) => {
            try {
              const res = await fetch(`/api/products/${item.id}`);
              const data = await res.json();
              if (data.success && data.data) {
                const latestStock = Number(data.data.stock);
                if (item.stock !== latestStock) {
                  hasChanges = true;
                }
                const newQty = latestStock === 0 ? 0 : Math.min(item.quantity, latestStock);
                if (newQty !== item.quantity) {
                  hasChanges = true;
                }
                return {
                  ...item,
                  stock: latestStock,
                  quantity: newQty
                };
              }
            } catch (err) {
              console.error(`Error fetching stock for product ${item.id}:`, err);
            }
            return item;
          })
        );

        if (hasChanges) {
          const filteredItems = updatedCartItems.filter((item) => item.quantity > 0);
          setCart(filteredItems);
        }
      } catch (error) {
        console.error("Failed to fetch latest stock for cart items", error);
      }
    };

    fetchLatestStock();
  }, [isLoaded, cart, setCart]);

  // Address Form Actions
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
    if (addressFormErrors[name]) {
      setAddressFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateAddressForm = () => {
    const errors: Record<string, string> = {};
    if (!addressForm.customerName.trim()) errors.customerName = "Full Name is required";
    else if (addressForm.customerName.length < 2) errors.customerName = "Name must be at least 2 characters";

    if (!addressForm.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(addressForm.email)) errors.email = "Please enter a valid email address";

    if (!addressForm.phone.trim()) errors.phone = "Phone number is required";
    else if (addressForm.phone.replace(/\D/g, "").length < 10) errors.phone = "Please enter a valid 10-digit phone number";

    if (!addressForm.addressLine1.trim()) errors.addressLine1 = "Address Line 1 is required";
    else if (addressForm.addressLine1.length < 5) errors.addressLine1 = "Address must be at least 5 characters";

    if (!addressForm.city.trim()) errors.city = "City is required";
    if (!addressForm.state.trim()) errors.state = "State is required";
    
    if (!addressForm.pincode.trim()) errors.pincode = "PIN Code is required";
    else if (addressForm.pincode.length < 6) errors.pincode = "PIN Code must be 6 digits";

    if (!addressForm.country.trim()) errors.country = "Country is required";

    setAddressFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddressForm()) return;

    setGuestAddress({
      ...addressForm,
      fullName: addressForm.customerName,
    });
    setIsEditingAddress(false);
    setStep("review");
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setOrderError(null);
    
    // 1. Load Razorpay Script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast("Failed to load payment gateway. Please check your internet connection.", "error");
      setLoading(false);
      return;
    }

    if (!guestAddress) {
      setOrderError("Please specify a shipping address.");
      toast("Please specify a shipping address.", "error");
      setLoading(false);
      return;
    }

    // 2. Prepare items payload
    const itemsPayload = cart.map((item) => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      price: item.price
    }));

    try {
      toast("Initializing checkout with Razorpay...", "info");
      // 3. Create Razorpay Order on backend
      const orderRes = await fetch("/api/checkout/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload })
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        setOrderError(orderData.error || "Failed to initialize payment");
        toast(orderData.error || "Failed to initialize payment", "error");
        setLoading(false);
        return;
      }

      // 4. Trigger Razorpay Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Pahadi Vibes",
        description: "Luxury Handmade Art & Decor",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // On Payment Success, call verify-payment API
          setLoading(true);
          try {
            toast("Payment received. Verifying order details...", "info");
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                customerDetails: {
                  fullName: guestAddress.fullName || guestAddress.customerName,
                  email: guestAddress.email,
                  phone: guestAddress.phone,
                  addressLine1: guestAddress.addressLine1,
                  addressLine2: guestAddress.addressLine2 || "",
                  city: guestAddress.city,
                  state: guestAddress.state,
                  pincode: guestAddress.pincode,
                  landmark: guestAddress.landmark || "",
                  country: guestAddress.country || "India"
                },
                items: itemsPayload,
                total: cartTotal,
                userId: null
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setCreatedOrder(verifyData.data);
              clearCart();
              toast("Order placed successfully!", "success");
              setStep("success");
            } else {
              setOrderError(verifyData.error || "Payment verification failed.");
              toast(verifyData.error || "Payment verification failed.", "error");
            }
          } catch (err) {
            console.error("Verification error:", err);
            setOrderError("Verification failed due to a network error.");
            toast("Verification failed due to a network error.", "error");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: guestAddress.fullName || guestAddress.customerName,
          email: guestAddress.email,
          contact: guestAddress.phone,
        },
        theme: {
          color: "#854d0e" // Gold luxury brand color matching Pahadi Vibes
        },
        modal: {
          ondismiss: function () {
            toast("Payment cancelled by customer.", "warning");
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast(`Payment failed: ${response.error.description}`, "error");
      });
      rzp.open();

    } catch (err) {
      console.error("Order creation error:", err);
      setOrderError("Failed to initiate checkout. Please try again.");
      toast("Failed to initiate checkout.", "error");
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <main className="flex-1 w-full bg-background pt-48 md:pt-56 pb-20 flex flex-col items-center justify-center min-h-[70vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">Opening Checkout...</p>
      </main>
    );
  }

  // Horizontal Step Progress Indicator
  const checkoutSteps = [
    { id: "cart", label: "Cart" },
    { id: "shipping", label: "Shipping" },
    { id: "review", label: "Review" },
  ];

  const currentStepIndex = checkoutSteps.findIndex((s) => s.id === step);

  return (
    <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 font-sans">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/cart" className="hover:text-primary transition-colors">Cart</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground capitalize">{step === "success" ? "Confirmation" : step}</span>
        </nav>

        {/* Step Progress Bar (Only show if not success and cart has items) */}
        {step !== "success" && cart.length > 0 && (
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="relative flex justify-between items-center w-full">
              {/* Progress Line */}
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border z-0" />
              <div 
                className="absolute top-1/2 left-0 h-[2px] bg-primary z-0 transition-all duration-500" 
                style={{ width: `${(currentStepIndex / (checkoutSteps.length - 1)) * 100}%` }}
              />

              {checkoutSteps.map((s, index) => {
                const isActive = step === s.id;
                const isCompleted = currentStepIndex > index;
                return (
                  <div key={s.id} className="relative z-10 flex flex-col items-center">
                    <button
                      disabled={index > currentStepIndex + 1}
                      onClick={() => {
                        if (index === 0) setStep("cart");
                        else if (index === 1 && currentStepIndex >= 1) {
                          setIsEditingAddress(true);
                          setStep("shipping");
                        }
                        else if (index === 2 && guestAddress) setStep("review");
                      }}
                      className={`w-8 h-8 rounded-none border flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                        isActive 
                          ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md shadow-primary/20" 
                          : isCompleted 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "bg-background border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </button>
                    <span className={`text-[10px] uppercase tracking-wider font-bold mt-2.5 transition-colors duration-500 ${
                      isActive ? "text-primary font-black" : "text-muted-foreground"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* EMPTY STATE */}
          {cart.length === 0 && step !== "success" && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 px-4 flex flex-col items-center justify-center glass rounded-none max-w-2xl mx-auto shadow-xl shadow-black/5"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 animate-pulse">
                <ShoppingCart className="w-10 h-10" />
              </div>
              <h1 className="font-heading text-3xl font-bold mb-4">Your Cart is Empty</h1>
              <p className="text-muted-foreground mb-8 max-w-md leading-relaxed text-sm">
                It looks like you haven&apos;t added any of our handcrafted masterpieces to your cart yet. Let&apos;s find something beautiful for your home!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/collection">
                  <Button className="px-8 h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-medium rounded-none uppercase tracking-widest text-xs">
                    Explore Art Pieces
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* STEP 1: CART VIEW */}
          {cart.length > 0 && step === "cart" && (
            <motion.div 
              key="cart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Cart Items List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                  <h1 className="font-heading text-2xl md:text-3xl font-bold">Shopping Cart ({totalItems})</h1>
                  <button 
                    onClick={clearCart}
                    className="text-sm text-destructive hover:underline flex items-center gap-1 font-medium transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="space-y-4">
                  {cart.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="glass rounded-none p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm border border-border/60"
                    >
                      <div className="flex gap-4 items-center w-full sm:w-auto">
                        <div className="relative w-20 sm:w-24 h-20 sm:h-24 bg-card border border-border/50 flex-shrink-0 overflow-hidden rounded-none">
                          <Image 
                            src={item.image || "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a?q=80&w=200&auto=format&fit=crop"} 
                            alt={item.name} 
                            fill 
                            className="object-cover" 
                          />
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-lg text-foreground hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-primary font-semibold mt-1">₹{item.price.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0">
                        {/* Quantity Selector */}
                        <div className="flex items-center border border-border h-10 flex-1 sm:w-28 rounded-none">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex-1 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="flex-1 text-center font-semibold text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.stock !== undefined && item.quantity >= item.stock}
                            className="flex-1 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="font-semibold text-lg hidden md:block min-w-[90px] text-right">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </span>

                        {/* Remove Button */}
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-muted-foreground hover:text-destructive p-2 h-10 w-10 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-destructive/10 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Order Summary Card */}
              <div className="lg:col-span-1">
                <div className="glass rounded-none p-4 sm:p-6 shadow-md border-border/60 sticky top-28 space-y-6">
                  <h2 className="font-heading text-xl font-bold border-b border-border pb-3">Order Summary</h2>
                  
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Subtotal ({totalItems} items)</span>
                      <span className="font-medium text-foreground">₹{cartTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        Shipping
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Free</span>
                      </span>
                      <span className="font-medium text-primary uppercase text-xs tracking-wider">Free Shipping</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 flex justify-between font-bold text-lg">
                    <span>Total Amount</span>
                    <span className="text-primary font-heading">₹{cartTotal.toLocaleString()}</span>
                  </div>

                  <div className="space-y-4">
                    <Button 
                      onClick={() => {
                        setStep("shipping");
                      }}
                      className="w-full h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px]"
                    >
                      Proceed to Checkout
                    </Button>
                    <Link href="/collection" className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1">
                      Continue Shopping
                    </Link>
                  </div>

                  {/* Trust guarantees */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex gap-3 items-start text-xs text-muted-foreground">
                      <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
                      <p><span className="font-medium text-foreground">100% Authentic Art:</span> Directly sourced from local Indian craftsmen.</p>
                    </div>
                    <div className="flex gap-3 items-start text-xs text-muted-foreground">
                      <Truck className="w-5 h-5 text-primary flex-shrink-0" />
                      <p><span className="font-medium text-foreground">Secure Transit:</span> Dispatched with extra-care shock-absorbent packaging.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SHIPPING ADDRESS VIEW */}
          {cart.length > 0 && step === "shipping" && (
            <motion.div 
              key="shipping"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2">
                <div className="glass rounded-none p-4 sm:p-6 md:p-8 shadow-sm border border-border/60">
                  <div className="flex items-center gap-3 mb-6 border-b border-border pb-4 justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setStep("cart")}
                        className="p-1 hover:text-primary transition-colors text-muted-foreground animate-none"
                        aria-label="Back to cart"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h1 className="font-heading text-2xl font-bold">Shipping Address</h1>
                    </div>
                  </div>

                  {isEditingAddress || !guestAddress ? (
                    /* GUEST ADDRESS FORM */
                    <form onSubmit={handleAddressSubmit} className="space-y-6">
                      <h2 className="text-lg font-bold tracking-wide border-b border-border/40 pb-2">
                        Guest Shipping Address
                      </h2>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="customerName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
                          <input
                            type="text"
                            id="customerName"
                            name="customerName"
                            value={addressForm.customerName}
                            onChange={handleAddressInputChange}
                            className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.customerName ? 'border-destructive' : 'border-border'}`}
                            placeholder="e.g. Naina Rawat"
                          />
                          {addressFormErrors.customerName && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.customerName}</span>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={addressForm.email}
                            onChange={handleAddressInputChange}
                            className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.email ? 'border-destructive' : 'border-border'}`}
                            placeholder="naina@example.com"
                          />
                          {addressFormErrors.email && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.email}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Phone */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={addressForm.phone}
                            onChange={handleAddressInputChange}
                            className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.phone ? 'border-destructive' : 'border-border'}`}
                            placeholder="10-digit mobile number"
                          />
                          {addressFormErrors.phone && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.phone}</span>}
                        </div>
                        
                        {/* Country */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="country" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Country</label>
                          <input
                            type="text"
                            id="country"
                            name="country"
                            value={addressForm.country}
                            onChange={handleAddressInputChange}
                            className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.country ? 'border-destructive' : 'border-border'}`}
                            placeholder="India"
                          />
                          {addressFormErrors.country && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.country}</span>}
                        </div>
                      </div>

                      {/* Address Line 1 */}
                      <div className="flex flex-col gap-2">
                        <label htmlFor="addressLine1" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address Line 1</label>
                        <input
                          type="text"
                          id="addressLine1"
                          name="addressLine1"
                          value={addressForm.addressLine1}
                          onChange={handleAddressInputChange}
                          className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.addressLine1 ? 'border-destructive' : 'border-border'}`}
                          placeholder="Flat, House no., Building, Company, Apartment"
                        />
                        {addressFormErrors.addressLine1 && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.addressLine1}</span>}
                      </div>

                      {/* Address Line 2 */}
                      <div className="flex flex-col gap-2">
                        <label htmlFor="addressLine2" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address Line 2 (Optional)</label>
                        <input
                          type="text"
                          id="addressLine2"
                          name="addressLine2"
                          value={addressForm.addressLine2}
                          onChange={handleAddressInputChange}
                          className="h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none"
                          placeholder="Area, Colony, Street, Sector, Village"
                        />
                      </div>

                      {/* Landmark */}
                      <div className="flex flex-col gap-2">
                        <label htmlFor="landmark" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Landmark (Optional)</label>
                        <input
                          type="text"
                          id="landmark"
                          name="landmark"
                          value={addressForm.landmark}
                          onChange={handleAddressInputChange}
                          className="h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none"
                          placeholder="e.g. Near Shiv Temple"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* City */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</label>
                          <input
                            type="text"
                            id="city"
                            name="city"
                            value={addressForm.city}
                            onChange={handleAddressInputChange}
                            className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.city ? 'border-destructive' : 'border-border'}`}
                            placeholder="Dehradun"
                          />
                          {addressFormErrors.city && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.city}</span>}
                        </div>

                        {/* State */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="state" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</label>
                          <input
                            type="text"
                            id="state"
                            name="state"
                            value={addressForm.state}
                            onChange={handleAddressInputChange}
                            className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.state ? 'border-destructive' : 'border-border'}`}
                            placeholder="Uttarakhand"
                          />
                          {addressFormErrors.state && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.state}</span>}
                        </div>

                        {/* Pincode */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="pincode" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN Code</label>
                          <input
                            type="text"
                            id="pincode"
                            name="pincode"
                            value={addressForm.pincode}
                            onChange={handleAddressInputChange}
                            className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${addressFormErrors.pincode ? 'border-destructive' : 'border-border'}`}
                            placeholder="248001"
                          />
                          {addressFormErrors.pincode && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {addressFormErrors.pincode}</span>}
                        </div>
                      </div>

                      <div className="flex gap-4 border-t border-border/40 pt-6">
                        <Button 
                          type="submit"
                          disabled={loading}
                          className="px-8 h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/10"
                        >
                          Confirm & Continue
                        </Button>
                        {guestAddress && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsEditingAddress(false);
                            }}
                            className="px-8 h-12 border-border text-muted-foreground hover:bg-black/5 rounded-none uppercase tracking-widest text-xs"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  ) : (
                    /* GUEST ADDRESS CARD DISPLAY */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-5 border border-primary bg-primary/[0.03] shadow-md relative transition-all duration-300 flex flex-col justify-between rounded-none text-left">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-sm text-foreground leading-none">{guestAddress.customerName}</h3>
                                <span className="text-[10px] text-muted-foreground font-medium">{guestAddress.email}</span>
                              </div>
                              <span className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider leading-none">
                                Selected Shipping Address
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground/90 space-y-0.5 leading-relaxed font-light mb-6">
                              <p>{guestAddress.addressLine1}</p>
                              {guestAddress.addressLine2 && <p>{guestAddress.addressLine2}</p>}
                              {guestAddress.landmark && <p className="text-primary/70 font-normal">Landmark: {guestAddress.landmark}</p>}
                              <p>{guestAddress.city}, {guestAddress.state} - <span className="font-semibold">{guestAddress.pincode}</span></p>
                              <p className="flex items-center gap-1.5 mt-2 font-medium text-foreground/80"><Phone className="w-3 h-3 text-primary" /> {guestAddress.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 border-t border-border/40 pt-3 mt-auto">
                            <button
                              onClick={() => {
                                setIsEditingAddress(true);
                              }}
                              className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" /> Edit Address Details
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between border-t border-border/40 pt-6 mt-4">
                        <button 
                          onClick={() => setStep("cart")}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium bg-transparent border-0 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> Edit Cart
                        </button>
                        
                        <Button 
                          onClick={() => setStep("review")}
                          className="h-12 px-10 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                          Proceed to Review <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary card right side */}
              <div className="lg:col-span-1">
                <div className="glass rounded-none p-4 sm:p-6 shadow-md border-border/60 sticky top-28 space-y-6">
                  <h2 className="font-heading text-xl font-bold border-b border-border pb-3">Order Items</h2>
                  
                  <div className="max-h-64 overflow-y-auto divide-y divide-border/40 pr-2">
                    {cart.map((item) => (
                      <div key={item.id} className="py-3 flex gap-3 items-center">
                        <div className="relative w-12 h-12 bg-card border border-border/40 overflow-hidden rounded flex-shrink-0">
                          <Image src={item.image || "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a?q=80&w=100&auto=format&fit=crop"} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="text-sm font-bold truncate text-foreground">{item.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4 flex justify-between font-bold text-lg">
                    <span>Total Amount</span>
                    <span className="text-primary font-heading">₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ORDER REVIEW VIEW */}
          {cart.length > 0 && step === "review" && guestAddress && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                {/* Shipping Review */}
                <div className="glass rounded-none p-4 sm:p-6 md:p-8 shadow-sm border border-border/60">
                  <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                    <h2 className="font-heading text-xl font-bold">Shipping Address Details</h2>
                    <button 
                      onClick={() => {
                        setIsEditingAddress(true);
                        setStep("shipping");
                      }}
                      className="text-xs text-primary hover:underline font-bold uppercase tracking-wider flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-foreground/80 leading-relaxed font-light text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Recipient</span>
                      <p className="font-bold text-foreground">{guestAddress.fullName || guestAddress.customerName}</p>
                      <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" /> {guestAddress.phone}</p>
                      <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" /> {guestAddress.email}</p>
                    </div>
 
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Delivery Location</span>
                      <p>{guestAddress.addressLine1}</p>
                      {guestAddress.addressLine2 && <p>{guestAddress.addressLine2}</p>}
                      {guestAddress.landmark && <p className="text-primary/70">Landmark: {guestAddress.landmark}</p>}
                      <p>{guestAddress.city}, {guestAddress.state} - <span className="font-semibold">{guestAddress.pincode}</span></p>
                    </div>
                  </div>
                </div>

                {/* Items Review */}
                <div className="glass rounded-none p-4 sm:p-6 md:p-8 shadow-sm border border-border/60">
                  <h2 className="font-heading text-xl font-bold border-b border-border pb-3 mb-4">Review Items in Order</h2>
                  
                  <div className="divide-y divide-border/40">
                    {cart.map((item) => (
                      <div key={item.id} className="py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex gap-4 items-center">
                          <div className="relative w-16 h-16 bg-card border border-border/40 overflow-hidden rounded-none flex-shrink-0">
                            <Image src={item.image || "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a?q=80&w=150&auto=format&fit=crop"} alt={item.name} fill className="object-cover" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-base text-foreground leading-snug">{item.name}</h4>
                            <span className="text-xs text-primary font-semibold">₹{item.price.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-12 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                          <span className="text-xs text-muted-foreground">Quantity: <span className="font-bold text-foreground">{item.quantity}</span></span>
                          <span className="font-bold text-base text-foreground text-right min-w-[90px]">₹{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between border-t border-border/40 pt-6 mt-4">
                    <button 
                      onClick={() => setStep("shipping")}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium bg-transparent border-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Shipping Address
                    </button>
                    
                    <Button 
                      onClick={handlePlaceOrder}
                      disabled={loading}
                      className="h-12 px-10 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Place Order & Pay <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Billing Summary right side */}
              <div className="lg:col-span-1">
                <div className="glass rounded-none p-4 sm:p-6 shadow-md border-border/60 sticky top-28 space-y-6">
                  <h2 className="font-heading text-xl font-bold border-b border-border pb-3">Billing Summary</h2>
                  
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Order Subtotal</span>
                      <span className="font-medium text-foreground">₹{cartTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping Fees</span>
                      <span className="font-medium text-primary uppercase text-xs tracking-wider">Free</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 flex justify-between font-bold text-lg">
                    <span>Total Amount</span>
                    <span className="text-primary font-heading">₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PREMIUM SUCCESS CONFIRMATION VIEW */}
          {step === "success" && createdOrder && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto glass rounded-none p-8 md:p-12 text-center shadow-2xl relative overflow-hidden border border-border/60"
            >
              {/* Gold light burst animation background */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <span className="text-xs font-semibold text-primary tracking-widest uppercase mb-2 block font-sans">Payment Successful</span>
              <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-foreground">Order Confirmed!</h1>
              <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed text-sm">
                Thank you for your purchase. We have received your payment via Razorpay. Our artisans have been notified and are preparing your handcrafted masterpiece.
              </p>

              {/* Order Info Details */}
              <div className="border border-border/80 bg-background/50 rounded-none p-6 text-left mb-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between border-b border-border/50 pb-3 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Order ID</span>
                    <p className="text-sm font-bold font-mono text-foreground mt-0.5 truncate">{createdOrder.id}</p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Payment Method</span>
                    <p className="text-sm font-bold text-primary mt-0.5 uppercase tracking-wide">Razorpay (Paid)</p>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-b border-border/50 pb-4">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Order Summary</span>
                  <div className="divide-y divide-border/30 max-h-44 overflow-y-auto pr-1">
                    {createdOrder.items && createdOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="py-2 flex justify-between text-xs text-foreground/90 font-sans">
                        <span>
                          {item.productName} <span className="text-muted-foreground ml-1">× {item.quantity}</span>
                        </span>
                        <span className="font-semibold font-mono">₹{Number(item.subtotal || item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/50 pb-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Shipping Address</span>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">
                      <span className="font-bold">{createdOrder.customerName}</span><br />
                      {createdOrder.address},<br />
                      {createdOrder.city}, {createdOrder.state} - {createdOrder.pincode}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Estimated Delivery</span>
                    <p className="text-xs text-primary font-bold mt-1.5 flex items-center gap-1.5">
                      <Truck className="w-4 h-4" /> 5 - 7 Business Days
                    </p>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-base">
                  <span className="text-muted-foreground font-semibold">Total Amount paid</span>
                  <span className="text-primary font-heading">₹{Number(createdOrder.total).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/collection">
                  <Button className="w-full sm:w-auto px-8 h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-medium rounded-none uppercase tracking-widest text-xs shadow-md shadow-primary/10">
                    Continue Shopping
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full sm:w-auto px-8 h-12 border-primary text-primary hover:bg-primary/5 font-medium rounded-none uppercase tracking-widest text-xs">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
