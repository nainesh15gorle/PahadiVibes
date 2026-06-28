"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Check for query parameter or development mode
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const forceSplash = urlParams ? urlParams.get("splash") === "true" : false;
    const isDev = process.env.NODE_ENV === "development";

    const hasSeenSplash = sessionStorage.getItem("pahadi_splash_seen");
    
    if (hasSeenSplash && !forceSplash && !isDev) {
      setIsVisible(false);
      setShouldRender(false);
    } else {
      setShouldRender(true);
      
      // If user prefers reduced motion, show it statically with a shorter duration
      const displayDuration = prefersReducedMotion ? 1200 : 2900;

      const timer = setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem("pahadi_splash_seen", "true");
      }, displayDuration);

      return () => clearTimeout(timer);
    }
  }, [prefersReducedMotion]);

  // Lock body scroll while splash screen is visible
  useEffect(() => {
    if (isVisible && shouldRender) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible, shouldRender]);

  if (!shouldRender) return null;

  // Animation variants for Aipan paths (simulates continuous hand-drawing)
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => {
      // Staggering faster (0.05s) to complete drawing within 1.8 seconds
      const delay = 0.2 + i * 0.06;
      return {
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { delay, type: "spring", duration: 2.2, bounce: 0, ease: "easeInOut" },
          opacity: { delay, duration: 0.4 },
        },
      };
    },
  };

  // 8 Petals of the Lotus (Kamal Chowki)
  const petalPath = "M 400 365 C 385 345, 385 330, 400 315 C 415 330, 415 345, 400 365";
  const rayAngles = Array.from({ length: 16 }, (_, i) => i * (360 / 16));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F8F6F2] overflow-hidden select-none ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* ================= GENTLE GOLDEN GLOW ================= */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-[radial-gradient(circle,_#C8A951_0%,_transparent_65%)] opacity-[0.06] blur-3xl pointer-events-none z-0" />

          {/* ================= BACKGROUND AIPAN GEOMETRY ================= */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center w-full h-full z-0"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.12, opacity: 0 }}
            transition={{ 
              animate: { duration: 1.8, ease: "easeOut" },
              exit: { duration: 0.8, ease: "easeInOut" } 
            }}
          >
            {/* SVG rotating slowly counter-clockwise (disabled if reduced motion is preferred) */}
            <motion.svg
              viewBox="0 0 800 800"
              animate={prefersReducedMotion ? {} : { rotate: -360 }}
              transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "400px 400px" }}
              className="w-full h-full max-w-[85vh] max-h-[85vh] opacity-[0.07] dark:opacity-[0.05]"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Central Lotus */}
              {Array.from({ length: 8 }).map((_, idx) => (
                <g key={`sp-petal-${idx}`} transform={`rotate(${idx * 45}, 400, 400)`}>
                  <motion.path
                    d={petalPath}
                    stroke="#C8A951"
                    strokeWidth="1.5"
                    variants={draw}
                    custom={idx * 0.08}
                    initial="hidden"
                    animate="visible"
                  />
                  <motion.circle
                    cx="400"
                    cy="335"
                    r="2"
                    fill="#C8A951"
                    stroke="none"
                    variants={draw}
                    custom={0.4 + idx * 0.08}
                    initial="hidden"
                    animate="visible"
                  />
                </g>
              ))}

              {/* Inner concentric rings */}
              <motion.circle
                cx="400"
                cy="400"
                r="100"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                variants={draw}
                custom={1.2}
                initial="hidden"
                animate="visible"
              />
              <motion.circle
                cx="400"
                cy="400"
                r="108"
                stroke="#C8A951"
                strokeWidth="3.5"
                strokeDasharray="1 14"
                variants={draw}
                custom={1.4}
                initial="hidden"
                animate="visible"
              />
              <motion.circle
                cx="400"
                cy="400"
                r="116"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                variants={draw}
                custom={1.6}
                initial="hidden"
                animate="visible"
              />

              {/* Interlocking squares (Star peeth) */}
              <motion.rect
                x="270"
                y="270"
                width="260"
                height="260"
                rx="12"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                variants={draw}
                custom={1.8}
                initial="hidden"
                animate="visible"
              />
              <motion.rect
                x="270"
                y="270"
                width="260"
                height="260"
                rx="12"
                transform="rotate(45, 400, 400)"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                variants={draw}
                custom={2.0}
                initial="hidden"
                animate="visible"
              />

              {/* Connecting star border */}
              <motion.circle
                cx="400"
                cy="400"
                r="192"
                stroke="#C8A951"
                strokeWidth="1"
                strokeDasharray="4 6"
                variants={draw}
                custom={2.2}
                initial="hidden"
                animate="visible"
              />

              {/* Outer boundary circles */}
              <motion.circle
                cx="400"
                cy="400"
                r="230"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                variants={draw}
                custom={2.4}
                initial="hidden"
                animate="visible"
              />
              <motion.circle
                cx="400"
                cy="400"
                r="240"
                stroke="#C8A951"
                strokeWidth="4"
                strokeDasharray="1 18"
                variants={draw}
                custom={2.6}
                initial="hidden"
                animate="visible"
              />

              {/* Outer Radiating Rays */}
              {rayAngles.map((angle, idx) => (
                <g key={`sp-ray-${idx}`} transform={`rotate(${angle}, 400, 400)`}>
                  <motion.line
                    x1="400"
                    y1="140"
                    x2="400"
                    y2="100"
                    stroke="#C8A951"
                    strokeWidth="1"
                    variants={draw}
                    custom={2.8 + idx * 0.05}
                    initial="hidden"
                    animate="visible"
                  />
                  <motion.circle
                    cx="400"
                    cy="90"
                    r="1.5"
                    fill="#C8A951"
                    stroke="none"
                    variants={draw}
                    custom={3.0 + idx * 0.05}
                    initial="hidden"
                    animate="visible"
                  />
                </g>
              ))}
            </motion.svg>
          </motion.div>

          {/* ================= LUXURY BRAND TEXT ================= */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            
            {/* "WELCOME TO" */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="font-heading font-light text-[#1C1C1C] text-[10.5px] sm:text-xs tracking-[0.45em] uppercase"
            >
              Welcome To
            </motion.span>

            {/* "PAHADI VIBES" */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
              className="font-heading text-4xl sm:text-6xl md:text-7xl font-bold text-[#1C1C1C] tracking-[0.18em] uppercase mt-3 sm:mt-4 ml-[0.18em]"
            >
              Pahadi Vibes
            </motion.h1>

            {/* TAGLINE */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 1.2 }}
              className="flex flex-col items-center mt-5 sm:mt-6 text-[#7C593E]"
            >
              {/* Divider lines decoration */}
              <div className="w-8 h-[1px] bg-[#7C593E]/20 mb-4" />
              
              <p className="text-xs sm:text-sm font-light tracking-[0.15em] uppercase">
                Crafted by Hands.
              </p>
              <p className="text-[11px] sm:text-xs font-light italic tracking-[0.1em] mt-1.5 opacity-90">
                Inspired by Heritage.
              </p>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
