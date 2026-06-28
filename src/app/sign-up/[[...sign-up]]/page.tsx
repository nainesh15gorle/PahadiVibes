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
import { Check, AlertCircle } from 'lucide-react';

export default function SignUpPage() {
  const { signUp, signInWithGoogle, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
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

  // Password criteria checklist
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  let strengthLabel = 'Very Weak';
  let strengthColor = 'bg-red-500';
  let strengthTextColor = 'text-red-500';
  
  if (strengthCount >= 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-[#C8A951]'; // Gold for luxury branding
    strengthTextColor = 'text-[#C8A951]';
  } else if (strengthCount >= 3) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-amber-500';
    strengthTextColor = 'text-amber-500';
  } else if (strengthCount > 0) {
    strengthLabel = 'Weak';
    strengthColor = 'bg-red-400';
    strengthTextColor = 'text-red-400';
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Full Name Validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Full Name must be at least 2 characters.");
      showToast("Full Name must be at least 2 characters.", "error");
      return;
    }

    // 2. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailAddress || !emailRegex.test(emailAddress)) {
      setError("Please enter a valid email address.");
      showToast("Please enter a valid email address.", "error");
      return;
    }

    // 3. Password Strength Validation
    if (!hasMinLength) {
      setError("Password must be minimum 8 characters.");
      showToast("Password must be minimum 8 characters.", "error");
      return;
    }

    // 4. Confirm Password Match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      showToast("Passwords do not match.", "error");
      return;
    }

    // 5. Terms Acceptance Validation
    if (!agreeTerms) {
      setError("Please accept the Terms & Conditions.");
      showToast("Please accept the Terms & Conditions.", "error");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUp({
        email: emailAddress.trim(),
        password,
        fullName: fullName.trim(),
      });

      showToast("Account created successfully!", "success");
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1000);
    } catch (err: any) {
      console.error("SignUp error details:", err);
      const errMsg = err.message || 'An error occurred during registration.';
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
      title="Begin Your Journey"
      subtitle="Join a community that values craftsmanship and timeless artistry."
    >
      {/* Floating Toast Notification */}
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
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-red-500/10 text-red-600 text-sm p-4 rounded-xl mb-6 border border-red-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          key="signup-form"
          variants={containerVariants} 
          initial="hidden" 
          animate="show"
        >
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h2 className="text-2xl font-playfair mb-2 dark:text-white">Create Account</h2>
            <p className="text-muted-foreground text-sm">Experience the art of Mandalas</p>
          </motion.div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <motion.div variants={itemVariants}>
              <AnimatedInput
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </motion.div>

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
              
              {/* Password Strength Visual Checklist */}
              {password && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 mb-4 space-y-2 border border-neutral-100 dark:border-neutral-800 p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Strength:</span>
                    <span className={`font-semibold ${strengthTextColor}`}>{strengthLabel}</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${(strengthCount / 5) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {hasMinLength ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[8px]"></span>
                      )}
                      <span className={hasMinLength ? "text-foreground" : ""}>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {hasUppercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[8px]"></span>
                      )}
                      <span className={hasUppercase ? "text-foreground" : ""}>One uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {hasLowercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[8px]"></span>
                      )}
                      <span className={hasLowercase ? "text-foreground" : ""}>One lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {hasNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[8px]"></span>
                      )}
                      <span className={hasNumber ? "text-foreground" : ""}>One number</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                      {hasSpecial ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[8px]"></span>
                      )}
                      <span className={hasSpecial ? "text-foreground" : ""}>One special character</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            <motion.div variants={itemVariants}>
              <AnimatedInput
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start mt-2 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 border border-border rounded group-hover:border-[#C8A951] transition-colors mt-0.5 shrink-0">
                  <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <div className="hidden peer-checked:block w-3 h-3 bg-[#C8A951] rounded-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                  I agree to the <Link href="/terms" className="text-[#C8A951] hover:underline">Terms and Conditions</Link> and <Link href="/privacy" className="text-[#C8A951] hover:underline">Privacy Policy</Link>
                </span>
              </label>
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
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </motion.div>
          </form>



          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`} className="text-[#C8A951] font-medium hover:underline transition-all">
                Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </GlassCard>
    </AuthLayout>
  );
}
