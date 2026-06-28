"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AipanPattern() {
  const shouldReduceMotion = useReducedMotion();

  // Animation variants for the paths to simulate a hand-drawn reveal
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => {
      const delay = 0.1 + i * 0.15;
      return {
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { delay, type: "spring", duration: 3.5, bounce: 0, ease: "easeInOut" },
          opacity: { delay, duration: 0.5 },
        },
      };
    },
  };

  const pulse = {
    animate: {
      opacity: shouldReduceMotion ? 0.75 : [0.60, 0.90, 0.60],
      scale: shouldReduceMotion ? 1 : [1, 1.05, 1],
      transition: {
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // 8 Petals of the Kamal (Lotus)
  const petalPath = "M 400 365 C 385 345, 385 330, 400 315 C 415 330, 415 345, 400 365";

  // Radiating Vasudhara lines (outer decorative rays)
  const rayAngles = Array.from({ length: 16 }, (_, i) => i * (360 / 16));

  // Corner creepers (Bel)
  const cornerBelPath = "M 40 160 C 40 110, 110 40, 160 40 C 130 60, 60 130, 40 160 M 60 70 Q 100 90 90 110 M 100 100 Q 80 60 60 70";

  return (
    <motion.div 
      variants={pulse}
      animate="animate"
      className="absolute inset-0 flex items-center justify-center w-full h-full pointer-events-none select-none overflow-hidden z-20 will-change-transform transform-gpu"
      style={{
        '--primary': '43 74% 49%', /* Soft Gold (#D4AF37) */
        '--foreground': '60 56% 91%', /* Beige / Off-white (#F5F5DC) */
      } as React.CSSProperties}
    >
      <svg
        viewBox="0 0 800 800"
        className="w-full h-full max-w-[90vh] max-h-[90vh] opacity-90 md:opacity-100"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ================= BACKGROUND GLOWS ================= */}
        <defs>
          <radialGradient id="aipan-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="400" cy="400" r="380" fill="url(#aipan-glow)" />

        {/* ================= STATIC CENTRAL LAYER ================= */}
        <g id="aipan-center-static">
          {/* Left Foot */}
          <motion.path
            d="M 391,415 C 386,415 383,403 383,394 C 383,387 386,383 390,383 C 394,383 397,387 397,394 C 397,403 395,415 391,415 Z"
            className="stroke-primary/75 dark:stroke-primary/65"
            strokeWidth="1.5"
            variants={draw}
            custom={0}
            initial="hidden"
            animate="visible"
          />
          {/* Left Toes */}
          {[
            { cx: 382, cy: 377, r: 1.5 },
            { cx: 386, cy: 374, r: 2 },
            { cx: 390, cy: 373, r: 2.2 },
            { cx: 394, cy: 375, r: 2 },
            { cx: 397, cy: 378, r: 1.5 },
          ].map((toe, index) => (
            <motion.circle
              key={`l-toe-${index}`}
              cx={toe.cx}
              cy={toe.cy}
              r={toe.r}
              className="fill-primary/75 stroke-none dark:fill-primary/65"
              variants={draw}
              custom={0.5 + index * 0.05}
              initial="hidden"
              animate="visible"
            />
          ))}

          {/* Right Foot */}
          <motion.path
            d="M 409,415 C 404,415 401,403 401,394 C 401,387 404,383 408,383 C 412,383 415,387 415,394 C 415,403 413,415 409,415 Z"
            className="stroke-primary/75 dark:stroke-primary/65"
            strokeWidth="1.5"
            variants={draw}
            custom={1}
            initial="hidden"
            animate="visible"
          />
          {/* Right Toes */}
          {[
            { cx: 401, cy: 378, r: 1.5 },
            { cx: 405, cy: 375, r: 2 },
            { cx: 409, cy: 373, r: 2.2 },
            { cx: 413, cy: 374, r: 2 },
            { cx: 417, cy: 377, r: 1.5 },
          ].map((toe, index) => (
            <motion.circle
              key={`r-toe-${index}`}
              cx={toe.cx}
              cy={toe.cy}
              r={toe.r}
              className="fill-primary/75 stroke-none dark:fill-primary/65"
              variants={draw}
              custom={1.5 + index * 0.05}
              initial="hidden"
              animate="visible"
            />
          ))}

          {/* Inner Ring Circle */}
          <motion.circle
            cx="400"
            cy="400"
            r="100"
            className="stroke-foreground/20 dark:stroke-foreground/15"
            strokeWidth="1.2"
            variants={draw}
            custom={4.2}
            initial="hidden"
            animate="visible"
          />
          {/* Outer Ring Circle */}
          <motion.circle
            cx="400"
            cy="400"
            r="116"
            className="stroke-foreground/20 dark:stroke-foreground/15"
            strokeWidth="1.2"
            variants={draw}
            custom={4.8}
            initial="hidden"
            animate="visible"
          />
        </g>

        {/* ================= CLOCKWISE ROTATING LAYER (Lotus, Outer Wave, Outer Dots) ================= */}
        <motion.g
          id="aipan-clockwise-group"
          animate={{ rotate: shouldReduceMotion ? 0 : 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "400px 400px", willChange: "transform" }}
        >
          {/* 8-Petal Lotus (Kamal Chowki) */}
          {Array.from({ length: 8 }).map((_, idx) => (
            <g key={`petal-group-${idx}`} transform={`rotate(${idx * 45}, 400, 400)`}>
              <motion.path
                d={petalPath}
                className="stroke-primary/70 dark:stroke-primary/60"
                strokeWidth="1.5"
                variants={draw}
                custom={3 + idx * 0.1}
                initial="hidden"
                animate="visible"
              />
              {/* Small decorative dot inside each petal */}
              <motion.circle
                cx="400"
                cy="335"
                r="2"
                className="fill-primary/60 dark:fill-primary/50 stroke-none"
                variants={draw}
                custom={3.5 + idx * 0.1}
                initial="hidden"
                animate="visible"
              />
            </g>
          ))}

          {/* Inner Dot Ring (represented by dashed circle) */}
          <motion.circle
            cx="400"
            cy="400"
            r="108"
            className="stroke-primary/55 dark:stroke-primary/45"
            strokeWidth="3.5"
            strokeDasharray="1 14"
            variants={draw}
            custom={4.5}
            initial="hidden"
            animate="visible"
          />

          {/* Outer Dot Ring */}
          <motion.circle
            cx="400"
            cy="400"
            r="240"
            className="stroke-primary/40 dark:stroke-primary/30"
            strokeWidth="4"
            strokeDasharray="1 18"
            variants={draw}
            custom={6.8}
            initial="hidden"
            animate="visible"
          />

          {/* Outer wavy boundary line (khilona style representation) */}
          <motion.circle
            cx="400"
            cy="400"
            r="250"
            className="stroke-foreground/12 dark:stroke-foreground/8"
            strokeWidth="1"
            variants={draw}
            custom={7.2}
            initial="hidden"
            animate="visible"
          />
        </motion.g>

        {/* ================= COUNTER-CLOCKWISE ROTATING LAYER (Squares, Rays, Star Border) ================= */}
        <motion.g
          id="aipan-counter-clockwise-group"
          animate={{ rotate: shouldReduceMotion ? 0 : -360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "400px 400px", willChange: "transform" }}
        >
          {/* Square 1 */}
          <motion.rect
            x="270"
            y="270"
            width="260"
            height="260"
            rx="12"
            className="stroke-foreground/18 dark:stroke-foreground/12"
            strokeWidth="1.2"
            variants={draw}
            custom={5.2}
            initial="hidden"
            animate="visible"
          />

          {/* Square 2 (Rotated 45 degrees) */}
          <motion.rect
            x="270"
            y="270"
            width="260"
            height="260"
            rx="12"
            transform="rotate(45, 400, 400)"
            className="stroke-foreground/18 dark:stroke-foreground/12"
            strokeWidth="1.2"
            variants={draw}
            custom={5.6}
            initial="hidden"
            animate="visible"
          />

          {/* Outer Star Decorative Border Circles (connecting points of the star) */}
          <motion.circle
            cx="400"
            cy="400"
            r="192"
            className="stroke-primary/50 dark:stroke-primary/40"
            strokeWidth="1"
            strokeDasharray="4 6"
            variants={draw}
            custom={6.0}
            initial="hidden"
            animate="visible"
          />

          {/* Large concentric circle */}
          <motion.circle
            cx="400"
            cy="400"
            r="230"
            className="stroke-foreground/18 dark:stroke-foreground/12"
            strokeWidth="1.5"
            variants={draw}
            custom={6.4}
            initial="hidden"
            animate="visible"
          />

          {/* Radiating Rays (Vasudhara Influence) */}
          {rayAngles.map((angle, idx) => (
            <g key={`ray-group-${idx}`} transform={`rotate(${angle}, 400, 400)`}>
              <motion.line
                x1="400"
                y1="140"
                x2="400"
                y2="100"
                className="stroke-primary/45 dark:stroke-primary/35"
                strokeWidth="1"
                variants={draw}
                custom={7.5 + idx * 0.08}
                initial="hidden"
                animate="visible"
              />
              {/* Small floating dot at the end of each ray */}
              <motion.circle
                cx="400"
                cy="90"
                r="1.5"
                className="fill-primary/40 dark:fill-primary/30 stroke-none"
                variants={draw}
                custom={8.0 + idx * 0.08}
                initial="hidden"
                animate="visible"
              />
            </g>
          ))}
        </motion.g>

        {/* ================= STATIC CORNER LAYER ================= */}
        <g id="aipan-corners-static">
          {/* Top Left Corner */}
          <g transform="translate(0, 0)">
            <motion.path
              d={cornerBelPath}
              className="stroke-primary/55 dark:stroke-primary/45"
              strokeWidth="1.2"
              variants={draw}
              custom={9.0}
              initial="hidden"
              animate="visible"
            />
          </g>

          {/* Top Right Corner */}
          <g transform="translate(800, 0) scale(-1, 1)">
            <motion.path
              d={cornerBelPath}
              className="stroke-primary/55 dark:stroke-primary/45"
              strokeWidth="1.2"
              variants={draw}
              custom={9.3}
              initial="hidden"
              animate="visible"
            />
          </g>

          {/* Bottom Left Corner */}
          <g transform="translate(0, 800) scale(1, -1)">
            <motion.path
              d={cornerBelPath}
              className="stroke-primary/55 dark:stroke-primary/45"
              strokeWidth="1.2"
              variants={draw}
              custom={9.6}
              initial="hidden"
              animate="visible"
            />
          </g>

          {/* Bottom Right Corner */}
          <g transform="translate(800, 800) scale(-1, -1)">
            <motion.path
              d={cornerBelPath}
              className="stroke-primary/55 dark:stroke-primary/45"
              strokeWidth="1.2"
              variants={draw}
              custom={9.9}
              initial="hidden"
              animate="visible"
            />
          </g>
        </g>
      </svg>
    </motion.div>
  );
}
