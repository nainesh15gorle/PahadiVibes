"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Boxes,
  FolderTree,
  ShoppingBag,
  Users,
  Percent,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User as UserIcon
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Exclude admin login page from the dashboard shell layout
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Inventory", href: "/admin/inventory", icon: Boxes },
    { name: "Categories", href: "/admin/categories", icon: FolderTree },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Discounts", href: "/admin/discounts", icon: Percent },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    // Delete bypass cookie as well just in case
    document.cookie = "admin_bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    await signOut();
    router.push("/admin/login");
  };

  const getPageTitle = () => {
    const activeLink = navLinks.find(link => pathname.startsWith(link.href));
    return activeLink ? activeLink.name : "Admin Panel";
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C8A951]"></div>
      </div>
    );
  }

  const adminName = profile?.full_name || "Administrator";
  const adminFirstName = adminName.split(" ")[0];
  const adminImageUrl = profile?.profile_image;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1B1B1B] text-[#F5F5F5] border-r border-[#C8A951]/10">
      {/* Brand logo container */}
      <div className="p-6 flex items-center justify-between border-b border-[#C8A951]/10">
        <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="relative w-48 h-20 mix-blend-screen -ml-4" style={{ filter: 'invert(1) hue-rotate(180deg)' }}>
            <Image src="/logo.png" alt="Pahadi Vibes Logo" fill className="object-contain scale-[1.8]" priority />
          </div>
        </Link>
        <button className="lg:hidden text-[#F5F5F5] hover:text-[#C8A951] transition-colors" onClick={() => setMobileMenuOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/admin/dashboard" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium tracking-wide uppercase transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/5 text-[#C8A951] border-l-2 border-[#C8A951] shadow-[0_0_15px_rgba(200,169,81,0.05)]"
                  : "text-[#F5F5F5]/70 hover:text-[#F5F5F5] hover:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#C8A951]" : "text-[#F5F5F5]/50"}`} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Admin User Info & Logout */}
      <div className="p-4 border-t border-[#C8A951]/10 bg-black/10">
        <div className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl bg-white/5 border border-white/5">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[#C8A951]/30">
            {adminImageUrl ? (
              <Image src={adminImageUrl} alt="Admin profile" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#C8A951]/20 text-[#C8A951]">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-white truncate">{adminName}</p>
            <p className="text-[10px] text-[#C8A951] truncate">Super Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium tracking-wide uppercase text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 bg-transparent border-0 cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-red-400/70" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#121212] text-[#F5F5F5] font-sans antialiased overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Navbar */}
        <header className="h-16 md:h-20 border-b border-[#C8A951]/10 bg-[#1B1B1B]/70 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-[#F5F5F5]/80 hover:text-[#C8A951] transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-semibold tracking-wide text-white uppercase font-heading">{getPageTitle()}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification button */}
            <button className="relative p-2.5 rounded-full hover:bg-white/5 border border-transparent hover:border-white/5 text-[#F5F5F5]/70 hover:text-white transition-all bg-transparent cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C8A951] rounded-full"></span>
            </button>

            {/* User Profile Summary */}
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <span className="hidden md:inline text-sm font-medium text-white/90">{adminFirstName}</span>
              <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-[#C8A951]/20">
                {adminImageUrl ? (
                  <Image src={adminImageUrl} alt="Profile" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#C8A951]/20 text-[#C8A951]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 xl:p-10 w-full max-w-7xl mx-auto flex flex-col">
          {children}
        </main>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Sidebar drawer content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-64 max-w-[80vw] z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
