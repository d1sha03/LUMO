/**
 * Demo mode controller + shared app state. A single hook that every screen in
 * the demo app consumes. Handles:
 *
 *   • persona selection
 *   • language
 *   • turn-by-turn playback (manual or auto)
 *   • twin engine snapshot
 *   • what-if scenarios
 *   • hackathon demo mode — a scripted 3½-minute walkthrough
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PERSONAS, personaById, type PersonaProfile } from "@/data/personas";
import { type LangCode } from "@/data/i18n";
import {
  TwinEngine,
  WHAT_IF_EVENTS,
  type TurnResult,
  type TwinSnapshot,
  type WhatIfEvent,
  type WhatIfResult,
} from "@/app/twinEngine";

export type ScreenId =
  | "conversation"
  | "twin"
  | "dashboard"
  | "pathways"
  | "simulator"
  | "schemes"
  | "explain"
  | "report";

export interface DemoState {
  persona: PersonaProfile;
  language: LangCode;
  snapshot: TwinSnapshot;
  turnIndex: number;
  lastTurn: TurnResult | null;
  whatIf: WhatIfResult | null;
  activeEvent: WhatIfEvent | null;
  screen: ScreenId;
  /** which pathway card is selected */
  activePath: string;
  demoMode: {
    active: boolean;
    paused: boolean;
    stepIndex: number;
  };
}

/** Scripted demo-mode timeline. Each entry: wait ms, then action. */
interface DemoStep {
  waitMs: number;
  label: string;
  run: (ctx: DemoScriptApi) => void;
  /** screen to focus during this step */
  screen: ScreenId;
}

interface DemoScriptApi {
  advanceTurn(): void;
  setScreen(s: ScreenId): void;
  setActivePath(id: string): void;
  applyWhatIf(eventId: string): void;
  setLanguage(l: LangCode): void;
  setPersona(id: string): void;
}

function buildDemoScript(personaId: string): DemoStep[] {
  const p = personaById(personaId);
  if (!p) return [];
  const totalTurns = p.script.length;
  const steps: DemoStep[] = [
    { waitMs: 900, label: "Begin demo", run: (c) => c.setScreen("conversation"), screen: "conversation" },
  ];

  // Play each scripted turn with natural spacing
  for (let i = 0; i < totalTurns; i++) {
    steps.push({
      waitMs: i === 0 ? 1400 : 2600,
      label: `Turn ${i + 1}: ${p.script[i].text.slice(0, 28)}…`,
      run: (c) => {
        c.advanceTurn();
      },
      screen: "conversation",
    });
    // flash the twin briefly so judges see it grow
    if (i >= 1 && i % 2 === 0) {
      steps.push({
        waitMs: 1600,
        label: "Twin grows",
        run: (c) => c.setScreen("twin"),
        screen: "twin",
      });
    }
  }

  steps.push(
    { waitMs: 2200, label: "Dashboard", run: (c) => c.setScreen("dashboard"), screen: "dashboard" },
    { waitMs: 2600, label: "Pathways", run: (c) => { c.setScreen("pathways"); c.setActivePath("A"); }, screen: "pathways" },
    { waitMs: 2000, label: "Pathway B", run: (c) => c.setActivePath("B"), screen: "pathways" },
    { waitMs: 2000, label: "Pathway C", run: (c) => c.setActivePath("C"), screen: "pathways" },
    { waitMs: 2200, label: "Schemes", run: (c) => c.setScreen("schemes"), screen: "schemes" },
    { waitMs: 2200, label: "Simulator", run: (c) => { c.setScreen("simulator"); c.applyWhatIf("medical"); }, screen: "simulator" },
    { waitMs: 1800, label: "Simulate harvest", run: (c) => c.applyWhatIf("poor-harvest"), screen: "simulator" },
    { waitMs: 1800, label: "Simulate new job", run: (c) => c.applyWhatIf("new-job"), screen: "simulator" },
    { waitMs: 2200, label: "Reasoning", run: (c) => c.setScreen("explain"), screen: "explain" },
    { waitMs: 2200, label: "Report", run: (c) => c.setScreen("report"), screen: "report" },
  );
  return steps;
}

