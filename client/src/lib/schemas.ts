import * as z from "zod";
import { PropertyTypeEnum } from "@/lib/constants";

export const propertySchema = z.object({
  name: z.string().min(1, "Indique o nome"),
  description: z.string().min(1, "Indique a descrição"),
  pricePerMonth: z.coerce.number<number>().positive().min(0).int(),
  securityDeposit: z.coerce.number<number>().min(0),
  applicationFee: z.coerce.number<number>().min(0),
  isPetsAllowed: z.boolean(),
  isParkingIncluded: z.boolean(),
  photoUrls: z
    .array(z.instanceof(File))
    .min(1, "Adicione pelo menos uma fotografia").max(10, "Máximo de 10 fotografias").refine(files => files.every(f => f.size <= 5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(f.type)), "Use JPEG, PNG ou WebP até 5 MB."),
  amenities: z.string(),
  highlights: z.string(),
  beds: z.coerce.number<number>().positive().min(0).max(10).int(),
  baths: z.coerce.number<number>().positive().min(0).max(10).int(),
  squareFeet: z.coerce.number<number>().int().positive(),
  propertyType: z.nativeEnum(PropertyTypeEnum),
  address: z.string().min(1, "Indique o endereço"),
  city: z.string().min(1, "Indique a cidade"),
  state: z.string().min(1, "Indique a província"),
  country: z.string().min(1, "Indique o país"),
  postalCode: z.string(),
  latitude: z.coerce.number<number>().min(-90).max(90),
  longitude: z.coerce.number<number>().min(-180).max(180),
});

export type PropertyFormData = z.infer<typeof propertySchema>;

export const applicationSchema = z.object({
  name: z.string().min(1, "Indique o nome"),
  email: z.string().email("Email inválido"),
  phoneNumber: z.string().transform(v => v.replace(/[\s()-]/g, "")).refine(v => /^(?:\+?258)?8[2-7]\d{7}$/.test(v), "Indique um telemóvel de Moçambique válido"),
  message: z.string().optional(),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

export const settingsSchema = z.object({
  name: z.string().min(1, "Indique o nome"),
  email: z.string().email("Email inválido"),
  phoneNumber: z.string().transform(v => v.replace(/[\s()-]/g, "")).refine(v => /^(?:\+?258)?8[2-7]\d{7}$/.test(v), "Indique um telemóvel de Moçambique válido"),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
