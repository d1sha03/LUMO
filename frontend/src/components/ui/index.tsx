import {
  motion,
  useInView,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { easeLumo, fadeUp, staggerParent } from "@/animations/variants";
import { useCountUp, useTilt } from "@/hooks/useInteractions";

/* ── Buttons ─────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "amber";

interface LumoButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-deep text-cream shadow-[0_10px_30px_-12px_rgba(27,31,94,0.55)] hover:shadow-[0_18px_44px_-14px_rgba(27,31,94,0.7)]",
  amber:
    "bg-amber-warm text-ink shadow-[0_10px_30px_-12px_rgba(245,166,35,0.6)] hover:shadow-[0_20px_46px_-14px_rgba(245,166,35,0.75)]",
  secondary:
    "bg-transparent text-indigo-deep dark:text-cream border border-indigo-deep/18 dark:border-white/18 hover:border-amber-warm/60",
  ghost: "bg-transparent text-indigo-deep/70 dark:text-white/70 hover:text-amber-warm",
};

const SIZES = {
  sm: "h-10 px-5 text-[0.82rem]",
  md: "h-12 px-6 text-[0.9rem]",
  lg: "h-14 px-8 text-[0.98rem]",
};

export function LumoButton({
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
  ...rest
}: LumoButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.035, y: -1 }}
      whileTap={{ scale: 0.975 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium tracking-[-0.01em] transition-colors duration-500 will-change-transform",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full"
      />
      <span className="relative z-10 inline-flex items-center gap-2.5">
        {children}
        {icon}
      </span>
    </motion.button>
  );
}

/* ── Reveal helpers ──────────────────────────────────────── */

export function FadeUp({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "span" | "li";
}) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 28, filter: "blur(7px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1, ease: easeLumo, delay }}
    >
      {children}
    </Comp>
  );
}

export function Stagger({
  children,
  className,
  stagger = 0.09,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerParent(stagger, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/** Word-by-word cinematic headline reveal. */
export function Words({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.055,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={cn("inline-block", className)}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={cn("inline-block", wordClassName)}
            initial={reduce ? { opacity: 0 } : { y: "110%", opacity: 0, rotate: 2 }}
            whileInView={{ y: 0, opacity: 1, rotate: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.05, ease: easeLumo, delay: delay + i * stagger }}
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ── Layout atoms ────────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <FadeUp className={cn("flex items-center gap-3", className)}>
      <span className="h-px w-8 bg-amber-warm/70" />
      <span className="eyebrow text-amber-warm">{children}</span>
    </FadeUp>
  );
}

export function SectionShell({
  id,
  children,
  className,
  label,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={cn(
        "relative isolate w-full overflow-clip px-5 py-24 sm:px-8 md:py-32 lg:px-12 lg:py-40",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] 2xl:max-w-[1680px]", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="display-2 font-display text-slate-ink dark:text-white">
        <Words text={title} />
      </h2>
      {lede && (
        <FadeUp delay={0.12}>
          <p
            className={cn(
              "lede max-w-[52ch] text-slate-ink/70 dark:text-white/62",
              align === "center" && "mx-auto",
            )}
          >
            {lede}
          </p>
        </FadeUp>
      )}
    </div>
  );
}

/* ── Interactive atoms ───────────────────────────────────── */

export function TiltCard({
  children,
  className,
  strength = 7,
  spotlight = true,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  spotlight?: boolean;
}) {
  const { ref, style, onPointerMove, onPointerLeave } = useTilt(strength);
  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ ...style, transformStyle: "preserve-3d", transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)" }}
      className={cn(
        "group relative overflow-hidden rounded-[26px] transition-shadow duration-700",
        className,
      )}
    >
      {spotlight && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgba(245,166,35,0.16), transparent 62%)",
          }}
        />
      )}
      {children}
    </div>
  );
}

export function Counter({
  value,
  suffix = "",
  decimals = 0,
  label,
  detail,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  label?: string;
  detail?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const current = useCountUp(value, inView, 2200, decimals);
  return (
    <div ref={ref} className={cn("flex flex-col gap-2", className)}>
      <span className="mono display-3 font-display text-slate-ink dark:text-white">
        {new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(current)}
        <span className="text-amber-warm">{suffix}</span>
      </span>
      {label && (
        <span className="text-[0.9rem] font-medium text-slate-ink/80 dark:text-white/75">
          {label}
        </span>
      )}
      {detail && (
        <span className="text-[0.8rem] leading-relaxed text-slate-ink/50 dark:text-white/45">
          {detail}
        </span>
      )}
    </div>
  );
}

export function Marquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div className={cn("mask-fade-x relative flex overflow-hidden", className)}>
      <div className="flex min-w-full shrink-0 animate-marquee items-center gap-10 will-change-transform">
        {[...items, ...items].map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex shrink-0 items-center gap-3 text-[0.78rem] font-medium uppercase tracking-[0.22em] text-slate-ink/40 dark:text-white/35"
          >
            <span className="h-1 w-1 rounded-full bg-amber-warm/70" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Pill({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "amber" | "teal";
}) {
  const tones = {
    neutral: "border-indigo-deep/12 text-slate-ink/70 dark:border-white/12 dark:text-white/65",
    amber: "border-amber-warm/40 bg-amber-warm/10 text-[#8a5a00] dark:text-amber-soft",
    teal: "border-teal-muted/40 bg-teal-muted/10 text-[#0c6d67] dark:text-teal-soft",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.72rem] font-medium tracking-[-0.005em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
