import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MandalaLoaderProps {
  className?: string;
  size?: number;
}

export function MandalaLoader({ className, size = 48 }: MandalaLoaderProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#C8A951" strokeWidth="2" strokeDasharray="4 4" opacity="0.5"/>
          <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" stroke="#C8A951" strokeWidth="2" strokeLinejoin="round"/>
          <circle cx="50" cy="50" r="15" stroke="#C8A951" strokeWidth="2"/>
        </svg>
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 scale-75"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 5 L65 35 L95 50 L65 65 L50 95 L35 65 L5 50 L35 35 Z" stroke="#C8A951" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7"/>
          <circle cx="50" cy="50" r="25" stroke="#C8A951" strokeWidth="1" strokeDasharray="2 2" opacity="0.6"/>
        </svg>
      </motion.div>
      <motion.div
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-2 h-2 rounded-full bg-[#C8A951]"
      />
    </div>
  );
}
