"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto w-full flex items-start justify-between gap-3 bg-zinc-950/90 dark:bg-zinc-900/95 backdrop-blur-md border border-primary/20 p-4 shadow-2xl rounded-none text-left"
            >
              <div className="flex items-start gap-3 flex-1">
                {t.type === "success" && (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                )}
                {t.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                {t.type === "warning" && (
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                {t.type === "info" && (
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-zinc-100 uppercase tracking-widest leading-none">
                    {t.type === "success" && "Success"}
                    {t.type === "error" && "Failed"}
                    {t.type === "warning" && "Warning"}
                    {t.type === "info" && "Notice"}
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans font-light mt-1">
                    {t.message}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 mt-0.5 flex-shrink-0"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
