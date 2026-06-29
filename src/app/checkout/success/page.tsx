"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Truck, Calendar, MapPin, User, ShoppingBag, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { useToast } from "@/components/ui/Toast";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface OrderDetails {
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
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("orderId");
  const phone = searchParams.get("phone");
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !phone) {
      setError("Missing Order ID or Phone number in the URL.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(
          `/api/orders/track?orderId=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`
        );
        const data = await res.json();
        if (data.success && data.data) {
          setOrder(data.data);
        } else {
          setError(data.error || "Failed to retrieve order details.");
        }
      } catch (err) {
        console.error("Fetch order success details error:", err);
        setError("A network error occurred while retrieving your order.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, phone]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">
          Securing your purchase confirmation...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold font-heading mb-4">Confirmation Error</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          {error || "We couldn't load your order confirmation. Please verify your connection."}
        </p>
        <Link href="/track">
          <Button className="w-full h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs">
            Go to Order Tracking
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto glass rounded-none p-6 md:p-10 text-center shadow-2xl relative overflow-hidden border border-border/60"
    >
      {/* Decorative Blur Background elements */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

      {/* Bounce checkmark success badge */}
      <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 animate-bounce" />
      </div>

      <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-2 block font-sans">
        Payment Verified Successfully
      </span>
      <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-foreground uppercase tracking-wide">
        Order Confirmed!
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed text-sm">
        Thank you for your purchase. We have successfully verified your payment via Razorpay. Our artisans are preparing your handcrafted masterpiece.
      </p>

      {/* Order Info Details Card */}
      <div className="border border-border/80 bg-background/50 rounded-none p-5 text-left mb-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between border-b border-border/50 pb-3 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Order ID
            </span>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5 truncate select-all">
              {order.id}
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Payment Status
            </span>
            <p className="text-sm font-bold text-primary mt-0.5 uppercase tracking-wide flex items-center gap-1.5 justify-end">
              <CreditCard className="w-3.5 h-3.5" /> Razorpay (Paid)
            </p>
          </div>
        </div>

        {/* Order Summary Itemized list */}
        <div className="border-b border-border/50 pb-4">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-2">
            Items in Order
          </span>
          <div className="divide-y divide-border/30 max-h-44 overflow-y-auto pr-1">
            {order.items &&
              order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between text-xs text-foreground/90 font-sans">
                  <span>
                    {item.productName}{" "}
                    <span className="text-muted-foreground ml-1">× {item.quantity}</span>
                  </span>
                  <span className="font-semibold font-mono text-foreground">
                    ₹{Number(item.subtotal || item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Shipping Address and Delivery time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/50 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
              Shipping Address
            </span>
            <p className="text-xs text-foreground leading-relaxed mt-1">
              <span className="font-bold flex items-center gap-1"><User className="w-3 h-3 text-primary" /> {order.customerName}</span>
              <span className="text-muted-foreground/90 block mt-1">
                {order.address},<br />
                {order.city}, {order.state} - {order.pincode}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
              Estimated Delivery
            </span>
            <p className="text-xs text-primary font-bold mt-1.5 flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> 5 - 7 Business Days
            </p>
            <p className="text-[10px] text-muted-foreground/80 leading-normal font-light">
              You will receive an update as soon as the package ships.
            </p>
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex justify-between font-bold text-base">
          <span className="text-muted-foreground font-semibold">Total Amount paid</span>
          <span className="text-primary font-heading text-lg">
            ₹{Number(order.total).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Navigation Options */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/collection" className="w-full sm:w-auto">
          <Button className="w-full px-8 h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-medium rounded-none uppercase tracking-widest text-xs shadow-md shadow-primary/10">
            Continue Shopping
          </Button>
        </Link>
        <Link href="/" className="w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full px-8 h-12 border-primary text-primary hover:bg-primary/5 font-medium rounded-none uppercase tracking-widest text-xs"
          >
            Back to Home
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function OrderSuccessPage() {
  return (
    <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 font-sans min-h-[80vh]">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
              <MandalaLoader size={48} />
              <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">
                Loading order verification...
              </p>
            </div>
          }
        >
          <SuccessPageContent />
        </Suspense>
      </div>
    </main>
  );
}
