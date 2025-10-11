// Event analysis utilities

export function extractEventType(title: string, description?: string | null): string {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  if (/\b(class|lesson|session)\b/.test(text)) return "class";
  if (/\b(workshop|seminar|training)\b/.test(text)) return "workshop";
  if (/\b(appointment|consultation|private|1-on-1)\b/.test(text)) return "appointment";
  if (/\b(retreat|getaway|weekend)\b/.test(text)) return "retreat";
  if (/\b(meeting|discussion|planning)\b/.test(text)) return "meeting";

  return "event";
}

export function extractBusinessCategory(title: string, description?: string | null): string {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  if (/\b(yoga|asana|vinyasa|hatha|bikram|yin|power yoga)\b/.test(text)) return "yoga";
  if (/\b(massage|therapeutic|deep tissue|swedish|aromatherapy)\b/.test(text)) return "massage";
  // ... all other patterns ...

  return "wellness";
}
