"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Twitter, MapPin, Mail, Phone, Plus, Minus } from "lucide-react";
import { usePathname } from "next/navigation";

export function Footer() {
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  return (
    <footer className="relative bg-background pt-6 md:pt-16 pb-5 md:pb-10 overflow-hidden border-t border-border">
      {/* Subtle Mandala Background Pattern - using a subtle SVG pattern or radial gradient */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
           style={{ 
             backgroundImage: "radial-gradient(circle at center, var(--primary) 2px, transparent 2.5px)", 
             backgroundSize: "40px 40px" 
           }} 
      />

      <div className="container mx-auto px-5 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 lg:gap-8 mb-8 md:mb-16">
          
          {/* Brand Column */}
          <div className="border-b border-border/60 md:border-b-0 pb-6 md:pb-0 space-y-3 md:space-y-6 flex flex-col items-start text-left">
            <Link href="/" className="flex-shrink-0 inline-block mb-1">
              <Image 
                src="/logo-cropped.png" 
                alt="Pahadi Vibes Logo" 
                width={140} 
                height={42} 
                className="h-8 md:h-12 w-auto object-contain mix-blend-multiply" 
              />
            </Link>
            <p className="text-muted-foreground leading-relaxed text-xs md:text-sm pr-4 md:pr-0 max-w-sm">
              Elevating spaces with sacred geometry and traditional Indian Mandala and Aipan artistry. Discover pieces crafted with devotion and heritage.
            </p>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mt-1">
              <a href="tel:+917416610293" className="flex items-center gap-2 hover:text-primary transition-colors justify-start">
                <Phone className="w-3.5 h-3.5" /> +91 7416610293
              </a>
            </div>
            <div className="flex gap-3 mt-2">
              <a href="https://www.instagram.com/bhumijakaphaliya?igsh=dHl4aWh2M281YnRr" target="_blank" rel="noopener noreferrer" className="w-8.5 h-8.5 rounded-full bg-secondary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="border-b border-border/60 md:border-b-0 py-4 md:py-0 text-left">
            <button 
              type="button"
              onClick={() => setCollectionsOpen(!collectionsOpen)}
              className="w-full md:cursor-default flex justify-between items-center md:block font-heading text-sm font-bold text-foreground focus:outline-none"
            >
              <span>Collections</span>
              <span className="md:hidden">
                {collectionsOpen ? <Minus className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
              </span>
            </button>
            <ul className={`mt-2 md:mt-4 space-y-2 md:space-y-3 md:block ${collectionsOpen ? 'block' : 'hidden'}`}>
              {[
                { name: 'Mandala Wall Art', href: '/category/wall-art' },
                { name: 'Aipan Art', href: '/category/aipan-art' }
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors text-xs uppercase tracking-wider block py-1 md:py-0">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="border-b border-border/60 md:border-b-0 py-4 md:py-0 text-left">
            <button 
              type="button"
              onClick={() => setSupportOpen(!supportOpen)}
              className="w-full md:cursor-default flex justify-between items-center md:block font-heading text-sm font-bold text-foreground focus:outline-none"
            >
              <span>Support</span>
              <span className="md:hidden">
                {supportOpen ? <Minus className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
              </span>
            </button>
            <ul className={`mt-2 md:mt-4 space-y-2 md:space-y-3 md:block ${supportOpen ? 'block' : 'hidden'}`}>
              {[
                { name: 'Contact Us', href: '/contact' },
                { name: 'Shipping & Returns', href: '/shipping-returns' },
                { name: 'FAQ', href: '/shipping-returns#faq' }
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors text-xs uppercase tracking-wider block py-1 md:py-0">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-left">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Pahadi Vibes. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="text-muted-foreground text-xs">Crafted with ♥ in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
