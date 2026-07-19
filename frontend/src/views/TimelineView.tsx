import { useState } from "react";
import { ChevronDown } from "lucide-react";

const MILESTONES = [
  {
    title: "Inventory Complete",
    when: "Today",
    done: true,
    subtasks: ["Rooms catalogued", "Weight & volume estimated", "Truck size recommended"],
  },
  {
    title: "Receive Quotes",
    when: "Next",
    done: false,
    subtasks: ["Call top-rated movers", "Extract structured fees", "Normalize comparability"],
  },
  {
    title: "Choose Company",
    when: "Jul 24",
    done: false,
    subtasks: ["Compare matrix", "Review insurance", "Approve atlas.ai recommendation"],
  },
  {
    title: "Pack Living Room",
    when: "Aug 8",
    done: false,
    subtasks: ["Fragile wrap", "Label boxes", "Photo inventory"],
  },
  {
    title: "Disconnect Utilities",
    when: "Aug 12",
    done: false,
    subtasks: ["Electricity", "Internet", "Insurance address"],
  },
  {
    title: "Moving Day",
    when: "Aug 14",
    done: false,
    subtasks: ["Parking permit", "Elevator booking", "Crew arrival window"],
  },
  {
    title: "Connect Internet",
    when: "Aug 15",
    done: false,
    subtasks: ["Technician slot", "Router setup", "Confirm service"],
  },
  {
    title: "Finish Move",
    when: "Aug 16",
    done: false,
    subtasks: ["Final walkthrough", "Deposit checklist", "Archive documents"],
  },
];

export default function TimelineView() {
  const [open, setOpen] = useState<string | null>("Receive Quotes");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Move Timeline</h1>
        <p className="text-sm text-zinc-400 mt-1">Your project roadmap — expand any milestone for dependencies.</p>
      </div>

      <div className="card p-6">
        <ol>
          {MILESTONES.map((m, i) => {
            const expanded = open === m.title;
            return (
              <li key={m.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      m.done ? "bg-success" : i === 1 ? "bg-primary ring-4 ring-primary/20" : "bg-zinc-600"
                    }`}
                  />
                  {i < MILESTONES.length - 1 && <span className="w-px flex-1 bg-zinc-700 my-1 min-h-[2rem]" />}
                </div>
                <div className="flex-1 pb-6 -mt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : m.title)}
                    className="w-full text-left flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{m.when}</div>
                      <div className={`text-base mt-0.5 ${m.done ? "text-zinc-500 line-through" : "font-semibold text-zinc-100"}`}>
                        {m.title}
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-zinc-500 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && (
                    <ul className="mt-2 space-y-1.5 pl-1">
                      {m.subtasks.map(s => (
                        <li key={s} className="text-sm text-zinc-400 flex gap-2">
                          <span className="text-zinc-600">○</span> {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
