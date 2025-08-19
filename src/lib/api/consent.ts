export async function updateUserConsent(granted: boolean): Promise<void> {
  const res = await fetch("/api/settings/consent", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allowProfilePictureScraping: granted }),
  });
  if (!res.ok) {
    let message = "Failed to update consent";
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data?.error ?? data?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}
