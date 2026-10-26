import type { LumoLanguage } from "@/types/lumo";

export type ExperienceLanguage =
  | LumoLanguage
  | "ta-IN"
  | "bn-IN"
  | "mr-IN";

export const EXPERIENCE_LANGUAGES: {
  code: ExperienceLanguage;
  label: string;
  native: string;
  apiLanguage: LumoLanguage;
  available: boolean;
}[] = [
  { code: "hi-IN", label: "Hindi", native: "हिन्दी", apiLanguage: "hi-IN", available: true },
  { code: "en-IN", label: "English", native: "English", apiLanguage: "en-IN", available: true },
  { code: "pa-IN", label: "Punjabi", native: "ਪੰਜਾਬੀ", apiLanguage: "pa-IN", available: true },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்", apiLanguage: "en-IN", available: false },
  { code: "bn-IN", label: "Bengali", native: "বাংলা", apiLanguage: "en-IN", available: false },
  { code: "mr-IN", label: "Marathi", native: "मराठी", apiLanguage: "en-IN", available: false },
];

export function toContractLanguage(language: ExperienceLanguage): LumoLanguage {
  return EXPERIENCE_LANGUAGES.find((item) => item.code === language)?.apiLanguage ?? "en-IN";
}

export function languageFallbackNotice(language: ExperienceLanguage): string | null {
  const option = EXPERIENCE_LANGUAGES.find((item) => item.code === language);
  if (!option || option.available) return null;
  return `${option.label} is listed as a future interface option. This demo sends English to the configured API; it does not claim Tamil, Bengali or Marathi ASR/TTS is connected.`;
}
