import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, className, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative w-full mb-5">
        <motion.div
          initial={false}
          animate={{
            y: isFocused || props.value ? -24 : 0,
            scale: isFocused || props.value ? 0.85 : 1,
            color: error ? '#ef4444' : isFocused ? '#C8A951' : '#737373'
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute left-0 top-3 origin-left pointer-events-none"
        >
          {label}
        </motion.div>
        
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full bg-transparent border-b-2 py-3 outline-none transition-colors",
              "text-foreground",
              error 
                ? "border-red-500 focus:border-red-500" 
                : "border-border focus:border-[#C8A951]",
              isPassword ? "pr-10" : "",
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-xs mt-1 absolute -bottom-5"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';
