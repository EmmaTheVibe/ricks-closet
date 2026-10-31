import { MeshPhysicalMaterial, type MeshPhysicalMaterialParameters } from "three";

const memory =
  typeof navigator === "undefined" ? undefined : (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
export const LOW_MEMORY = memory !== undefined && memory <= 4;
export const DPR: [number, number] = LOW_MEMORY ? [1, 1.5] : [1, 2];

const BUMP = new Set(["bumpMap", "bumpScale"]);

export function flat<T extends object>(params: T): T {
  return LOW_MEMORY ? (Object.fromEntries(Object.entries(params).filter(([key]) => !BUMP.has(key))) as T) : params;
}

const EXTRAS = /^(clearcoat|sheen)/;

export function physicalMaterial(params: MeshPhysicalMaterialParameters) {
  return new MeshPhysicalMaterial(
    LOW_MEMORY ? Object.fromEntries(Object.entries(flat(params)).filter(([key]) => !EXTRAS.test(key))) : params,
  );
}