export function useDemoApp(initialPersona = "meena") {
  const engine = useRef(new TwinEngine());
  const [persona, setPersonaState] = useState<PersonaProfile>(
    personaById(initialPersona) ?? PERSONAS[0],
  );
  const [language, setLanguage] = useState<LangCode>("en");
  const [screen, setScreen] = useState<ScreenId>("conversation");
  const [turnIndex, setTurnIndex] = useState(-1);
  const [lastTurn, setLastTurn] = useState<TurnResult | null>(null);
  const [activePath, setActivePath] = useState<string>("A");
  const [whatIf, setWhatIf] = useState<WhatIfResult | null>(null);
  const [activeEvent, setActiveEvent] = useState<WhatIfEvent | null>(null);
  const [demoMode, setDemoMode] = useState({ active: false, paused: false, stepIndex: 0 });
  const [snapshot, setSnapshot] = useState<TwinSnapshot>(() => {
    engine.current.reset(personaById(initialPersona) ?? PERSONAS[0]);
    return engine.current.snapshot();
  });

  const setPersona = useCallback(
    (id: string) => {
      const p = personaById(id);
      if (!p) return;
      setPersonaState(p);
      engine.current.reset(p);
      setSnapshot(engine.current.snapshot());
      setTurnIndex(-1);
      setLastTurn(null);
      setWhatIf(null);
      setActiveEvent(null);
      setActivePath("A");
    },
    [],
  );

  const advanceTurn = useCallback(() => {
    const result = engine.current.processNextTurn();
    if (!result) return;
    setTurnIndex(result.turnIndex);
    setLastTurn(result);
    setSnapshot(engine.current.snapshot());
    // auto-pick the highest-confidence pathway from this turn
    if (result.pathways[0]) setActivePath(result.pathways[0].id);
  }, []);

  const jumpToTurn = useCallback((idx: number) => {
    engine.current.jumpTo(idx);
    setTurnIndex(idx);
    setSnapshot(engine.current.snapshot());
    // replay turn result for that index
    const p = persona;
    if (p && idx >= 0 && idx < p.script.length) {
      // rebuild last turn by replaying from scratch — cheap because script is short
      engine.current.reset(p);
      let last: TurnResult | null = null;
      for (let i = 0; i <= idx; i++) last = engine.current.processNextTurn();
      setLastTurn(last);
      setSnapshot(engine.current.snapshot());
    }
  }, [persona]);

  const applyWhatIf = useCallback((eventId: string) => {
    const event = WHAT_IF_EVENTS.find((e) => e.id === eventId);
    if (!event) return;
    setActiveEvent(event);
    setWhatIf(engine.current.simulateWhatIf(event));
  }, []);

  const clearWhatIf = useCallback(() => {
    setActiveEvent(null);
    setWhatIf(null);
  }, []);

  /* ── demo mode ─────────────────────────────────────────── */
  const script = useMemo(() => buildDemoScript(persona.id), [persona.id]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api = useMemo<DemoScriptApi>(
    () => ({
      advanceTurn,
      setScreen,
      setActivePath,
      applyWhatIf,
      setLanguage,
      setPersona,
    }),
    [advanceTurn, applyWhatIf, setPersona],
  );

  const stepForward = useCallback(() => {
    setDemoMode((prev) => {
      const next = prev.stepIndex + 1;
      if (next >= script.length) {
        return { active: false, paused: false, stepIndex: 0 };
      }
      const step = script[next];
      step.run(api);
      return { ...prev, stepIndex: next };
    });
  }, [script, api]);

  const startDemoMode = useCallback(() => {
    setPersona(persona.id); // fresh reset
    setScreen("conversation");
    setDemoMode({ active: true, paused: false, stepIndex: 0 });
    script[0]?.run(api);
  }, [persona.id, script, api]);

  const stopDemoMode = useCallback(() => {
    setDemoMode({ active: false, paused: false, stepIndex: 0 });
  }, []);

  const togglePause = useCallback(() => {
    setDemoMode((prev) => (prev.active ? { ...prev, paused: !prev.paused } : prev));
  }, []);

  useEffect(() => {
    if (!demoMode.active || demoMode.paused) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    const currentStep = script[demoMode.stepIndex];
    const nextStep = script[demoMode.stepIndex + 1];
    if (!nextStep) {
      // done
      setDemoMode({ active: false, paused: false, stepIndex: 0 });
      return;
    }
    timer.current = setTimeout(() => {
      nextStep.run(api);
      setDemoMode((prev) => ({ ...prev, stepIndex: prev.stepIndex + 1 }));
    }, currentStep?.waitMs ?? 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [demoMode, script, api]);

  return {
    persona,
    language,
    setLanguage,
    snapshot,
    turnIndex,
    lastTurn,
    whatIf,
    activeEvent,
    screen,
    setScreen,
    activePath,
    setActivePath,
    advanceTurn,
    jumpToTurn,
    applyWhatIf,
    clearWhatIf,
    demoMode,
    startDemoMode,
    stopDemoMode,
    togglePause,
    stepForward,
    script,
    setPersona,
  };
}

export type DemoApi = ReturnType<typeof useDemoApp>;
