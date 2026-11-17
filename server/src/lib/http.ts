import { Response } from "express";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function positiveId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Identificador inválido.");
  return id;
}
export function respondError(res: Response, error: unknown): void {
  if (error instanceof HttpError) res.status(error.status).json({ message: error.message });
  else if (typeof error === "object" && error && "code" in error &&
    ["P2002", "P2034"].includes(String(error.code)))
    res.status(409).json({ message: "Conflito na operação. Actualize a página e tente novamente." });
  else res.status(500).json({ message: "Não foi possível concluir a operação." });
}
export function textField(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new HttpError(400, label + " inválido.");
  return value.trim();
}
export function contactFields(body: Record<string, unknown>) {
  const name = textField(body.name, "Nome");
  const email = textField(body.email, "Email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Email inválido.");
  const phoneNumber = textField(body.phoneNumber, "Telefone", 30).replace(/[\s()-]/g, "");
  if (!/^(?:\+?258)?8[2-7]\d{7}$/.test(phoneNumber)) throw new HttpError(400, "Indique um número móvel de Moçambique válido.");
  return { name, email, phoneNumber: "+258" + phoneNumber.slice(-9) };
}
