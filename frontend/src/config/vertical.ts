/**
 * Vertical configuration — movers (Corridoor AI).
 * Swap this file to retarget without rewriting agent logic.
 */
export const vertical = {
  id: "movers",
  name: "Moving quotes",
  counterpartLabel: "dispatcher",
  counterpartsPlural: "movers",
  jobNoun: "move job spec",
  currency: "EUR",
  cityDefault: "Munich → Berlin",

  marketMedianEur: 1850,
  lowballThreshold: 0.7, // 30%+ below median

  phases: [
    {
      id: "intake" as const,
      title: "The Estimator",
      blurb: "Capture one frozen job spec — voice and/or documents — then confirm.",
    },
    {
      id: "calls" as const,
      title: "The Caller",
      blurb: "Phone movers with the same job every time; extract itemised quotes.",
    },
    {
      id: "close" as const,
      title: "The Closer",
      blurb: "Leverage bids, negotiate prices down, recommend with evidence.",
    },
  ],

  agentProfiles: [
    {
      id: "estimator" as const,
      phase: "intake" as const,
      number: "01",
      title: "The Estimator",
      subtitle: "Intake by interview or documents",
      behaviour: "Asks what a professional estimator asks. Parses inventory lists, photos, and prior quotes into one structured JSON job spec. Never dials until you confirm the brief.",
      traits: [
        "ElevenLabs voice interview",
        "Document parsing → same JSON spec",
        "User confirmation before any calls",
        "Spec hash proves identical job every call",
      ],
      stackHint: "ElevenLabs Agents · structured JSON JobSpec",
    },
    {
      id: "caller" as const,
      phase: "calls" as const,
      number: "02",
      title: "The Caller",
      subtitle: "Parallel quote gathering",
      behaviour: "Phones the market with the locked job verbatim. Handles stonewalling and “someone will call you back.” Extracts itemised, comparable quotes across distinct negotiation styles.",
      traits: [
        "Identical job description every call",
        "3+ counterpart negotiation styles",
        "Itemised fees in structured form",
        "Call list from Places / Yelp-style data",
      ],
      stackHint: "Twilio/SIP or simulated counter-agents · batch dial",
    },
    {
      id: "closer" as const,
      phase: "close" as const,
      number: "03",
      title: "The Closer",
      subtitle: "Negotiation & reporting",
      behaviour: "Leverages competing bids (“I have a binding quote for €X”), pushes fees, flags 30%+ below-market lowballs. Ranks quotes with transcripts, recordings, and a plain-language recommendation.",
      traits: [
        "Price moves mid-call via leverage",
        "Below-market red-flag rules",
        "Ranked evidence-backed report",
        "Transcript + recording citations",
      ],
      stackHint: "Negotiation levers from vertical config",
    },
  ],

  jobSpecFields: [
    { key: "originCity", label: "Origin city", type: "text", required: true },
    { key: "originStairs", label: "Origin stairs (flights)", type: "number", required: true },
    { key: "destCity", label: "Destination city", type: "text", required: true },
    { key: "destStairs", label: "Dest stairs (flights)", type: "number", required: true },
    { key: "distanceMiles", label: "Distance (miles)", type: "number", required: true },
    { key: "longCarryFt", label: "Long carry (ft)", type: "number", required: false },
    { key: "dateWindow", label: "Date window", type: "text", required: true },
  ],

  callScriptTemplate: [
    "Hi — I'm calling from Corridoor AI, an AI moving coordinator, to get an itemised quote for a residential move.",
    "Job: {{originCity}} ({{originStairs}} flights) to {{destCity}} ({{destStairs}} flights), about {{distanceMiles}} miles, long carry {{longCarryFt}} ft.",
    "We've surveyed the home with photos. Inventory estimate: {{inventorySummary}}. Date window {{dateStart}} to {{dateEnd}}. Services: {{services}}. Please itemise labor, stairs, long carry, truck size, and travel based on that inventory.",
  ],

  benchmarks: {
    marketMedianEur: 2100,
    lowballRatio: 0.7,
  },

  redFlagRules: [
    { id: "below_market", severity: "high", when: "quote < 70% of market median", lever: "Treat as lowball; press for hidden fees before trusting the number." },
    { id: "hidden_fees", severity: "medium", when: "stair/long-carry fees appear only under pressure", lever: "Demand full itemisation against the frozen job spec." },
    { id: "stonewall_price", severity: "medium", when: "won't quote on phone", lever: "Lock a callback; do not accept a vague range as binding." },
  ],

  negotiationLevers: [
    { id: "leverage_competing", label: "Leverage competing bid", prompt: "I have an itemised quote from another company at €{{altPrice}}. Can you beat it?" },
    { id: "question_fees", label: "Question fees", prompt: "Please itemise stair carry, long carry, and travel against the job I described." },
    { id: "ask_concession", label: "Ask for concession", prompt: "If we book this week in the date window, can you waive a fee or match that number?" },
    { id: "challenge_outlier", label: "Challenge lowball", prompt: "That total looks far below market for this inventory — what fees are still outstanding?" },
  ],

  counterpartPersonas: [
    {
      id: "cooperative",
      label: "Cooperative",
      style: "Itemises willingly; quotes near market; concedes when leveraged.",
      negotiationYield: "high",
    },
    {
      id: "guarded",
      label: "Stonewaller",
      style: "“We need to see it first” — rough range, resists itemisation.",
      negotiationYield: "medium",
    },
    {
      id: "evasive",
      label: "Lowballer",
      style: "Quotes well below market; hides stair/long-carry until pressed.",
      negotiationYield: "low",
    },
    {
      id: "upseller",
      label: "Hard-sell upseller",
      style: "Base quote plus add-ons; can be negotiated down with leverage.",
      negotiationYield: "high",
    },
  ],

  documentTypes: [
    { id: "photo", label: "Photos / rooms" },
    { id: "quote", label: "Existing mover quote" },
    { id: "bill", label: "Prior move invoice" },
    { id: "inventory", label: "Inventory list" },
  ],

  voiceInterview: [
    { id: "v1", q: "What's the origin city for the move?", mapsTo: "originCity" },
    { id: "v2", q: "How many flights of stairs at the origin?", mapsTo: "originStairs" },
    { id: "v3", q: "What's the destination city?", mapsTo: "destCity" },
    { id: "v4", q: "How many flights of stairs at the destination?", mapsTo: "destStairs" },
    { id: "v5", q: "Roughly how many miles between them?", mapsTo: "distanceMiles" },
    { id: "v6", q: "Any long carry in feet from truck to door?", mapsTo: "longCarryFt" },
    { id: "v7", q: "What's your date window? (e.g. 2026-08-08 to 2026-08-10)", mapsTo: "dateWindow" },
  ],
} as const;

export type PhaseId = (typeof vertical.phases)[number]["id"];
export type PersonaId = (typeof vertical.counterpartPersonas)[number]["id"];
export type AgentProfileId = (typeof vertical.agentProfiles)[number]["id"];
