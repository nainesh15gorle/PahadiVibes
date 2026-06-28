import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-white/90 dark:bg-[#151515]/95",
        "backdrop-blur-2xl border border-[#C8A951]/20 dark:border-[#C8A951]/15",
        "shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
        "rounded-3xl p-5 sm:p-10",
        "transition-all duration-300 hover:border-[#C8A951]/35",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
