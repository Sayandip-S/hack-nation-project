import { useState } from "react";
import { Fact } from "../types";
import { Quote } from "lucide-react";

export default function FactRow({ fact }: { fact: Fact }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-sm border-b border-zinc-800 py-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-left">
        <span className="text-zinc-400">{fact.label}</span>
        <span className="font-medium flex items-center gap-2">
          {fact.value}
          <Quote size={12} className="text-zinc-500" />
        </span>
      </button>
      {open && (
        <div className="mt-2 pl-3 border-l-2 border-zinc-700 text-zinc-400 italic">
          “{fact.quote}”
          <div className="not-italic text-xs text-zinc-500 mt-1">
            {fact.sourceType} · {Math.round(fact.confidence * 100)}% confidence
          </div>
        </div>
      )}
    </div>
  );
}
