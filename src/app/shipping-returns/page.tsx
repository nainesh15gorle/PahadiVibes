"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Truck, RotateCcw, Coins, XCircle, RefreshCw, 
  HelpCircle, Mail, Phone, ChevronDown, Check, 
  AlertCircle, ShieldAlert, Sparkles, Compass, Package
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Helper components
interface PolicyCardProps {
  title: string;
  icon: React.ComponentType<any>;
  badgeText?: string;
  badgeColor?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function PolicyCard({ title, icon: Icon, badgeText, badgeColor, isOpen, onToggle, children }: PolicyCardProps) {
  return (
    <motion.div 
      layout="position"
      className="border border-border/50 bg-card/75 dark:bg-card/40 backdrop-blur-md p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-[#primary]/20 transition-all duration-300 flex flex-col justify-between h-full"
    >
      <div 
        className="flex items-start justify-between cursor-pointer md:cursor-default"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/5 text-primary rounded-xl border border-primary/10">
            <Icon className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
            {badgeText && (
              <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 md:mt-0 md:ml-2 ${badgeColor}`}>
                {badgeText}
              </span>
            )}
          </div>
        </div>
        <div className="md:hidden p-1 rounded-full hover:bg-muted/50 transition-colors">
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </div>
      
      <AnimatePresence initial={false}>
        {(isOpen || typeof window !== "undefined" && window.innerWidth >= 768) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden md:!opacity-100 md:!h-auto"
          >
            <div className="mt-5 space-y-4 text-sm text-muted-foreground leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ShippingReturnsPage() {
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Smooth scroll to anchor on load
    if (window.location.hash) {
      const element = document.getElementById(window.location.hash.substring(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, []);

  const toggleAccordion = (section: string) => {
    setActiveAccordion(activeAccordion === section ? null : section);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  const timelineSteps = [
    { title: "Order Delivered", desc: "Acquisition reaches customer", icon: Package },
    { title: "Report Within 48h", desc: "Email support with photo proofs", icon: ShieldAlert, highlight: true },
    { title: "Verification", desc: "Artisans assess damage details", icon: Compass },
    { title: "Approval", desc: "Claim confirmed in 2-3 business days", icon: Check },
    { title: "Refund/Dispatched", desc: "Funds returned or new art sent", icon: Coins }
  ];

  const faqs = [
    {
      q: "Are shipping charges included in my order?",
      a: "Yes, standard shipping is entirely complimentary across India. For international orders, shipping fees are calculated at checkout based on destination and package weight."
    },
    {
      q: "Do you ship your handcrafted products internationally?",
      a: "Yes, we ship globally. International deliveries normally take 14–21 business days. Custom duty charges, if applicable, are to be borne by the customer."
    },
    {
      q: "What should I do if my mandala/aipan canvas arrives damaged?",
      a: "Due to the fragile nature of canvas, wood, and ceramic artwork, we package them with extreme care. In the rare event of transit damage, please report it within 48 hours of delivery at support@pahadivibes.com with photos/videos of the package. We will dispatch a replacement immediately."
    },
    {
      q: "Can I cancel my order after it has been placed?",
      a: "Orders can be cancelled free of charge within 24 hours of placement. Beyond 24 hours, cancellations cannot be accepted as our artisans begin sketching, preparing, and treating materials for your custom canvas."
    },
    {
      q: "Can I request custom colors or sizes for Mandala art?",
      a: "Absolutely. We welcome bespoke orders. Please visit our Contact Us page or drop an email to discuss custom sizing, color schemes, and sacred geometry requirements directly with our master artisans."
    }
  ];

  return (
    <main className="flex-1 w-full bg-background pt-28 md:pt-36 pb-20 relative overflow-hidden font-sans">
      
      {/* Decorative Aipan/Mandala Background Accents */}
      <div className="absolute top-0 right-0 w-[450px] md:w-[650px] h-[450px] md:h-[650px] text-primary/5 pointer-events-none transform translate-x-1/4 -translate-y-1/4 z-0">
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="45" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="40" strokeWidth="0.1" strokeDasharray="1,1" />
          <circle cx="50" cy="50" r="30" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="20" strokeWidth="0.15" />
          <path d="M 50 5 L 50 95 M 5 50 L 95 50 M 18.2 18.2 L 81.8 81.8 M 18.2 81.8 L 81.8 18.2" strokeWidth="0.1" />
          <polygon points="50,15 60,35 80,40 60,45 50,65 40,45 20,40 40,35" strokeWidth="0.2" />
          <polygon points="50,25 56,38 69,40 56,42 50,55 44,42 31,40 44,38" strokeWidth="0.15" />
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 w-[400px] md:w-[550px] h-[400px] md:h-[550px] text-primary/5 pointer-events-none transform -translate-x-1/4 translate-y-1/4 z-0">
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="45" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="32" strokeWidth="0.1" strokeDasharray="2,2" />
          <circle cx="50" cy="50" r="22" strokeWidth="0.2" />
          <path d="M 50 5 L 50 95 M 5 50 L 95 50" strokeWidth="0.1" />
          <polygon points="50,10 61,39 90,50 61,61 50,90 39,61 10,50 39,39" strokeWidth="0.15" />
        </svg>
      </div>

      <div className="container mx-auto px-5 relative z-10 max-w-6xl">
        
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-16 md:mb-20"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Customer Care
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4">
            Support Console
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Read details about shipping schedules, return procedures, customization policies, and customer support channels.
          </p>
        </motion.div>

        {/* Policy Cards Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-16"
        >
          {/* Shipping Card */}
          <motion.div variants={itemVariants}>
            <PolicyCard 
              title="Shipping Policy" 
              icon={Truck} 
              badgeText="Free Delivery (IN)" 
              badgeColor="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              isOpen={activeAccordion === "shipping"}
              onToggle={() => toggleAccordion("shipping")}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Order Processing Time</h4>
                  <p>Standard items are dispatched within 2–3 business days. Custom orders or personalized paintings require an additional 2 days for sketching and curing.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Estimated Delivery Time</h4>
                  <p>Domestic orders across India arrive within <span className="font-semibold text-foreground">7–10 Business Days</span>. We dispatch via premium air cargo agencies to prevent handling damages.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Shipping Charges</h4>
                  <p>Complimentary shipping is automatically applied to all orders inside India. International shipping rates are calculated at checkout based on location.</p>
                </div>
              </div>
            </PolicyCard>
          </motion.div>

          {/* Return Card */}
          <motion.div variants={itemVariants}>
            <PolicyCard 
              title="Return Policy" 
              icon={RotateCcw} 
              badgeText="7-Day Window" 
              badgeColor="bg-primary/10 text-primary border-primary/20"
              isOpen={activeAccordion === "return"}
              onToggle={() => toggleAccordion("return")}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Return Eligibility</h4>
                  <p>Returns are accepted within 7 days of delivery <span className="font-semibold text-foreground">only if the item arrives damaged in transit or is incorrect</span>. Items must remain in their original luxury box.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Exclusion List</h4>
                  <p>Customized artwork, personalized sizes, and specific color-commissioned mandalas are strictly <span className="font-semibold text-[#C8A951]">non-returnable</span>.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Return Shipping</h4>
                  <p>For approved transit damage claims, we arrange reverse pickup from your address at no additional cost.</p>
                </div>
              </div>
            </PolicyCard>
          </motion.div>

          {/* Refund Card */}
          <motion.div variants={itemVariants}>
            <PolicyCard 
              title="Refund Policy" 
              icon={Coins} 
              badgeText="7-10 Business Days" 
              badgeColor="bg-amber-500/10 text-amber-600 border-amber-500/20"
              isOpen={activeAccordion === "refund"}
              onToggle={() => toggleAccordion("refund")}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Refund Method</h4>
                  <p>Approved refunds are processed back to the original source account. For Cash on Delivery (COD) orders, refunds are credited via bank transfer.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Refund Timeline</h4>
                  <p>Once the returned product reaches our workshop and passes inspection, the refund is processed within <span className="font-semibold text-foreground">7–10 Business Days</span>.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Damaged/Defective Claims</h4>
                  <p>Requires submitting photo/video proof within 48 hours of delivery. A replacement or refund will be initiated immediately upon confirmation.</p>
                </div>
              </div>
            </PolicyCard>
          </motion.div>

          {/* Cancellation Card */}
          <motion.div variants={itemVariants}>
            <PolicyCard 
              title="Cancellation Policy" 
              icon={XCircle} 
              badgeText="Within 24 Hours" 
              badgeColor="bg-red-500/10 text-red-600 border-red-500/20"
              isOpen={activeAccordion === "cancellation"}
              onToggle={() => toggleAccordion("cancellation")}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Cancellation Window</h4>
                  <p>You can request order cancellation within <span className="font-semibold text-foreground">24 hours</span> of purchase. Full refund is processed automatically.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Processing Lock</h4>
                  <p>Cancellations are not accepted once sketching or material treatment begins, as materials are custom cut and prepared for each order.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">How to Cancel</h4>
                  <p>Please contact our support desk with your Order ID via email or phone call within the 24-hour limit.</p>
                </div>
              </div>
            </PolicyCard>
          </motion.div>

          {/* Exchange Card */}
          <motion.div variants={itemVariants} className="md:col-span-2">
            <PolicyCard 
              title="Exchange Policy" 
              icon={RefreshCw} 
              badgeText="Damaged Items Only" 
              badgeColor="bg-[#C8A951]/10 text-[#a9843d] border-[#C8A951]/20"
              isOpen={activeAccordion === "exchange"}
              onToggle={() => toggleAccordion("exchange")}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Exchange Conditions</h4>
                  <p>We only exchange items if they are received damaged or defective. Due to the handcrafted, limited nature of our catalog, standard exchanges for size/preference are not available.</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground uppercase text-xs tracking-wider mb-1">Custom Order Exchanges</h4>
                  <p>Bespoke pieces created from user-submitted canvas choices or specific color tones are entirely excluded from exchanges unless received damaged.</p>
                </div>
              </div>
            </PolicyCard>
          </motion.div>
        </motion.div>

        {/* Handmade Disclaimer Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border border-[#C8A951]/20 bg-gradient-to-r from-[#C8A951]/5 to-transparent p-6 md:p-8 rounded-2xl mb-16 flex flex-col md:flex-row gap-5 items-center text-center md:text-left relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
               style={{ 
                 backgroundImage: "radial-gradient(circle, var(--primary) 1px, transparent 1.5px)", 
                 backgroundSize: "20px 20px" 
               }} 
          />
          <div className="p-3 bg-[#C8A951]/10 text-primary rounded-full border border-[#C8A951]/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-1">Handcrafted Art Disclaimer</h3>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              Every creation at Pahadi Vibes is painstakingly hand-sketched and detailed by traditional Indian artists. Minor variations in wood grain, geometric pattern symmetry, and paint hues are natural characteristics of hand-painted artwork, rendering each piece a unique, single-edition masterpiece.
            </p>
          </div>
        </motion.div>

        {/* Vertical Refund Timeline Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-card/40 border border-border/50 rounded-2xl p-6 md:p-10 mb-16 text-center"
        >
          <h3 className="font-heading text-2xl md:text-3xl font-bold mb-3">Transit Damage Claim Workflow</h3>
          <p className="text-muted-foreground text-xs md:text-sm max-w-xl mx-auto mb-10">
            If your painting, ceramic, or glass art arrives with damage, here is our expedited timeline for resolution.
          </p>

          <div className="relative flex flex-col lg:flex-row justify-between items-center w-full max-w-4xl mx-auto gap-8 lg:gap-4 mt-4">
            
            {/* Horizontal line for desktop */}
            <div className="hidden lg:block absolute top-6 left-10 right-10 h-0.5 bg-[#C8A951]/20 z-0" />
            
            {/* Vertical line for mobile */}
            <div className="lg:hidden absolute left-[31px] top-6 bottom-6 w-0.5 bg-[#C8A951]/20 z-0" />

            {timelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div key={idx} className="relative z-10 flex flex-row lg:flex-col items-center gap-4 lg:gap-3 text-left lg:text-center w-full lg:w-44">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 shadow-sm shrink-0 ${
                    step.highlight 
                      ? "bg-primary border-primary text-primary-foreground scale-110 ring-4 ring-[#C8A951]/20" 
                      : "bg-background border-[#C8A951]/30 text-primary hover:border-primary"
                  }`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-foreground">{step.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[150px]">{step.desc}</p>
                  </div>
                </div>
              );
            })}

