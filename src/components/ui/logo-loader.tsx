"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function LogoLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
      <motion.div 
        className="relative flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Sacred Geometry Rotating Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 -m-8 rounded-full border border-dashed border-primary/30"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 -m-12 rounded-full border border-primary/10"
        />
        
        {/* Pulsing Logo */}
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-40 h-12"
        >
          <Image 
            src="/logo.png" 
            alt="Pahadi Vibes Loading" 
            fill 
            className="object-contain" 
            priority
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
