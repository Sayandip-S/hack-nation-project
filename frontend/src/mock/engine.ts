import { vertical } from "../config/vertical";
import { inventorySummary } from "./data";
import { Call, Fact, JobSpec, Mover, Quote, TranscriptTurn } from "../types";

type Persona = Call["persona"];
type Wave = 1 | 2 | 3;

export function personaForMover(m: Mover): Persona {
  if (m.id === "mov-c") return "evasive";
  if (m.id === "mov-b") return "guarded";
  if (m.id === "mov-d" || m.id === "mov-e") return "upseller";
  return "cooperative";
}

export function buildPitch(spec: JobSpec, callGuidelines: string[] = []): string[] {
  const inv = inventorySummary(spec);
  const lines = vertical.callScriptTemplate.map(line =>
    line
      .replace("{{originCity}}", spec.originCity)
      .replace("{{originStairs}}", String(spec.originStairs))
      .replace("{{destCity}}", spec.destCity)
      .replace("{{destStairs}}", String(spec.destStairs))
      .replace("{{distanceMiles}}", String(spec.distanceMiles))
      .replace("{{longCarryFt}}", String(spec.longCarryFt))
      .replace("{{inventorySummary}}", inv)
      .replace("{{dateStart}}", spec.dateWindow[0])
      .replace("{{dateEnd}}", spec.dateWindow[1])
      .replace("{{services}}", spec.services.join(", ")),
  );
  for (const instruction of callGuidelines) {
    const trimmed = instruction.trim();
    if (trimmed) lines.push(`Customer instruction for this call: ${trimmed}`);
  }
  return lines;
}

/** Base totals before negotiation (wave 1). */
function baseQuoteEur(persona: Persona): number {
  if (persona === "cooperative") return 2050;
  if (persona === "guarded") return 2200;
  if (persona === "evasive") return 1200;
  return 2350; // upseller
}

function concessionEur(persona: Persona, wave: Wave): number {
  if (wave < 2) return 0;
  if (persona === "cooperative") return 150;
  if (persona === "upseller") return 200;
  if (persona === "guarded") return 80;
  return 0; // evasive won't truly concede
}

function feeFacts(callId: string, persona: Persona, total: number): Fact[] {
  const mk = (key: string, label: string, amount: number, quote: string, conf = 0.95): Fact => ({
    id: `${callId}-${key}`,
    key,
    label,
    value: `€${amount}`,
    quote,
    confidence: conf,
    sourceType: "transcript",
    sourceRef: `${callId}#turn`,
  });

  if (persona === "evasive") {
    return [
      mk("base_labor", "Base labor", 900, "Crew day rate, nine hundred.", 0.85),
      mk("travel_fee", "Travel", 300, "Fuel and drive, three hundred."),
      // hidden until pressure — still extracted as late reveals
      mk("stair_fee", "Stair carry", 0, "Stairs? Uh… we might add that later.", 0.7),
      mk("long_carry", "Long carry", 0, "Long carry depends — not in that number.", 0.7),
    ];
  }
  if (persona === "guarded") {
    return [
      mk("base_labor", "Base labor (est.)", Math.round(total * 0.7), "Roughly seventy percent is labor — we'd confirm on site."),
      mk("travel_fee", "Travel (est.)", Math.round(total * 0.3), "Travel is baked into the range."),
    ];
  }
  if (persona === "upseller") {
    return [
      mk("base_labor", "Base labor", 1600, "The crew rate covers the load and haul, 1,600."),
      mk("stair_fee", "Stair carry", 180, "Two flights at origin, that's 180."),
      mk("long_carry", "Long carry", 120, "Sixty-foot carry adds 120."),
      mk("travel_fee", "Travel", 350, "Drive time and fuel, 350."),
      mk("packing_upsell", "Packing add-on", 100, "Optional packing service, one hundred."),
    ];
  }
  // cooperative — sums to ~total
  return [
    mk("base_labor", "Base labor", 1500, "The crew rate covers the load and haul, 1,500."),
    mk("stair_fee", "Stair carry", 150, "Two flights at origin, that's 150."),
    mk("long_carry", "Long carry", 90, "Sixty-foot carry adds 90."),
    mk("travel_fee", "Travel", 310, "Drive time and fuel, 310."),
  ];
}

