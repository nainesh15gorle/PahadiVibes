"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ShoppingBag, Menu, X, Home, 
  Image as ImageIcon, Sparkles, Star, Mail, 
  ChevronRight, MapPin 
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { SearchOverlay } from "@/components/search/SearchOverlay";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  const { totalItems } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Mandala Wall Art", href: "/category/wall-art" },
    { name: "Aipan Art", href: "/category/aipan-art" },
    { name: "Track Order", href: "/track" },
    { name: "Contact Us", href: "/contact" },
  ];

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b h-[72px] md:h-auto flex items-center md:block ${
        scrolled
          ? "glass py-0 md:py-2.5"
          : "bg-transparent border-transparent py-0 md:py-3.5"
      }`}
    >
      <div className="container mx-auto px-5 md:px-8 h-full md:h-auto">
        <div className="flex items-center justify-between relative w-full h-full md:h-auto">
          
          {/* Mobile Menu Button */}
          <motion.button 
            whileTap={{ scale: 0.92 }}
            className="md:hidden w-11 h-11 flex items-center justify-center text-foreground/60 hover:text-primary transition-colors focus:outline-none"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 stroke-[1.5]" />
          </motion.button>

          {/* Logo */}
          <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:relative md:left-auto md:translate-x-0 md:top-auto md:translate-y-0 flex-shrink-0 z-10 flex items-center">
            <Image 
              src="/logo-cropped.png" 
              alt="Pahadi Vibes Logo" 
              width={560} 
              height={219} 
              className="w-auto object-contain transition-all duration-500 h-8 md:h-11 mix-blend-multiply" 
              priority 
              quality={95}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className="text-sm font-medium tracking-wide text-foreground/80 hover:text-primary transition-colors uppercase"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-3 relative z-10">
            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={() => setSearchOpen(true)}
              className="w-11 h-11 flex items-center justify-center text-foreground/75 hover:text-primary transition-colors focus:outline-none"
              aria-label="Search products"
            >
              <Search className="w-6 h-6 stroke-[1.5]" />
            </motion.button>
            
            <motion.div whileTap={{ scale: 0.92 }}>
              <Link href="/cart" className="w-11 h-11 flex items-center justify-center text-foreground/75 hover:text-primary transition-colors relative focus:outline-none" aria-label="Shopping Cart">
                <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                {totalItems > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold px-0.5">
                    {totalItems}
                  </span>
                )}
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay (Drawer) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden h-[100dvh]"
            />
            {/* Drawer Panel */}
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed left-0 top-0 bottom-0 z-50 bg-background flex flex-col md:hidden h-[100dvh] w-[82vw] max-w-[320px] border-r border-border/40 shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 flex justify-between items-center border-b border-border/40 flex-shrink-0 bg-background">
                <span className="font-heading text-lg font-bold tracking-wider uppercase ml-1">Collections</span>
                <button 
                  className="w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors focus:outline-none"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 no-scrollbar">
                
                {/* Navigation Links with Icons */}
                <nav className="flex flex-col gap-1">
                  {[
                    { name: "Home", href: "/", icon: Home },
                    { name: "Mandala Wall Art", href: "/category/wall-art", icon: ImageIcon },
                    { name: "Aipan Art", href: "/category/aipan-art", icon: Sparkles },
                    { name: "Best Sellers", href: "/category/wall-art", icon: Star },
                    { name: "Track Order", href: "/track", icon: MapPin },
                    { name: "Contact Us", href: "/contact", icon: Mail },
                  ].map((link, i) => {
                    const IconComponent = link.icon;
                    return (
                      <motion.div
                        key={link.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link 
                          href={link.href}
                          className="flex items-center justify-between py-2.5 px-2 text-foreground/90 hover:text-primary active:bg-primary/5 hover:bg-muted/40 transition-all group text-left"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className={`w-4.5 h-4.5 ${link.name === 'Best Sellers' ? 'text-amber-500 fill-amber-500' : 'text-foreground/50 group-hover:text-primary transition-colors'}`} />
                            <span className="text-sm font-heading font-medium tracking-wide">{link.name}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border/40 bg-muted/30 flex justify-center items-center gap-6 flex-shrink-0">
                <a href="https://www.instagram.com/bhumijakaphaliya?igsh=dHl4aWh2M281YnRr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-foreground/75 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </motion.header>
  );
}
