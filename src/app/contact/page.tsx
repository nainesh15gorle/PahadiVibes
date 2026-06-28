"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';

export default function ContactPage() {
  const contactMethods = [
    {
      name: 'Email Us',
      value: 'pahadiartvibes@gmail.com',
      description: 'Send us an email for general inquiries, custom orders, or collaborations.',
      icon: Mail,
      href: 'mailto:pahadiartvibes@gmail.com',
      actionText: 'Compose Email',
      color: 'from-[#C8A951]/20 to-transparent'
    },
    {
      name: 'Call Us',
      value: '+91 7416610293',
      description: 'Speak directly with our team for immediate assistance or order updates.',
      icon: Phone,
      href: 'tel:+917416610293',
      actionText: 'Make a Call',
      color: 'from-amber-500/10 to-transparent'
    },
    {
      name: 'WhatsApp',
      value: '+91 7416610293',
      description: 'Chat with us on WhatsApp for quick inquiries or to request product photos.',
      icon: MessageSquare,
      href: 'https://wa.me/917416610293',
      actionText: 'Start Chat',
      color: 'from-emerald-500/10 to-transparent',
      external: true
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="min-h-screen relative bg-[#FDFBF7] dark:bg-[#0E0E0D] pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden flex flex-col justify-center items-center">
      
      {/* Slow Spinning Gold Mandala Background Decorative element */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.06] pointer-events-none select-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
          className="w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px]"
        >
          <svg viewBox="0 0 400 400" className="w-full h-full text-[#C8A951]">
            <circle cx="200" cy="200" r="180" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5,5" />
            <circle cx="200" cy="200" r="160" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10,5" />
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              return (
                <g key={i} transform={`rotate(${angle} 200 200)`}>
                  <path
                    d="M 200 200 C 170 120, 170 80, 200 40 C 230 80, 230 120, 200 200"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.75"
                  />
                  <circle cx="200" cy="40" r="2" fill="currentColor" />
                </g>
              );
            })}
            <circle cx="200" cy="200" r="60" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="200" cy="200" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </motion.div>
      </div>

      <div className="container mx-auto px-5 relative z-10 w-full max-w-6xl">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <motion.span 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-semibold text-[#C8A951] mb-3 block"
          >
            Pahadi Vibes Support
          </motion.span>
          
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-playfair text-4xl md:text-5xl lg:text-6xl text-foreground font-semibold tracking-wide mb-6"
          >
            Get In Touch
          </motion.h1>
          
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-[1.5px] w-24 bg-[#C8A951] mx-auto mb-6"
          />

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-neutral-500 dark:text-neutral-400 text-sm md:text-base lg:text-lg leading-relaxed font-light px-2"
          >
            We&apos;re here to help you discover timeless handcrafted art and answer any questions about our collections.
          </motion.p>
        </div>

        {/* Contact Cards Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {contactMethods.map((method, index) => {
            const Icon = method.icon;
            return (
              <motion.div
                key={method.name}
                variants={itemVariants}
                className="group relative"
              >
                {/* Gold Glow Aura on Hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C8A951] to-amber-600 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-500 blur-xl group-hover:blur-2xl pointer-events-none" />
                
                {/* Main Card */}
                <a
                  href={method.href}
                  target={method.external ? "_blank" : undefined}
                  rel={method.external ? "noopener noreferrer" : undefined}
                  className="relative block h-full bg-white dark:bg-[#151514] border border-[#C8A951]/20 dark:border-[#C8A951]/10 rounded-3xl p-8 transition-all duration-500 group-hover:translate-y-[-6px] overflow-hidden"
                >
                  {/* Subtle Gradient Backlight */}
                  <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${method.color} opacity-40 group-hover:opacity-75 transition-opacity duration-500`} />

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Icon Container */}
                    <div className="w-12 h-12 rounded-full bg-[#C8A951]/10 flex items-center justify-center border border-[#C8A951]/30 mb-6 group-hover:bg-[#C8A951] group-hover:text-white transition-all duration-500 shadow-[0_0_15px_rgba(200,169,81,0.1)]">
                      <Icon className="w-5 h-5 text-[#C8A951] group-hover:text-white transition-colors duration-500" />
                    </div>

                    {/* Content */}
                    <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                      {method.name}
                    </h3>
                    
                    <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm leading-relaxed mb-6 font-light">
                      {method.description}
                    </p>

                    <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800/60 flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
                      <span className="font-heading text-sm font-semibold text-foreground tracking-wide select-all truncate min-w-0 max-w-full">
                        {method.value}
                      </span>
                      
                      <div className="flex items-center gap-1 text-xs font-semibold text-[#C8A951] group-hover:text-amber-600 transition-colors whitespace-nowrap shrink-0">
                        <span>{method.actionText}</span>
                        {method.external ? (
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Decorative Heritage Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-20 text-center flex flex-col items-center justify-center"
        >
          <div className="h-px w-36 bg-[#C8A951]/30 mb-6" />
          <span className="font-heading text-xs tracking-[0.3em] uppercase text-[#C8A951]">
            Handcrafted With Devotion
          </span>
          <p className="mt-2 text-neutral-400 dark:text-neutral-500 text-xs max-w-sm leading-relaxed font-light">
            Each piece is custom crafted by local Indian artists. We appreciate your patronage and will respond to your queries as swiftly as possible.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
