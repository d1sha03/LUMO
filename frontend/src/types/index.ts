export type NodeKind =
  | "income"
  | "expense"
  | "debt"
  | "goal"
  | "risk"
  | "scheme"
  | "season"
  | "family"
  | "asset"
  | "savings"
  | "insurance"
  | "core";

export interface TwinNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** normalised position on a unit-ish sphere */
  position: [number, number, number];
  /** relative visual weight 0.5 – 1.6 */
  weight: number;
  detail: string;
  metric?: string;
}

export interface TwinLink {
  from: string;
  to: string;
  strength: number;
}

export interface TwinGraphData {
  nodes: TwinNode[];
  links: TwinLink[];
}

export interface Pathway {
  id: string;
  code: string;
  title: string;
  summary: string;
  months: number;
  confidence: number;
  outcome: string;
  risk: string;
  benefit: string;
  steps: { label: string; month: number }[];
  color: string;
}

export interface Scheme {
  id: string;
  name: string;
  subtitle: string;
  amount: string;
  match: number;
  why: string;
  tags: string[];
}

export interface Principle {
  id: string;
  label: string;
  headline: string;
  body: string;
  detail: string[];
  icon: string;
}

export interface TechBrain {
  id: string;
  name: string;
  role: string;
  specialty: string;
  color: string;
}

export interface TechLayer {
  id: string;
  name: string;
  kind: string;
  detail: string;
}

export interface ImpactStat {
  id: string;
  value: number;
  suffix: string;
  label: string;
  detail: string;
  decimals?: number;
}

export interface ChatTurn {
  id: string;
  role: "user" | "lumo";
  lang: string;
  text: string;
  /** nodes revealed / emphasised by this turn */
  reveals?: string[];
  translation?: string;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  quote: string;
  stat: string;
  detail: string;
}

export type ThemeMode = "light" | "dark";
export type PerformanceTier = "low" | "mid" | "high";
