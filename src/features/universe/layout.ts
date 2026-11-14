import type { Company } from "@/lib/ecosystem";

const desktopSlots = [
  { x: 31, y: 22 },
  { x: 71, y: 26 },
  { x: 79, y: 61 },
  { x: 53, y: 83 },
  { x: 20, y: 67 },
  { x: 16, y: 40 },
];
const phoneCompanies = [
  { x: 23, y: 10 },
  { x: 77, y: 10 },
  { x: 23, y: 34 },
  { x: 77, y: 34 },
  { x: 23, y: 64 },
  { x: 77, y: 64 },
  { x: 23, y: 88 },
];

export function companyPosition(company: Company, index: number, mobile: boolean) {
  return mobile ? (phoneCompanies[index] ?? company) : company;
}

export function matchPosition(index: number, total: number, priority: boolean, mobile: boolean) {
  if (mobile) {
    if (total <= 1) return { x: 50, y: 16 };
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
    const rx = total <= 3 ? 30 : 32;
    const ry = total <= 3 ? 32 : 34;
    return { x: 50 + rx * Math.cos(angle), y: 50 + ry * Math.sin(angle) };
  }
  const slot = desktopSlots[index];
  return slot && priority ? { x: 50 + (slot.x - 50) * 0.82, y: 50 + (slot.y - 50) * 0.82 } : slot;
}
