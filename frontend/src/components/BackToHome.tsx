import { ArrowLeft } from "lucide-react";

export default function BackToHome({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-primary transition-colors"
    >
      <ArrowLeft size={15} /> Back to Home
    </button>
  );
}
