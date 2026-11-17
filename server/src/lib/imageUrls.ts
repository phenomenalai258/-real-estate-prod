import { HttpError } from "./http";

export function imageBaseUrl(): string {
  try {
    const base = new URL(process.env.S3_PUBLIC_BASE_URL || "");
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("Invalid origin");
    return base.origin;
  } catch {
    throw new HttpError(503, "O endereço de apresentação das fotografias ainda não está configurado.");
  }
}

export function imageUrl(base: string, key: string): string {
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
