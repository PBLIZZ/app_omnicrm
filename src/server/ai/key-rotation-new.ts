// Key rotation system for better reliability
import { env } from "@/lib/env";

const API_KEYS = [env.OPENROUTER_API_KEY].filter(Boolean);
let currentKeyIndex = 0;

export function getCurrentApiKey(): string | null {
  if (API_KEYS.length === 0) return null;
  return API_KEYS[currentKeyIndex % API_KEYS.length];
}

export function rotateApiKey(): void {
  if (API_KEYS.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  }
}