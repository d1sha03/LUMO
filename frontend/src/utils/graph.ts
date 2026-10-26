import type { TwinGraphData, TwinLink, TwinNode } from "@/types";

/** Deterministic pseudo-random so the twin is identical on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent damping. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const KIND_COLORS: Record<string, string> = {
  core: "#F5A623",
  income: "#4ECDC4",
  expense: "#F5A623",
  debt: "#E4736B",
  goal: "#8B7CF6",
  risk: "#E4A11B",
  scheme: "#4ECDC4",
  season: "#6FA8DC",
  family: "#F2A0A0",
  asset: "#9AD58A",
  savings: "#8FE1A8",
  insurance: "#7FB8F5",
};

/**
 * Builds the Living Financial Twin: a core node orbited by clustered
 * life-domains on a fibonacci sphere, wired to its nearest neighbours.
 */
export function buildTwinGraph(seed = 7): TwinGraphData {
  const rand = mulberry32(seed);

  const domains: { label: string; kind: TwinNode["kind"]; detail: string; metric: string }[] = [
    { label: "Daily wages", kind: "income", detail: "₹620/day · masonry, 4–5 days a week", metric: "₹11.4k/mo" },
    { label: "Shop earnings", kind: "income", detail: "Tea stall after 6pm, cash + UPI mix", metric: "₹3.8k/mo" },
    { label: "Remittances", kind: "income", detail: "Brother in Surat, monthly, informal", metric: "₹2k/mo" },
    { label: "Household spend", kind: "expense", detail: "Rice, LPG, school van, mobile data", metric: "₹7.1k/mo" },
    { label: "Medical", kind: "expense", detail: "Mother's BP medicine, private clinic", metric: "₹1.2k/mo" },
    { label: "Moneylender", kind: "debt", detail: "₹18,000 at 8%/month, informal", metric: "₹18k @ 8%" },
    { label: "SHG loan", kind: "debt", detail: "Self-help group, 24 weeks, on time", metric: "₹12k @ 1.6%" },
    { label: "Daughter's degree", kind: "goal", detail: "Polytechnic, 3 years, ₹90k total", metric: "36 mo" },
    { label: "Roof repair", kind: "goal", detail: "Monsoon-proof sheet, wants by June", metric: "₹14k" },
    { label: "Income gaps", kind: "risk", detail: "No work in 4 weeks of monsoon", metric: "high" },
    { label: "Health shock", kind: "risk", detail: "No insurance cover for the family", metric: "uncovered" },
    { label: "PM Kisan", kind: "scheme", detail: "Eligible · ₹6,000/yr, unclaimed", metric: "₹6k/yr" },
    { label: "PM SVANidhi", kind: "scheme", detail: "Street vendor collateral-free credit", metric: "₹10k" },
    { label: "Jan Dhan", kind: "scheme", detail: "Account dormant since 2022", metric: "dormant" },
    { label: "Monsoon curve", kind: "season", detail: "Earnings dip 62% in Jul–Aug", metric: "Jul–Aug" },
    { label: "Festival spike", kind: "season", detail: "Diwali week = 2.4× shop revenue", metric: "Nov" },
    { label: "Family of five", kind: "family", detail: "Two schooling children, one elder", metric: "5 people" },
    { label: "Shared KYC", kind: "family", detail: "Husband's ID linked to shop licence", metric: "linked" },
    { label: "Auto rickshaw", kind: "asset", detail: "Hired, ₹380/day, owned in 2029", metric: "₹1.9L" },
    { label: "Gold", kind: "asset", detail: "22g, pledged once, never sold", metric: "22g" },
    { label: "Cattle", kind: "asset", detail: "Two buffalo, milk sold locally", metric: "₹34k" },
  ];

  const nodes: TwinNode[] = [
    {
      id: "core",
      label: "Meena's twin",
      kind: "core",
      position: [0, 0, 0],
      weight: 1.7,
      detail: "A living model — 214 signals, refreshed after every conversation.",
      metric: "214 signals",
    },
  ];

  // Fibonacci sphere distribution with jitter keeps clusters organic, not grid-like.
  const golden = Math.PI * (3 - Math.sqrt(5));
  domains.forEach((d, i) => {
    const y = 1 - (i / (domains.length - 1)) * 2;
    const radiusAt = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const jitterR = 2.5 + rand() * 0.85;
    nodes.push({
      id: `${d.kind}-${i}`,
      label: d.label,
      kind: d.kind,
      weight: 0.72 + rand() * 0.5,
      position: [
        Math.cos(theta) * radiusAt * jitterR,
        y * jitterR * 0.82,
        Math.sin(theta) * radiusAt * jitterR,
      ],
      detail: d.detail,
      metric: d.metric,
    });
  });

  const links: TwinLink[] = [];
  const orbitals = nodes.filter((n) => n.kind !== "core");
  orbitals.forEach((n) => {
    links.push({ from: "core", to: n.id, strength: 0.55 + rand() * 0.35 });
  });

  // Weave neighbour links between same-cluster & adjacent nodes.
  for (let i = 0; i < orbitals.length; i++) {
    const a = orbitals[i];
    const dists = orbitals
      .filter((b) => b.id !== a.id)
      .map((b) => ({
        b,
        d: a.position.reduce(
          (acc, v, k) => acc + (v - b.position[k]) ** 2,
          0,
        ),
      }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    dists.forEach(({ b, d }) => {
      if (d < 6.2) links.push({ from: a.id, to: b.id, strength: 0.3 + rand() * 0.4 });
    });
  }

  return { nodes, links };
}

export const nodeById = (nodes: TwinNode[], id: string) =>
  nodes.find((n) => n.id === id);
