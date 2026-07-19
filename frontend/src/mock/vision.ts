import type { InventoryPhoto, JobSpec } from "../types";

const ROOM_CATALOGS: { room: string; items: { item: string; qty: number }[] }[] = [
  {
    room: "Living Room",
    items: [
      { item: "Sofa", qty: 1 },
      { item: "TV", qty: 1 },
      { item: "Coffee table", qty: 1 },
      { item: "Bookshelf", qty: 1 },
      { item: "Floor lamp", qty: 1 },
    ],
  },
  {
    room: "Bedroom",
    items: [
      { item: "King-size bed", qty: 1 },
      { item: "Mattress", qty: 1 },
      { item: "Wardrobe", qty: 1 },
      { item: "Nightstand", qty: 2 },
    ],
  },
  {
    room: "Kitchen",
    items: [
      { item: "Fridge", qty: 1 },
      { item: "Microwave", qty: 1 },
      { item: "Dining table", qty: 1 },
      { item: "Chairs", qty: 4 },
      { item: "Boxes", qty: 8 },
    ],
  },
  {
    room: "Office",
    items: [
      { item: "Desk", qty: 1 },
      { item: "Office chair", qty: 1 },
      { item: "Monitor", qty: 2 },
      { item: "Boxes", qty: 6 },
    ],
  },
  {
    room: "Storage / Hall",
    items: [
      { item: "Boxes", qty: 12 },
      { item: "Bike", qty: 1 },
      { item: "Vacuum", qty: 1 },
    ],
  },
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Mock vision model: picks a room catalog from filename/size and returns
 * detected furniture with confidence — used in the call pitch to movers.
 */
export function analyzeRoomPhoto(
  file: File,
  previewUrl: string,
  source: "upload" | "camera",
): InventoryPhoto {
  const seed = hashSeed(`${file.name}:${file.size}:${file.lastModified}`);
  const catalog = ROOM_CATALOGS[seed % ROOM_CATALOGS.length];
  const count = 2 + (seed % Math.min(4, catalog.items.length));
  const shuffled = [...catalog.items].sort(
    (a, b) => hashSeed(a.item + seed) - hashSeed(b.item + seed),
  );
  const picked = shuffled.slice(0, count).map((it, i) => ({
    item: it.item,
    qty: it.qty,
    confidence: Math.round((0.72 + ((seed + i * 13) % 25) / 100) * 100) / 100,
  }));

  return {
    id: `photo-${Date.now()}-${seed.toString(16)}`,
    name: file.name || (source === "camera" ? "camera-capture.jpg" : "room.jpg"),
    previewUrl,
    roomGuess: catalog.room,
    detectedItems: picked,
    uploadedAt: new Date().toISOString(),
    source,
  };
}

export function mergePhotoInventory(
  current: JobSpec["inventory"],
  photos: InventoryPhoto[],
): JobSpec["inventory"] {
  const map = new Map(current.map(i => [i.item.toLowerCase(), { item: i.item, qty: i.qty }]));
  for (const photo of photos) {
    for (const d of photo.detectedItems) {
      const key = d.item.toLowerCase();
      const prev = map.get(key);
      if (prev) map.set(key, { item: prev.item, qty: Math.max(prev.qty, d.qty) });
      else map.set(key, { item: d.item, qty: d.qty });
    }
  }
  return [...map.values()];
}

export function photoSurveyBlurb(photos: InventoryPhoto[], spec: JobSpec): string {
  if (!photos.length) return "";
  const rooms = [...new Set(photos.map(p => p.roomGuess))];
  const items = spec.inventory.reduce((n, i) => n + i.qty, 0);
  return `Photo survey of ${photos.length} room image${photos.length === 1 ? "" : "s"} (${rooms.join(", ")}): ~${items} items estimated for quoting.`;
}
