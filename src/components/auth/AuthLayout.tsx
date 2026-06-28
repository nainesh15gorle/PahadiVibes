import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  leftSideImage?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-[#FAFAFA] dark:bg-[#121212] overflow-hidden">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity dark:text-white">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Left Side Showcase (Hidden on Mobile) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop')"
        }}
      >
        {/* Dark overlays */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60 z-0" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/20 to-transparent z-0" />

        {/* Breathtaking spinning gold mandala */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-70">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="w-[85%] h-[85%] flex items-center justify-center"
          >
            <svg viewBox="0 0 400 400" className="w-full h-full max-w-[500px]" style={{ filter: "drop-shadow(0px 0px 15px rgba(200, 169, 81, 0.45))" }}>
              <defs>
                <filter id="gold-glow-layout" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Outer Dashed Ring */}
              <circle cx="200" cy="200" r="175" fill="none" stroke="#C8A951" strokeWidth="1" strokeDasharray="6,4" opacity="0.3" />
              {/* Main Outer Ring */}
              <circle cx="200" cy="200" r="160" fill="none" stroke="#C8A951" strokeWidth="1.5" opacity="0.5" />
              {/* Star-like Outer Geometric Ring */}
              <circle cx="200" cy="200" r="145" fill="none" stroke="#C8A951" strokeWidth="0.75" strokeDasharray="15,5" opacity="0.4" />
              
              {/* Programmatic Petals */}
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * 360) / 16;
                return (
                  <g key={i} transform={`rotate(${angle} 200 200)`}>
                    {/* Outer Petals */}
                    <path
                      d="M 200 200 C 160 110, 160 70, 200 30 C 240 70, 240 110, 200 200"
                      fill="none"
                      stroke="#C8A951"
                      strokeWidth="1.5"
                      opacity="0.3"
                    />
                    {/* Inner Petals */}
                    <path
                      d="M 200 200 C 175 140, 175 110, 200 75 C 225 110, 225 140, 200 200"
                      fill="none"
                      stroke="#C8A951"
                      strokeWidth="1"
                      opacity="0.45"
                    />
                    {/* Little decorative circles on tips */}
                    <circle cx="200" cy="30" r="2.5" fill="#C8A951" opacity="0.7" filter="url(#gold-glow-layout)" />
                  </g>
                );
              })}

              {/* Concentric Inner Rings */}
              <circle cx="200" cy="200" r="75" fill="none" stroke="#C8A951" strokeWidth="1.5" opacity="0.6" filter="url(#gold-glow-layout)" />
              <circle cx="200" cy="200" r="50" fill="none" stroke="#C8A951" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <circle cx="200" cy="200" r="30" fill="none" stroke="#C8A951" strokeWidth="2" opacity="0.8" filter="url(#gold-glow-layout)" />
              {/* Core Star */}
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * 360) / 8;
                return (
                  <path
                    key={i}
                    d="M 200 200 L 200 180 L 195 200 Z"
                    fill="#C8A951"
                    opacity="0.75"
                    transform={`rotate(${angle} 200 200)`}
                  />
                );
              })}
            </svg>
          </motion.div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col justify-center h-full max-w-lg mt-12">
          <h1 className="font-playfair text-4xl lg:text-5xl xl:text-6xl text-white leading-tight font-semibold tracking-wide filter drop-shadow-md">
            {title}
          </h1>
          <p className="mt-6 text-lg text-neutral-200/90 leading-relaxed font-light">
            {subtitle}
          </p>
        </div>

        <div className="relative z-10 mt-auto">
          <div className="flex items-center gap-4">
            <div className="h-px bg-white/20 flex-1"></div>
            <p className="text-sm tracking-widest uppercase font-semibold text-[#C8A951] drop-shadow-sm">Pahadi Vibes</p>
            <div className="h-px bg-white/20 flex-1"></div>
          </div>
        </div>
      </motion.div>

      {/* Right Side Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative bg-[#F9F8F6] dark:bg-[#0D0D0D]">
        {/* Mobile background mandala */}
        <div className="absolute inset-0 lg:hidden overflow-hidden opacity-5 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] rounded-full border border-primary/20"></div>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] rounded-full border border-primary/30"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md relative z-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
