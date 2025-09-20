import { fetchPut } from "@/lib/api";

export async function updateUserConsent(granted: boolean): Promise<void> {
  await fetchPut<void>("/api/settings/consent", { allowProfilePictureScraping: granted });
}
