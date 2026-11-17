import { HttpError, textField } from "./http";

// Only these fields can be edited here. Ownership, photos and location use
// separate workflows and must never be copied from the request body.
export function propertyUpdates(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Alterações inválidas.");
  const input = body as Record<string, unknown>;
  const allowed = ["name", "description", "pricePerMonth", "securityDeposit", "applicationFee", "isPetsAllowed", "isParkingIncluded", "isPublished"];
  if (!Object.keys(input).length || Object.keys(input).some(key => !allowed.includes(key))) throw new HttpError(400, "Escolha apenas os campos editáveis do anúncio.");
  const data: {
    name?: string; description?: string; pricePerMonth?: number;
    securityDeposit?: number; applicationFee?: number; isPetsAllowed?: boolean;
    isParkingIncluded?: boolean; isPublished?: boolean;
  } = {};
  for (const key of ["name", "description"] as const) {
    if (key in input) data[key] = textField(input[key], key === "name" ? "Título" : "Descrição", key === "name" ? 200 : 10000);
  }
  for (const key of ["pricePerMonth", "securityDeposit", "applicationFee"] as const) {
    if (!(key in input)) continue;
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < (key === "pricePerMonth" ? 1 : 0) || value > 100000000) throw new HttpError(400, "Valor monetário inválido.");
    data[key] = value;
  }
  for (const key of ["isPetsAllowed", "isParkingIncluded", "isPublished"] as const) {
    if (!(key in input)) continue;
    if (typeof input[key] !== "boolean") throw new HttpError(400, "Condição inválida.");
    data[key] = input[key];
  }
  return data;
}
