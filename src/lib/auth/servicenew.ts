// Mock auth service to match your Supabase patterns
// Replace with actual Supabase implementation when integrating

export interface User {
  id: string;
  email?: string;
  created_at: string;
}

export async function fetchCurrentUser() {
  // Mock user for development - replace with actual Supabase call
  return {
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID format
      email: "developer@omnicrm.ai",
      created_at: new Date().toISOString(),
    } as User
  };
}

export async function getServerUserId(): Promise<string> {
  // Mock for development - replace with actual server-side auth
  return "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID format
}