          </div>
        </motion.div>

        {/* FAQs Accordion */}
        <motion.div 
          id="faq" 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto mb-16 scroll-mt-28"
        >
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl font-bold mb-2">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-sm">Find quick answers about logistics, bespoke orders, and artisan crafts.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-border/50 bg-card/45 rounded-xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm md:text-base text-foreground focus:outline-none bg-transparent border-0 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: activeFaq === idx ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </button>
                
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/20 bg-muted/5">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto text-center bg-card/60 border border-border/60 p-8 rounded-2xl backdrop-blur-md relative"
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 p-3 bg-primary text-primary-foreground rounded-full shadow-lg border border-primary-foreground/20">
            <Mail className="w-5 h-5" />
          </div>
          
          <h3 className="font-heading text-xl font-bold mt-2 mb-2">Still Need Assistance?</h3>
          <p className="text-muted-foreground text-xs md:text-sm mb-6 max-w-sm mx-auto">
            Our artisan care team is ready to assist you with tracking, order changes, or transit damage claims.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@pahadivibes.com"
              className="flex items-center justify-center gap-2 px-5 py-3 border border-border hover:border-primary hover:bg-primary/5 transition-all text-xs font-bold uppercase tracking-wider text-foreground"
            >
              <Mail className="w-4 h-4 text-primary" /> support@pahadivibes.com
            </a>
            <a 
              href="tel:9622258757"
              className="flex items-center justify-center gap-2 px-5 py-3 border border-[#C8A951]/40 hover:border-primary bg-primary text-primary-foreground hover:opacity-90 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Phone className="w-4 h-4" /> Call 9622258757
            </a>
          </div>
        </motion.div>

      </div>
    </main>
  );
}
