"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

export function StarsBackground() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Generate random stars
    const generatedStars: Star[] = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="stars-container">
      {/* Nebula glows */}
      <div className="nebula-glow nebula-glow--cyan w-[600px] h-[600px] top-[-10%] left-[-10%]" />
      <div className="nebula-glow nebula-glow--violet w-[500px] h-[500px] top-[20%] right-[-5%]" />
      <div className="nebula-glow nebula-glow--blue w-[400px] h-[400px] bottom-[10%] left-[30%]" />
      
      {/* Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.opacity * 0.3, star.opacity, star.opacity * 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Shooting stars */}
      <ShootingStar delay={0} />
      <ShootingStar delay={7} />
      <ShootingStar delay={14} />
    </div>
  );
}

function ShootingStar({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute w-20 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
      style={{
        top: `${Math.random() * 30}%`,
        left: "-10%",
        rotate: -45,
      }}
      animate={{
        left: ["-10%", "110%"],
        top: [`${Math.random() * 30}%`, `${Math.random() * 30 + 20}%`],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatDelay: 10,
        delay,
        ease: "easeOut",
      }}
    />
  );
}
