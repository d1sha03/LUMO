import { motion } from "framer-motion";
import { easeLumo } from "@/animations/variants";

/**
 * Placeholder shown while a split section is being fetched. It reserves the
 * same vertical rhythm so Lenis never jumps when the real content lands.
 */
export function SectionFallback({
  label,
  height = "auto",
  tone = "light",
}: {
  label: string;
  height?: string;
  tone?: "light" | "dark";
}) {
  const ink = tone === "dark" ? "rgba(255,255,255," : "rgba(27,31,94,";
  return (
    <section
      aria-busy="true"
      aria-label={`${label} is loading`}
      className="relative flex w-full items-center justify-center px-6 py-32 md:py-44"
      style={{ minHeight: height === "auto" ? "60svh" : height }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: `${ink}0.05)` }}
            animate={{ scale: [0.9, 1.12, 0.9], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute inset-3 rounded-full border"
            style={{ borderColor: `${ink}0.14)` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="relative h-2.5 w-2.5 rounded-full bg-amber-warm"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <motion.p
          className="mono text-[0.68rem] uppercase tracking-[0.3em]"
          style={{ color: `${ink}0.4)` }}
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.p>
        <div className="flex w-40 flex-col gap-2">
          {[100, 74, 88].map((w, i) => (
            <motion.span
              key={i}
              className="h-1.5 rounded-full"
              style={{ width: `${w}%`, background: `${ink}0.07)` }}
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.1 + i * 0.12, duration: 0.9, ease: easeLumo }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
