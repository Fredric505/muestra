import { motion } from "framer-motion";
import { Cpu, BatteryCharging, Wrench, Smartphone } from "lucide-react";

/**
 * Animated exploded-view phone teardown.
 * Layers separate (teardown) then reassemble in an infinite loop.
 * Compact and self-contained so it never overlaps surrounding text.
 */
export function PhoneTeardown() {
  const loop = {
    repeat: Infinity,
    repeatType: "loop" as const,
    duration: 6,
    times: [0, 0.25, 0.55, 0.8, 1],
    ease: "easeInOut" as const,
  };

  return (
    <div className="relative mx-auto flex h-[360px] w-full max-w-[300px] items-center justify-center overflow-hidden [perspective:1100px]">
      {/* Glow */}
      <div className="absolute h-56 w-56 rounded-full bg-fuchsia-500/20 blur-[80px]" />
      <div className="absolute h-48 w-48 translate-x-8 rounded-full bg-orange-400/20 blur-[80px]" />

      <div className="relative [transform-style:preserve-3d] [transform:rotateX(10deg)_rotateZ(-6deg)]">
        {/* Back cover */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[250px] w-[124px] -translate-x-1/2 -translate-y-1/2 rounded-[1.9rem] border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900 shadow-2xl"
          animate={{ x: [0, 48, 48, 0, 0], y: [0, 34, 34, 0, 0] }}
          transition={loop}
        />

        {/* Battery layer */}
        <motion.div
          className="absolute left-1/2 top-1/2 flex h-[236px] w-[116px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.7rem] border border-orange-300/20 bg-gradient-to-br from-orange-500/30 to-rose-500/20 backdrop-blur-sm"
          animate={{ x: [0, 22, 22, 0, 0], y: [0, 14, 14, 0, 0] }}
          transition={loop}
        >
          <BatteryCharging className="h-8 w-8 text-orange-200/80" />
        </motion.div>

        {/* Mainboard layer */}
        <motion.div
          className="absolute left-1/2 top-1/2 flex h-[236px] w-[116px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.7rem] border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/25 to-violet-600/20 backdrop-blur-sm"
          animate={{ x: [0, -22, -22, 0, 0], y: [0, -14, -14, 0, 0] }}
          transition={loop}
        >
          <Cpu className="h-8 w-8 text-fuchsia-200/80" />
        </motion.div>

        {/* Screen / glass on top — repair app UI */}
        <motion.div
          className="relative h-[250px] w-[124px] overflow-hidden rounded-[1.9rem] border border-white/20 bg-gradient-to-br from-[#1b1030] to-[#0d0719] shadow-[0_24px_50px_-18px_rgba(244,63,94,0.5)]"
          animate={{ x: [0, -46, -46, 0, 0], y: [0, -34, -34, 0, 0] }}
          transition={loop}
        >
          {/* notch */}
          <div className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/20" />
          {/* app content */}
          <div className="flex h-full w-full flex-col gap-2.5 p-3 pt-6">
            {/* header */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-fuchsia-500">
                <Smartphone className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1">
                <div className="h-2 w-3/4 rounded-full bg-white/25" />
                <div className="mt-1 h-1.5 w-1/2 rounded-full bg-white/10" />
              </div>
            </div>
            {/* status card */}
            <div className="rounded-xl bg-white/[0.06] p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="h-1.5 w-10 rounded-full bg-white/20" />
                <span className="rounded-full bg-orange-400/30 px-1.5 py-0.5 text-[7px] font-bold text-orange-200">EN REPARACIÓN</span>
              </div>
              {/* progress */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-400 to-fuchsia-500" />
              </div>
            </div>
            {/* list rows */}
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-2">
                <div className="h-5 w-5 rounded-md bg-fuchsia-400/20" />
                <div className="flex-1">
                  <div className="h-1.5 w-3/4 rounded-full bg-white/15" />
                  <div className="mt-1 h-1.5 w-1/3 rounded-full bg-white/8" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Floating screwdriver */}
        <motion.div
          className="absolute -right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-md"
          animate={{ rotate: [0, 25, -10, 0], y: [0, -5, 4, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <Wrench className="h-4 w-4 text-orange-300" />
        </motion.div>
      </div>
    </div>
  );
}
