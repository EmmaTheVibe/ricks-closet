import { MeshPhysicalMaterial, MeshStandardMaterial, type MeshPhysicalMaterialParameters } from "three";

const memory =
  typeof navigator === "undefined" ? undefined : (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
export const LOW_MEMORY = memory !== undefined && memory <= 4;
export const DPR: [number, number] = LOW_MEMORY ? [1, 1.5] : [1, 2];

const BUMP = new Set(["bumpMap", "bumpScale"]);

export function flat<T extends object>(params: T): T {
  return LOW_MEMORY ? (Object.fromEntries(Object.entries(params).filter(([key]) => !BUMP.has(key))) as T) : params;
}

export function physicalMaterial(params: MeshPhysicalMaterialParameters): MeshStandardMaterial {
  if (!LOW_MEMORY) return new MeshPhysicalMaterial(params);
  const material = new MeshStandardMaterial();
  material.setValues(Object.fromEntries(Object.entries(flat(params)).filter(([key]) => key in material)));
  return material;
}
