"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ShoppingBag, User, Menu, X, Home, 
  Image as ImageIcon, Sparkles, Star, Mail, 
  ChevronRight, MapPin, LayoutDashboard, LogOut 
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { SearchOverlay } from "@/components/search/SearchOverlay";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const { totalItems } = useCart();
  const { user, profile, isSignedIn, signOut } = useAuth();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: "Mandala Wall Art", href: "/category/wall-art" },
    { name: "Aipan Art", href: "/category/aipan-art" },
    { name: "Contact Us", href: "/contact" },
    ...(isSignedIn ? [{ name: "My Addresses", href: "/addresses" }] : []),
  ];

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  const handleLogoutClick = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    router.push("/");
  };

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
            
            {/* User Account Controls */}
            {isSignedIn ? (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="w-9 h-9 rounded-full overflow-hidden border border-primary/20 flex items-center justify-center hover:border-primary transition-colors cursor-pointer"
                  aria-label="User Menu"
                >
                  {profile?.profile_image ? (
                    <Image src={profile.profile_image} alt={profile.full_name} width={36} height={36} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2.5 w-60 bg-white dark:bg-[#1B1B1B] border border-border rounded-xl shadow-xl overflow-hidden z-50 transform origin-top-right"
                    >
                      <div className="px-4 py-3 bg-muted/20 border-b border-border/50 text-left">
                        <p className="text-xs font-bold text-foreground truncate">{profile?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
                      </div>
                      
                      <div className="py-1">
                        <Link 
                          href="/dashboard" 
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-left"
                        >
                          <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                          My Dashboard
                        </Link>
                        <Link 
                          href="/addresses" 
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-left border-t border-border/40"
                        >
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          My Addresses
                        </Link>
                        <button 
                          onClick={handleLogoutClick}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors font-medium text-left border-t border-border/40 bg-transparent border-0 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative group hidden md:block">
                <button className="w-11 h-11 flex items-center justify-center text-foreground/75 hover:text-primary transition-colors focus:outline-none" aria-label="User Account">
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#1B1B1B] border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden z-50 transform origin-top-right group-hover:scale-100 scale-95">
                  <Link href="/sign-in" className="block px-4 py-3 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-left">
                    Sign In
                  </Link>
                  <Link href="/sign-up" className="block px-4 py-3 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium border-t border-border/50 text-left">
                    Register
                  </Link>
                  <Link href="/admin/login" className="block px-4 py-3 text-sm text-[#C8A951] hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium border-t border-border/50 text-left">
                    Admin Login
                  </Link>
                </div>
              </div>
            )}

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
                
                {/* Account Section Card */}
                <div className="w-full text-left">
                  {isSignedIn ? (
                    <div className="bg-primary/5 p-3.5 border border-primary/10 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-primary/20 flex items-center justify-center">
                          {profile?.profile_image ? (
                            <Image src={profile.profile_image} alt={profile.full_name} width={36} height={36} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {profile?.full_name?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground truncate max-w-[120px]">{profile?.full_name}</h4>
                          <p className="text-[10px] text-muted-foreground">Artisan Patron</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <LayoutDashboard className="w-4 h-4" />
                        </Link>
                        <button onClick={handleLogoutClick} className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive border-0">
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/30 p-3.5 border border-border/40 rounded-xl space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Join Pahadi Vibes</h4>
                          <p className="text-[10px] text-muted-foreground">Save favorites & track orders</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)} className="h-8.5 bg-primary text-primary-foreground text-[10.5px] uppercase tracking-wider font-semibold flex items-center justify-center transition-all">
                          Sign In
                        </Link>
                        <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)} className="h-8.5 border border-primary/30 text-primary text-[10.5px] uppercase tracking-wider font-semibold flex items-center justify-center hover:bg-primary/5 transition-all">
                          Register
                        </Link>
                      </div>
                      <Link href="/admin/login" onClick={() => setMobileMenuOpen(false)} className="h-8.5 mt-2 border border-[#C8A951]/50 text-[#C8A951] text-[10.5px] uppercase tracking-wider font-semibold flex items-center justify-center hover:bg-[#C8A951]/10 transition-all">
                        Admin Login
                      </Link>
                    </div>
                  )}
                </div>

                <div className="h-px bg-border/40 w-full" />

                {/* Navigation Links with Icons */}
                <nav className="flex flex-col gap-1">
                  {[
                    { name: "Home", href: "/", icon: Home },
                    { name: "Mandala Wall Art", href: "/category/wall-art", icon: ImageIcon },
                    { name: "Aipan Art", href: "/category/aipan-art", icon: Sparkles },
                    { name: "Best Sellers", href: "/category/wall-art", icon: Star },
                    { name: "Contact Us", href: "/contact", icon: Mail },
                    ...(isSignedIn ? [{ name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard }] : []),
                    ...(isSignedIn ? [{ name: "My Addresses", href: "/addresses", icon: MapPin }] : []),
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
