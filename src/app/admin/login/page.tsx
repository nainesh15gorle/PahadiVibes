"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GlassCard } from "@/components/auth/GlassCard";
import { AnimatedInput } from "@/components/ui/animated-input";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Hardcoded bypass for specific admin credentials
    if (emailAddress.trim().toLowerCase() === "bhumikafalia@gmail.com" && password.trim() === "Anu@04feb") {
      document.cookie = "admin_bypass=true; path=/";
      router.push("/admin/dashboard");
      return;
    }
    
    setIsLoading(true);
    setError("");

    try {
      const userEmail = emailAddress.toLowerCase().trim();
      const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();

      if (userEmail !== adminEmail) {
        setError("Access Denied: You do not have administrator permissions.");
        setIsLoading(false);
        return;
      }

      await signIn({ email: userEmail, password });
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error("Admin sign in error:", err);
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AuthLayout
      title="Admin Access"
      subtitle="Secure operations portal for Pahadi Vibes."
    >
      <GlassCard>
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-[#C8A951]/10 flex items-center justify-center border border-[#C8A951]/30 mb-4 shadow-[0_0_15px_rgba(200,169,81,0.2)]">
              <ShieldCheck className="w-6 h-6 text-[#C8A951]" />
            </div>
            <h2 className="text-2xl font-playfair mb-2 dark:text-white">Admin Console</h2>
            <p className="text-muted-foreground text-sm">Pahadi Vibes Operations</p>
          </motion.div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg mb-6 border border-red-500/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <AnimatedInput
                label="Admin Email"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                required
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <AnimatedInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4 border border-border rounded group-hover:border-[#C8A951] transition-colors">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="hidden peer-checked:block w-2 h-2 bg-[#C8A951] rounded-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember Session</span>
              </label>
              
              <button 
                type="button"
                onClick={() => setError("Please contact system architect to reset your admin password.")}
                className="text-sm text-[#C8A951] hover:underline transition-all bg-transparent border-0 cursor-pointer"
              >
                Reset Key
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-[#C8A951] hover:bg-[#B59642] text-white py-6 rounded-xl transition-all shadow-[0_0_20px_rgba(200,169,81,0.3)] hover:shadow-[0_0_30px_rgba(200,169,81,0.5)]"
                disabled={isLoading}
              >
                {isLoading ? <MandalaLoader size={24} /> : "Secure Sign In"}
              </Button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-border flex justify-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return to Customer Site
            </Link>
          </motion.div>
        </motion.div>
      </GlassCard>
    </AuthLayout>
  );
}