function buildWave1Script(persona: Persona, pitch: string[], open: number): TranscriptTurn[] {
  const t0: TranscriptTurn = { id: "t1", speaker: "agent", t: 1, text: pitch.join(" ") };
  if (persona === "cooperative") {
    return [
      t0,
      { id: "t2", speaker: "counterpart", t: 5, text: "Sure — I can price that from what you described." },
      { id: "t3", speaker: "agent", t: 8, text: "Please itemise labor, stairs, long carry, and travel." },
      { id: "t4", speaker: "counterpart", t: 12, text: `Itemised: labor 1,500, stairs 150, long carry 90, travel 310 — total €${open}.` },
    ];
  }
  if (persona === "guarded") {
    return [
      t0,
      { id: "t2", speaker: "counterpart", t: 5, text: "We don't give hard numbers without seeing the place. Someone will call you back." },
      { id: "t3", speaker: "agent", t: 8, text: "Understood — can you give a ballpark against this exact inventory and stairs?" },
      { id: "t4", speaker: "counterpart", t: 12, text: `Ballpark around €${open} if the inventory holds. We'll confirm on site.` },
    ];
  }
  if (persona === "evasive") {
    return [
      t0,
      { id: "t2", speaker: "counterpart", t: 5, text: `We can do the whole thing for €${open}. Best price in town.` },
      { id: "t3", speaker: "agent", t: 8, text: "Please itemise stairs and the sixty-foot long carry against that number." },
      { id: "t4", speaker: "counterpart", t: 12, text: "Stairs and long carry… might be extra. That €1,200 is the crew day." },
    ];
  }
  return [
    t0,
    { id: "t2", speaker: "counterpart", t: 5, text: `Base is €${open - 100}, plus packing if you want it.` },
    { id: "t3", speaker: "agent", t: 8, text: "Itemise labor, stairs, long carry, travel — no packing unless we ask." },
    { id: "t4", speaker: "counterpart", t: 12, text: `Fine: labor 1,600, stairs 180, long carry 120, travel 350 — €${open} without packing.` },
  ];
}

function leverageTurns(
  persona: Persona,
  citedQuoteEur: number,
  open: number,
  final: number,
  startT: number,
): TranscriptTurn[] {
  const lever = vertical.negotiationLevers[0].prompt.replace("{{altPrice}}", String(citedQuoteEur));
  if (persona === "evasive") {
    return [
      { id: "t5", speaker: "agent", t: startT, text: lever },
      { id: "t6", speaker: "counterpart", t: startT + 4, text: "Price is firm. Stairs and carry are separate if you want them included.", priceDeltaEur: 0 },
      { id: "t7", speaker: "agent", t: startT + 7, text: "We'll pass until fees are fully itemised against the job spec." },
    ];
  }
  if (persona === "guarded") {
    return [
      { id: "t5", speaker: "agent", t: startT, text: lever },
      { id: "t6", speaker: "counterpart", t: startT + 4, text: `If that competing quote is binding, I can come down to about €${final}.`, priceDeltaEur: final - open },
      { id: "t7", speaker: "agent", t: startT + 7, text: "Please confirm that number against the same stairs and inventory." },
    ];
  }
  if (persona === "upseller") {
    return [
      { id: "t5", speaker: "agent", t: startT, text: lever },
      { id: "t6", speaker: "counterpart", t: startT + 4, text: `I'll drop packing and cut travel — €${final} all-in for your window.`, priceDeltaEur: final - open },
      { id: "t7", speaker: "agent", t: startT + 7, text: "Thank you — please send that itemised in writing." },
    ];
  }
  return [
    { id: "t5", speaker: "agent", t: startT, text: lever },
    { id: "t6", speaker: "counterpart", t: startT + 4, text: `Let me see… I can waive the stair fee and match at €${final}.`, priceDeltaEur: final - open },
    { id: "t7", speaker: "agent", t: startT + 7, text: "Perfect — please confirm the itemised waiver in writing." },
  ];
}

