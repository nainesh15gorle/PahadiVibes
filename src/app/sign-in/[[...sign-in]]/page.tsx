"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { GlassCard } from '@/components/auth/GlassCard';
import { AnimatedInput } from '@/components/ui/animated-input';
import { MandalaLoader } from '@/components/ui/mandala-loader';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check } from 'lucide-react';

export default function SignInPage() {
  const { signIn, signInWithGoogle, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const redirectUrl = searchParams.get('redirect_url') || '/';

  // If already signed in, redirect
  useEffect(() => {
    if (isSignedIn) {
      router.push(redirectUrl);
    }
  }, [isSignedIn, router, redirectUrl]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signIn({ email: emailAddress.trim(), password });
      showToast("Signed in successfully!", "success");
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1000);
    } catch (err: any) {
      console.error("Sign in error:", err);
      let errMsg = "Invalid email or password.";
      if (err.message) {
        if (err.message.includes("Invalid login credentials")) {
          errMsg = "Invalid email or password. Please try again.";
        } else if (err.message.includes("Email not confirmed")) {
          errMsg = "Your email address is not verified yet.";
        } else {
          errMsg = err.message;
        }
      }
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle(redirectUrl);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      const msg = err.message || 'Google redirect failed.';
      setError(msg);
      showToast(msg, "error");
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
      title="Welcome Back"
      subtitle="Sign in to discover timeless Mandala masterpieces."
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            } backdrop-blur-md`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard>
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h2 className="text-2xl font-playfair mb-2 dark:text-white">Sign In</h2>
            <p className="text-muted-foreground text-sm">Access your luxury account</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-red-500/10 text-red-500 text-sm p-4 rounded-xl mb-6 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <AnimatedInput
                label="Email Address"
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
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
              </label>
              
              <button 
                type="button"
                onClick={() => showToast("Password reset functionality is currently disabled.", "error")}
                className="text-sm text-[#C8A951] hover:underline transition-all bg-transparent border-0 cursor-pointer"
              >
                Forgot Password?
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-[#C8A951] hover:bg-[#B59642] text-white py-6 rounded-xl transition-all shadow-[0_0_20px_rgba(200,169,81,0.3)] hover:shadow-[0_0_30px_rgba(200,169,81,0.5)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <MandalaLoader size={20} />
                    <span>Signing In...</span>
                  </div>
                ) : "Sign In"}
              </Button>
            </motion.div>
          </form>



          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`} className="text-[#C8A951] font-medium hover:underline transition-all">
                Create Account
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </GlassCard>
    </AuthLayout>
  );
}
