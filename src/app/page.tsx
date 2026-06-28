"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Star, Heart, Eye } from "lucide-react";
import { AipanPattern } from "@/components/ui/aipan-pattern";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Placeholder images - using mandala-related searches from Unsplash
  const heroImage = "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a?q=80&w=3540&auto=format&fit=crop"; // Intricate pattern
  const categories = [
    { title: "Wall Art", image: "https://images.unsplash.com/photo-1601614915609-b68ab3ab1f91?q=80&w=800&auto=format&fit=crop" }, // Gold pattern
    { title: "Aipan Art", image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=800&auto=format&fit=crop" } // Aipan folk art
  ];



  return (
    <main className="flex-1 flex flex-col w-full">
      {/* Hero Section */}
      <section 
        ref={containerRef}
        className="relative h-[80vh] min-h-[580px] md:h-screen w-full flex flex-col justify-start items-center overflow-hidden bg-background pt-[88px] sm:pt-[100px] md:pt-[120px] pb-10"
      >
        <motion.div 
          style={{ y, opacity }}
          className="absolute inset-0 z-0"
        >
          {/* 1. Background Image texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-[0.08] blur-[2px] z-0"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          
          {/* 2. Central radial glow */}
          <div className="absolute inset-0 bg-radial-gradient from-primary/25 to-transparent z-10 mix-blend-overlay" />
          
          {/* 3. Aipan sacred geometry animation (renders at z-20) */}
          <AipanPattern />

          {/* 4. Bottom fade gradient (renders at z-30 to smoothly fade the Aipan lines at the bottom boundary) */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background z-30 pointer-events-none" />
        </motion.div>

        <div className="relative z-10 container mx-auto px-5 flex flex-col items-center text-center mt-4 md:mt-8">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-foreground font-bold max-w-4xl tracking-tight leading-[1.1] md:leading-[1.15]"
          >
            Crafted by Hands. <br className="hidden md:block"/>
            <span className="text-primary italic font-light drop-shadow-sm text-[1.4rem] sm:text-4xl md:text-6xl lg:text-7xl">Inspired by Heritage.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-[13px] sm:text-base md:text-2xl text-foreground/80 max-w-xl font-light tracking-wide leading-relaxed px-2 md:px-0"
          >
            Discover exquisite Mandala masterpieces created by skilled artisans across India. Sacred geometry meets luxury design.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col sm:flex-row items-center w-full max-w-[280px] sm:max-w-none sm:w-auto gap-3 md:gap-5"
          >
            <Button asChild size="lg" className="rounded-none w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-10 h-12 md:h-14 text-xs tracking-[0.2em] uppercase shadow-md hover:shadow-xl transition-all duration-500 hover:scale-102 ripple-btn">
              <Link href="/collection">Explore Collection</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-none w-full sm:w-auto px-10 h-12 md:h-14 text-xs tracking-[0.2em] uppercase border-primary/50 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-500 ripple-btn">
              <Link href="/category/wall-art">Shop Best Sellers</Link>
            </Button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
        >
          <span className="text-[10px] text-primary uppercase tracking-[0.3em] font-medium">Discover</span>
          <div className="w-[1px] h-16 bg-primary/30 relative overflow-hidden">
            <motion.div 
              animate={{ y: [0, 64, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="absolute top-0 left-0 w-full h-1/2 bg-primary"
            />
          </div>
        </motion.div>
      </section>



      {/* History of Mandala Art */}
      <section className="py-10 md:py-32 bg-muted/30 overflow-hidden relative">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:w-1/2 space-y-8 relative z-10"
            >
              <div className="inline-flex items-center gap-3">
                <span className="w-12 h-px bg-primary/60"></span>
                <span className="text-primary text-sm uppercase tracking-[0.2em] font-medium">Our Heritage</span>
              </div>
              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                The Ancient Art of <br/>
                <span className="text-primary italic font-light">Spiritual Geometry</span>
              </h2>
              <div className="space-y-5 text-muted-foreground text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-xl">
                <p>
                  Originating from the ancient Sanskrit word for &quot;circle,&quot; the Mandala is far more than a simple geometric design. It represents the universe, a sacred cosmic diagram that reminds us of our relation to the infinite.
                </p>
                <p>
                  For centuries, artisans have crafted these intricate patterns as a form of meditation and spiritual focus. Each dot, curve, and stroke is placed with intention, creating a hypnotic symmetry that draws the eye and calms the mind.
                </p>
                <p>
                  At Pahadi Vibes, we honor this timeless tradition. Our artisans blend centuries-old techniques with contemporary aesthetics, bringing the meditative peace of the Himalayas directly into your modern living space.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="lg:w-1/2 relative h-[300px] md:h-[600px] w-full mt-4 md:mt-0"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-3xl opacity-50 mix-blend-multiply" />
              <div className="relative w-full h-full border border-border/50 bg-card shadow-2xl overflow-hidden group">
                <Image
                  src="/turquoise-mandala.jpg" 
                  alt="History of Mandala Art"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-1000" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