export function runCall(
  mover: Mover,
  spec: JobSpec,
  wave: Wave,
  citedQuoteEur: number | null,
  citedQuoteId: string | null,
  onUpdate: (partial: Partial<Call> & { id: string; moverId: string }, facts: Fact[]) => void,
  callGuidelines: string[] = [],
): () => void {
  const persona = personaForMover(mover);
  const id = `call-${mover.id}-w${wave}-${Date.now()}`;
  const pitch = buildPitch(spec, callGuidelines);
  const open = baseQuoteEur(persona);
  const drop = concessionEur(persona, wave);
  const final = open - drop;
  const timers: number[] = [];

  let script = buildWave1Script(persona, pitch, open);
  if (wave >= 2 && citedQuoteEur != null) {
    const lastT = script[script.length - 1].t;
    script = [...script, ...leverageTurns(persona, citedQuoteEur, open, final, lastT + 2)];
  }

  const base = {
    id,
    moverId: mover.id,
    persona,
    pitchDelivered: pitch,
    quoteLines: [] as Call["quoteLines"],
    wave,
    citedQuoteId: citedQuoteId ?? undefined,
    citedQuoteEur: citedQuoteEur ?? undefined,
  };

  onUpdate({ ...base, status: "dialing", transcript: [] }, []);
  timers.push(window.setTimeout(() => onUpdate({ ...base, status: "in_progress" }, []), 700));

  const acc: TranscriptTurn[] = [];
  script.forEach((turn) => {
    timers.push(window.setTimeout(() => {
      acc.push(turn);
      onUpdate({ ...base, status: wave >= 2 ? "negotiating" : "in_progress", transcript: [...acc] }, []);
    }, 1000 + turn.t * 320));
  });

  const endAt = 1000 + script[script.length - 1].t * 320 + 800;
  timers.push(window.setTimeout(() => {
    const facts = feeFacts(id, persona, final);
    const quoteLines = facts.map(f => ({
      id: f.id,
      label: f.label,
      amountEur: parseInt(f.value.replace(/[^\d]/g, ""), 10) || 0,
      note: f.key.includes("stair") && drop && persona === "cooperative" && wave >= 2 ? "Waived in negotiation" : undefined,
    }));
    // Adjust stair fee to 0 visually when cooperative concedes
    if (persona === "cooperative" && wave >= 2 && drop) {
      const stair = quoteLines.find(q => q.label.toLowerCase().includes("stair"));
      if (stair) stair.amountEur = 0;
    }

    onUpdate({
      ...base,
      status: "completed",
      terminalOutcome: wave >= 2 && drop ? "negotiated" : persona === "guarded" ? "callback" : "answered_quote",
      durationSec: script[script.length - 1].t + 3,
      confidence: 0.93,
      summary: wave >= 2 && drop
        ? `Wave ${wave}: leveraged €${citedQuoteEur} → €${final} (was €${open}).`
        : `Wave ${wave}: quoted €${open}. ${persona === "evasive" ? "Fees incomplete — lowball risk." : "Itemised against job spec."}`,
      transcript: [...acc],
      quoteLines,
      quotedTotalEur: open,
      initialQuoteEur: open,
      finalQuoteEur: wave >= 2 ? final : open,
      negotiatedTotalEur: wave >= 2 ? final : undefined,
      recordingUrl: `mock://recording/${id}`,
    }, facts);
  }, endAt));

  return () => timers.forEach(clearTimeout);
}

export function buildQuote(mover: Mover, marketMedian = vertical.marketMedianEur): Quote | undefined {
  const call = [...mover.calls].reverse().find(c => c.status === "completed");
  if (!call) return undefined;
  const total = call.finalQuoteEur ?? call.quotedTotalEur ?? call.initialQuoteEur;
  if (total == null) return undefined;

  const lineItems = (call.quoteLines ?? []).map(q => ({
    key: q.id,
    label: q.label,
    amountEur: q.amountEur,
    factId: q.id,
  }));

  const evasiveIncomplete = call.persona === "evasive" && lineItems.some(l => /stair|long carry/i.test(l.label) && l.amountEur === 0);

  const comparability: Quote["comparability"] = evasiveIncomplete ? "invalid" : "valid";
  const vsMedianPct = Math.round(((total - marketMedian) / marketMedian) * 100);

  return {
    totalEur: total,
    lineItems,
    comparability,
    invalidReason: evasiveIncomplete ? "Material fees (stairs / long carry) not included in the quoted total." : undefined,
    vsMedianPct,
    rationale: comparability === "invalid"
      ? `${mover.companyName}'s €${total} is not comparable — incomplete against the frozen job spec.`
      : `${mover.companyName} at €${total} (${vsMedianPct >= 0 ? "+" : ""}${vsMedianPct}% vs market median €${marketMedian}).`,
  };
}

export function detectMoverRisks(mover: Mover, quote?: Quote): import("../types").RiskFlag[] {
  const flags: import("../types").RiskFlag[] = [];
  const q = quote ?? mover.quote;
  if (q && q.totalEur < vertical.marketMedianEur * vertical.lowballThreshold) {
    flags.push({
      id: `${mover.id}-low`,
      ruleId: "below_market",
      severity: "high",
      explanation: "Quote is 30%+ below market — documented lowball-then-upcharge pattern.",
      evidenceFactId: q.lineItems[0]?.factId,
    });
  }
  const call = [...mover.calls].reverse().find(c => c.status === "completed");
  if (call?.persona === "evasive") {
    flags.push({
      id: `${mover.id}-hidden`,
      ruleId: "hidden_fees",
      severity: "medium",
      explanation: "Stair / long-carry fees only surfaced under pressure — not in the headline number.",
    });
  }
  if (call?.persona === "guarded" && call.terminalOutcome === "callback") {
    flags.push({
      id: `${mover.id}-stone`,
      ruleId: "stonewall_price",
      severity: "medium",
      explanation: "Would not commit to a binding itemised quote on the phone.",
    });
  }
  return flags;
}
