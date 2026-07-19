import { useState } from "react";
import { Fact } from "../types";
import { Quote } from "lucide-react";

export default function FactRow({ fact }: { fact: Fact }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-sm border-b border-slate-100 py-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-left">
        <span className="text-slate-600">{fact.label}</span>
        <span className="font-medium flex items-center gap-2">
          {fact.value}
          <Quote size={12} className="text-slate-400" />
        </span>
      </button>
      {open && (
        <div className="mt-2 pl-3 border-l-2 border-slate-200 text-slate-500 italic">
          “{fact.quote}”
          <div className="not-italic text-xs text-slate-400 mt-1">
            {fact.sourceType} · {Math.round(fact.confidence * 100)}% confidence
          </div>
        </div>
      )}
    </div>
  );
}
