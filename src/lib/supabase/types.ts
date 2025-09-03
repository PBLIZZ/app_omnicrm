// Supabase types for compatibility
export interface User {
  id: string;
  email?: string;
  created_at: string;
}

// Mock Supabase module for development
declare module "@supabase/supabase-js" {
  export interface User {
    id: string;
    email?: string;
    created_at: string;
  }
}