import { motion } from "framer-motion";
import { Cpu, BatteryCharging, Wrench } from "lucide-react";

/**
 * Animated exploded-view phone teardown.
 * The layers separate (teardown) and reassemble in an infinite loop.
 */
export function PhoneTeardown() {
  const loop = {
    repeat: Infinity,
    repeatType: "loop" as const,
    duration: 6,
    times: [0, 0.2, 0.5, 0.7, 1],
    ease: "easeInOut" as const,
  };

  return (
    <div className="relative mx-auto flex h-[420px] w-[260px] items-center justify-center [perspective:1100px]">
      {/* Glow */}
      <div className="absolute h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[90px]" />
      <div className="absolute h-60 w-60 translate-x-10 rounded-full bg-orange-400/20 blur-[90px]" />

      <div className="relative [transform-style:preserve-3d] [transform:rotateX(12deg)_rotateZ(-8deg)]">
        {/* Back cover */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[300px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-[2.2rem] border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900 shadow-2xl"
          animate={{ y: [0, 70, 70, 0, 0], rotateZ: [0, -6, -6, 0, 0] }}
          transition={loop}
        />

        {/* Battery layer */}
        <motion.div
          className="absolute left-1/2 top-1/2 flex h-[280px] w-[140px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-orange-300/20 bg-gradient-to-br from-orange-500/30 to-rose-500/20 backdrop-blur-sm"
          animate={{ y: [0, 24, 24, 0, 0] }}
          transition={loop}
        >
          <BatteryCharging className="h-9 w-9 text-orange-200/80" />
        </motion.div>

        {/* Mainboard layer */}
        <motion.div
          className="absolute left-1/2 top-1/2 flex h-[280px] w-[140px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/25 to-violet-600/20 backdrop-blur-sm"
          animate={{ y: [0, -24, -24, 0, 0] }}
          transition={loop}
        >
          <Cpu className="h-9 w-9 text-fuchsia-200/80" />
        </motion.div>

        {/* Screen / glass on top */}
        <motion.div
          className="relative h-[300px] w-[150px] overflow-hidden rounded-[2.2rem] border border-white/20 bg-gradient-to-br from-[#1b1030] to-[#0d0719] shadow-[0_30px_60px_-20px_rgba(244,63,94,0.5)]"
          animate={{ y: [0, -78, -78, 0, 0], rotateZ: [0, 6, 6, 0, 0] }}
          transition={loop}
        >
          {/* notch */}
          <div className="absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/20" />
          {/* screen content */}
          <div className="flex h-full w-full flex-col gap-3 p-4 pt-7">
            <div className="h-16 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500" />
            <div className="h-3 w-3/4 rounded-full bg-white/15" />
            <div className="h-3 w-1/2 rounded-full bg-white/10" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="h-12 rounded-lg bg-white/10" />
              <div className="h-12 rounded-lg bg-white/10" />
              <div className="h-12 rounded-lg bg-fuchsia-400/20" />
              <div className="h-12 rounded-lg bg-white/10" />
            </div>
          </div>
        </motion.div>

        {/* Floating screwdriver hint */}
        <motion.div
          className="absolute -right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-md"
          animate={{ rotate: [0, 25, -10, 0], y: [0, -6, 4, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <Wrench className="h-5 w-5 text-orange-300" />
        </motion.div>
      </div>
    </div>
  );
}
