import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { estimateFromInventory } from "../mock/data";

export default function PhotoInventoryCapture() {
  const {
    inventoryPhotos, analyzingPhotos, ingestInventoryMedia, jobSpec,
  } = useStore();
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [lastRooms, setLastRooms] = useState<string[]>([]);
  const est = estimateFromInventory(jobSpec);

  const onFiles = async (files: FileList | null, source: "upload" | "camera") => {
    if (!files?.length) return;
    await ingestInventoryMedia(files, source);
    // rooms will be on newest photos after state update — approximate from File names for toast
    setLastRooms([source === "camera" ? "Camera capture" : `${files.length} photo(s)`]);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Photo survey</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload room photos or use your camera. atlas.ai estimates furniture and volume,
              then uses that inventory when calling movers.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={analyzingPhotos}
            onClick={() => uploadRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-medium text-slate-800 hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
          >
            <ImagePlus size={18} className="text-primary" />
            Upload images
          </button>
          <button
            type="button"
            disabled={analyzingPhotos}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-3.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            <Camera size={18} />
            Use camera
          </button>
        </div>

        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { void onFiles(e.target.files, "upload"); e.target.value = ""; }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { void onFiles(e.target.files, "camera"); e.target.value = ""; }}
        />

        {analyzingPhotos && (
          <div className="mt-4 flex items-center gap-2 text-sm text-primary">
            <Loader2 size={16} className="animate-spin" />
            Analyzing room… detecting furniture and volume
          </div>
        )}

        {!analyzingPhotos && lastRooms.length > 0 && (
          <p className="mt-3 text-xs text-success">
            Survey updated — inventory locked into the mover pitch ({est.volumeM3} m³ · {est.moversNeeded} movers).
          </p>
        )}
      </div>

      {inventoryPhotos.length > 0 && (
        <div className="card p-4">
          <div className="text-sm font-semibold text-slate-900 mb-3">
            Surveyed rooms ({inventoryPhotos.length})
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {inventoryPhotos.map(p => (
              <div key={p.id} className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50">
                <img src={p.previewUrl} alt={p.roomGuess} className="w-full h-36 object-cover" />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{p.roomGuess}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {p.source}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {p.detectedItems.map(d => (
                      <li key={d.item} className="text-xs text-slate-600 flex justify-between gap-2">
                        <span>{d.qty}× {d.item}</span>
                        <span className="font-metric text-slate-400">{Math.round(d.confidence * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
