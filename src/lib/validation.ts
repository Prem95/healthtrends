import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

export const sexSchema = z.enum(["M", "F", "OTHER"]);

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  sex: sexSchema,
  dateOfBirth: isoDate.optional().or(z.literal("").transform(() => undefined)),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const sessionSchema = z.object({
  profileId: z.string().uuid(),
  date: isoDate,
  labName: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  orderedBy: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  fasting: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});
export type SessionInput = z.infer<typeof sessionSchema>;

export const refRangeSchema = z
  .object({
    sex: z.enum(["M", "F"]).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .refine((r) => r.min != null || r.max != null, "A range needs at least one bound");

// A single result as entered by the user (value is in enteredUnit, converted
// to canonical in the server action before storage).
export const resultInputSchema = z.object({
  biomarkerId: z.string().min(1),
  value: z.number().finite(),
  enteredUnit: z.string().min(1),
  labRangeMin: z.number().finite().optional(),
  labRangeMax: z.number().finite().optional(),
  flagOnReport: z.enum(["H", "L"]).optional(),
  note: z.string().trim().max(500).optional(),
});
export type ResultInput = z.infer<typeof resultInputSchema>;

export const lifeEventSchema = z.object({
  profileId: z.string().uuid(),
  date: isoDate,
  label: z.string().trim().min(1, "Label is required").max(120),
});
export type LifeEventInput = z.infer<typeof lifeEventSchema>;

export const customBiomarkerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum([
    "LIPIDS", "GLUCOSE", "THYROID", "CBC", "LIVER",
    "KIDNEY", "VITAMINS", "IRON", "HORMONES", "OTHER",
  ]),
  canonicalUnit: z.string().trim().min(1).max(32),
  rangeMin: z.number().finite().optional(),
  rangeMax: z.number().finite().optional(),
});
export type CustomBiomarkerInput = z.infer<typeof customBiomarkerSchema>;
