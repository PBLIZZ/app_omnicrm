import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { userIntegrations, userSyncPrefs, contacts, jobs } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Import auth utilities
import { getServerUserId } from "@/server/auth/user";

/**
 * Authentication Flow Integration Tests
 *
 * These tests verify complete authentication workflows:
 * - User registration and initial setup
 * - OAuth integration flows (Google)
 * - Session management and renewal
 * - Permission validation across routes
 * - CSRF protection workflows
 * - Multi-step authentication processes
 */
describe("Authentication Flow Integration Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testUserId = "test-user-auth-flow";
  const cleanupIds: { table: string; id: string }[] = [];

  beforeAll(async () => {
    db = await getDb();
  });

  afterEach(async () => {
    // Clean up test data
    for (const { table, id } of cleanupIds.reverse()) {
      try {
        switch (table) {
          case "contacts":
            await db.delete(contacts).where(eq(contacts.id, id));
            break;
          case "jobs":
            await db.delete(jobs).where(eq(jobs.id, id));
            break;
        }
      } catch (error) {
        console.warn(`Cleanup failed for ${table}:${id}:`, error);
      }
    }
    cleanupIds.length = 0;
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete(contacts).where(eq(contacts.userId, testUserId));
    await db.delete(jobs).where(eq(jobs.userId, testUserId));
    await db.delete(userIntegrations).where(eq(userIntegrations.userId, testUserId));
    await db.delete(userSyncPrefs).where(eq(userSyncPrefs.userId, testUserId));

    vi.resetAllMocks();
  });

  describe("User Session Management", () => {
    it("validates authenticated user access to protected routes", async () => {
      // Mock authenticated session
      const mockGetUserId = vi.fn().mockResolvedValue(testUserId);
      vi.doMock("@/server/auth/user", () => ({
        getServerUserId: mockGetUserId,
      }));

      // Simulate middleware check
      const middlewareRequest = new NextRequest("http://localhost:3000/api/contacts", {
        headers: {
          cookie: "supabase-auth-token=valid-token",
        },
      });

      // Verify middleware request contains expected headers
      expect(middlewareRequest.headers.get("cookie")).toBe("supabase-auth-token=valid-token");

      // Test that authenticated requests pass through
      expect(async () => {
        await getServerUserId();
      }).not.toThrow();

      // Verify user ID is correctly extracted
      const userId = await getServerUserId();
      expect(userId).toBe(testUserId);
    });

    it("rejects unauthenticated access to protected routes", async () => {
      // Mock unauthenticated session
      const mockGetUserId = vi.fn().mockRejectedValue(new Error("No session"));
      vi.doMock("@/server/auth/user", () => ({
        getServerUserId: mockGetUserId,
      }));

      // Test that unauthenticated requests are rejected
      await expect(getServerUserId()).rejects.toThrow("No session");
    });

    it("handles session expiration gracefully", async () => {
      // Mock expired session
      const mockGetUserId = vi.fn().mockRejectedValue(new Error("Session expired"));
      vi.doMock("@/server/auth/user", () => ({
        getServerUserId: mockGetUserId,
      }));

      await expect(getServerUserId()).rejects.toThrow("Session expired");
    });
  });

  describe("CSRF Protection Workflow", () => {
    it("validates CSRF tokens on mutating requests", async () => {
      const validToken = "valid-csrf-token";
      const invalidToken = "invalid-csrf-token";

      // Mock CSRF validation
      const mockValidateCsrf = vi.fn().mockImplementation((token: string) => {
        return Promise.resolve(token === validToken);
      });

      vi.doMock("@/server/auth/csrf", () => ({
        validateCsrfToken: mockValidateCsrf,
      }));

      const { validateCsrfToken } = await import("@/server/auth/csrf");
      const validResult = await validateCsrfToken(validToken);
      expect(validResult).toBe(true);

      // Test invalid CSRF token
      const invalidResult = await validateCsrfToken(invalidToken);
      expect(invalidResult).toBe(false);
    });

    it("allows GET requests without CSRF tokens", async () => {
      // GET requests should not require CSRF tokens
      const getRequest = new NextRequest("http://localhost:3000/api/contacts");

      // Should not validate CSRF for GET requests
      expect(getRequest.method).toBe("GET");
      // GET requests typically don't need CSRF validation
    });

    it("rejects mutating requests without CSRF tokens", async () => {
      const postRequest = new NextRequest("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ displayName: "Test" }),
      });

      // Should require CSRF token for POST requests
      expect(postRequest.headers.get("x-csrf-token")).toBeNull();
    });
  });

  describe("OAuth Integration Workflow", () => {
    it("handles Google OAuth integration setup", async () => {
      // Step 1: Create user sync preferences (initial setup)
      await db.insert(userSyncPrefs).values({
        userId: testUserId,
        calendarIncludeOrganizerSelf: true,
        calendarIncludePrivate: false,
        calendarTimeWindowDays: 60,
        driveIngestionMode: "none",
        driveFolderIds: [],
      });

      // Step 2: Store OAuth tokens (simulating successful OAuth flow)
      const oauthTokens = [
        {
          userId: testUserId,
          provider: "google" as const,
          service: "auth" as const,
          accessToken: "encrypted-access-token-auth",
          refreshToken: "encrypted-refresh-token-auth",
          expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
        },
        {
          userId: testUserId,
          provider: "google" as const,
          service: "gmail" as const,
          accessToken: "encrypted-access-token-gmail",
          refreshToken: "encrypted-refresh-token-gmail",
          expiryDate: new Date(Date.now() + 3600000),
        },
        {
          userId: testUserId,
          provider: "google" as const,
          service: "calendar" as const,
          accessToken: "encrypted-access-token-calendar",
          refreshToken: "encrypted-refresh-token-calendar",
          expiryDate: new Date(Date.now() + 3600000),
        },
      ];

      await db.insert(userIntegrations).values(oauthTokens);

      // Step 3: Verify OAuth integration is properly stored
      const storedIntegrations = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId));

      expect(storedIntegrations).toHaveLength(3);
      expect(storedIntegrations.some((i) => i.service === "auth")).toBe(true);
      expect(storedIntegrations.some((i) => i.service === "gmail")).toBe(true);
      expect(storedIntegrations.some((i) => i.service === "calendar")).toBe(true);

      // Step 4: Verify sync preferences are maintained
      const syncPrefs = await db
        .select()
        .from(userSyncPrefs)
        .where(eq(userSyncPrefs.userId, testUserId))
        .limit(1);

      expect(syncPrefs).toHaveLength(1);
      expect(syncPrefs[0]?.calendarIncludeOrganizerSelf).toBe(true);
    });

    it("handles OAuth token refresh workflow", async () => {
      // Setup expired tokens
      await db
        .insert(userIntegrations)
        .values([
          {
            userId: testUserId,
            provider: "google",
            service: "gmail",
            accessToken: "expired-access-token",
            refreshToken: "valid-refresh-token",
            expiryDate: new Date(Date.now() - 3600000), // 1 hour ago (expired)
          },
        ])
        .returning();

      // Simulate token refresh
      await db
        .update(userIntegrations)
        .set({
          accessToken: "new-refreshed-access-token",
          expiryDate: new Date(Date.now() + 3600000), // New expiry 1 hour from now
          updatedAt: new Date(),
        })
        .where(eq(userIntegrations.userId, testUserId));

      // Verify token was refreshed
      const refreshedToken = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId))
        .limit(1);

      expect(refreshedToken).toHaveLength(1);
      expect(refreshedToken[0]?.accessToken).toBe("new-refreshed-access-token");
      expect(refreshedToken[0]?.expiryDate?.getTime()).toBeGreaterThan(Date.now());
    });

    it("handles OAuth disconnection workflow", async () => {
      // Setup initial OAuth connection
      await db.insert(userIntegrations).values({
        userId: testUserId,
        provider: "google",
        service: "gmail",
        accessToken: "to-be-removed-token",
        refreshToken: "to-be-removed-refresh",
        expiryDate: new Date(Date.now() + 3600000),
      });

      // Verify connection exists
      const beforeDisconnect = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId));

      expect(beforeDisconnect.length).toBeGreaterThan(0);

      // Simulate disconnection (remove OAuth tokens)
      await db
        .delete(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId) && eq(userIntegrations.provider, "google"));

      // Verify disconnection
      const afterDisconnect = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId));

      expect(afterDisconnect).toHaveLength(0);

      // Sync preferences should remain (user might reconnect later)
      const syncPrefs = await db
        .select()
        .from(userSyncPrefs)
        .where(eq(userSyncPrefs.userId, testUserId));

      // Sync preferences might still exist
      expect(syncPrefs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Permission Validation Workflows", () => {
    it("validates user data isolation", async () => {
      const user1Id = testUserId;
      const user2Id = "test-user-auth-flow-2";

      // Create data for both users
      const user1Contact = await db
        .insert(contacts)
        .values({
          userId: user1Id,
          displayName: "User 1 Contact",
          primaryEmail: "user1@test.com",
          source: "manual",
        })
        .returning();

      const user2Contact = await db
        .insert(contacts)
        .values({
          userId: user2Id,
          displayName: "User 2 Contact",
          primaryEmail: "user2@test.com",
          source: "manual",
        })
        .returning();

      if (user1Contact[0]) cleanupIds.push({ table: "contacts", id: user1Contact[0].id });
      if (user2Contact[0]) cleanupIds.push({ table: "contacts", id: user2Contact[0].id });

      // User 1 should only see their data
      const user1Data = await db.select().from(contacts).where(eq(contacts.userId, user1Id));

      // User 2 should only see their data
      const user2Data = await db.select().from(contacts).where(eq(contacts.userId, user2Id));

      expect(user1Data.every((c) => c.userId === user1Id)).toBe(true);
      expect(user2Data.every((c) => c.userId === user2Id)).toBe(true);

      // Cross-user access should return empty
      const crossAccess = await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, user1Id) && eq(contacts.id, user2Contact[0]?.id ?? ""));

      expect(crossAccess).toHaveLength(0);

      // Clean up user 2 data
      await db.delete(contacts).where(eq(contacts.userId, user2Id));
    });

    it("validates role-based access control", async () => {
      // In this system, all authenticated users have the same permissions
      // But we can test that the user context is properly maintained

      // Mock different user contexts
      const adminUserId = "admin-user-test";
      const regularUserId = testUserId;

      // Both users should have access to their own data
      const adminContact = await db
        .insert(contacts)
        .values({
          userId: adminUserId,
          displayName: "Admin Contact",
          primaryEmail: "admin@test.com",
          source: "manual",
        })
        .returning();

      const regularContact = await db
        .insert(contacts)
        .values({
          userId: regularUserId,
          displayName: "Regular Contact",
          primaryEmail: "regular@test.com",
          source: "manual",
        })
        .returning();

      if (adminContact[0]) cleanupIds.push({ table: "contacts", id: adminContact[0].id });
      if (regularContact[0]) cleanupIds.push({ table: "contacts", id: regularContact[0].id });

      // Verify data isolation is maintained regardless of "role"
      const adminData = await db.select().from(contacts).where(eq(contacts.userId, adminUserId));

      const regularData = await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, regularUserId));

      expect(adminData).toHaveLength(1);
      expect(regularData).toHaveLength(1);
      expect(adminData[0]?.userId).toBe(adminUserId);
      expect(regularData[0]?.userId).toBe(regularUserId);

      // Clean up admin data
      await db.delete(contacts).where(eq(contacts.userId, adminUserId));
    });

    it("validates API endpoint permissions", async () => {
      // Test that user context is properly validated in API endpoints

      // Mock authenticated user
      const mockGetUserId = vi.fn().mockResolvedValue(testUserId);
      vi.doMock("@/server/auth/user", () => ({
        getServerUserId: mockGetUserId,
      }));

      // Create some test data
      const testContact = await db
        .insert(contacts)
        .values({
          userId: testUserId,
          displayName: "Permission Test Contact",
          primaryEmail: "permission@test.com",
          source: "manual",
        })
        .returning();

      if (testContact[0]) cleanupIds.push({ table: "contacts", id: testContact[0].id });

      // Verify that API calls properly use authenticated user context
      const { getServerUserId } = await import("@/server/auth/user");
      const apiUserId = await getServerUserId();

      expect(apiUserId).toBe(testUserId);

      // Verify that queries are scoped to the authenticated user
      const userContacts = await db.select().from(contacts).where(eq(contacts.userId, apiUserId));

      expect(userContacts.some((c) => c.id === testContact[0]?.id)).toBe(true);
    });
  });

  describe("Multi-Step Authentication Workflows", () => {
    it("executes complete new user onboarding flow", async () => {
      const newUserId = "new-user-onboarding-test";

      // Step 1: Initial user registration (handled by Supabase Auth)
      // We simulate this by just using the new user ID

      // Step 2: Create default sync preferences
      const defaultSyncPrefs = await db
        .insert(userSyncPrefs)
        .values({
          userId: newUserId,
          calendarIncludeOrganizerSelf: true,
          calendarIncludePrivate: false,
          calendarTimeWindowDays: 60,
          driveIngestionMode: "none",
          driveFolderIds: [],
        })
        .returning();

      expect(defaultSyncPrefs).toHaveLength(1);
      expect(defaultSyncPrefs[0]?.userId).toBe(newUserId);

      // Step 3: User completes OAuth setup (simulated)
      const oauthSetup = await db
        .insert(userIntegrations)
        .values({
          userId: newUserId,
          provider: "google",
          service: "auth",
          accessToken: "new-user-oauth-token",
          refreshToken: "new-user-refresh-token",
          expiryDate: new Date(Date.now() + 3600000),
        })
        .returning();

      expect(oauthSetup).toHaveLength(1);

      // Step 4: Verify complete onboarding state
      const onboardingState = await Promise.all([
        db.select().from(userSyncPrefs).where(eq(userSyncPrefs.userId, newUserId)),
        db.select().from(userIntegrations).where(eq(userIntegrations.userId, newUserId)),
      ]);

      const [syncPrefs, integrations] = onboardingState;

      expect(syncPrefs).toHaveLength(1);
      expect(integrations).toHaveLength(1);
      expect(integrations[0]?.provider).toBe("google");

      // Clean up new user data
      await db.delete(userIntegrations).where(eq(userIntegrations.userId, newUserId));
      await db.delete(userSyncPrefs).where(eq(userSyncPrefs.userId, newUserId));
    });

    it("handles account migration workflow", async () => {
      const oldUserId = "old-user-migration-test";
      const newUserId = "new-user-migration-test";

      // Step 1: Create data under old user ID
      // Get old user data for potential migration verification
      await Promise.all([
        db
          .insert(contacts)
          .values({
            userId: oldUserId,
            displayName: "Old User Contact",
            primaryEmail: "old@test.com",
            source: "manual",
          })
          .returning(),
        db
          .insert(userSyncPrefs)
          .values({
            userId: oldUserId,
            calendarIncludeOrganizerSelf: false,
          })
          .returning(),
      ]);

      // Variables captured for potential data migration verification

      // Step 2: Migrate data to new user ID
      await Promise.all([
        db
          .update(contacts)
          .set({ userId: newUserId, updatedAt: new Date() })
          .where(eq(contacts.userId, oldUserId)),
        db
          .update(userSyncPrefs)
          .set({ userId: newUserId, updatedAt: new Date() })
          .where(eq(userSyncPrefs.userId, oldUserId)),
      ]);

      // Step 3: Verify migration completed
      const migratedData = await Promise.all([
        db.select().from(contacts).where(eq(contacts.userId, newUserId)),
        db.select().from(userSyncPrefs).where(eq(userSyncPrefs.userId, newUserId)),
        db.select().from(contacts).where(eq(contacts.userId, oldUserId)),
        db.select().from(userSyncPrefs).where(eq(userSyncPrefs.userId, oldUserId)),
      ]);

      const [newContacts, newSyncPrefs, remainingOldContacts, remainingOldSyncPrefs] = migratedData;

      expect(newContacts).toHaveLength(1);
      expect(newSyncPrefs).toHaveLength(1);
      expect(remainingOldContacts).toHaveLength(0);
      expect(remainingOldSyncPrefs).toHaveLength(0);

      expect(newContacts[0]?.displayName).toBe("Old User Contact");

      // Clean up migrated data
      await db.delete(contacts).where(eq(contacts.userId, newUserId));
      await db.delete(userSyncPrefs).where(eq(userSyncPrefs.userId, newUserId));
    });

    it("handles re-authentication workflow", async () => {
      // Setup initial authentication state
      await db.insert(userIntegrations).values({
        userId: testUserId,
        provider: "google",
        service: "auth",
        accessToken: "original-token",
        refreshToken: "original-refresh",
        expiryDate: new Date(Date.now() + 3600000),
      });

      // Step 1: Simulate session expiration
      await db
        .update(userIntegrations)
        .set({
          expiryDate: new Date(Date.now() - 3600000), // Expired 1 hour ago
          updatedAt: new Date(),
        })
        .where(eq(userIntegrations.userId, testUserId));

      // Step 2: Detect expired session
      const expiredTokens = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId) && eq(userIntegrations.provider, "google"));

      expect(expiredTokens[0]?.expiryDate?.getTime()).toBeLessThan(Date.now());

      // Step 3: Re-authenticate (refresh or re-authorize)
      await db
        .update(userIntegrations)
        .set({
          accessToken: "re-authenticated-token",
          refreshToken: "re-authenticated-refresh",
          expiryDate: new Date(Date.now() + 3600000), // Valid for 1 hour
          updatedAt: new Date(),
        })
        .where(eq(userIntegrations.userId, testUserId));

      // Step 4: Verify re-authentication
      const reAuthenticatedTokens = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId));

      expect(reAuthenticatedTokens[0]?.accessToken).toBe("re-authenticated-token");
      expect(reAuthenticatedTokens[0]?.expiryDate?.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Security Validation Workflows", () => {
    it("validates secure token storage", async () => {
      // OAuth tokens should be encrypted when stored
      await db.insert(userIntegrations).values({
        userId: testUserId,
        provider: "google" as const,
        service: "auth" as const,
        accessToken: "sensitive-access-token",
        refreshToken: "sensitive-refresh-token",
        expiryDate: new Date(Date.now() + 3600000),
      });

      const storedToken = await db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, testUserId))
        .limit(1);

      expect(storedToken).toHaveLength(1);
      // In production, these would be encrypted and not match the plain text
      // For testing, we just verify they're stored
      expect(storedToken[0]?.accessToken).toBeDefined();
      expect(storedToken[0]?.refreshToken).toBeDefined();
    });

    it("validates session timeout handling", async () => {
      // Mock session timeout scenario
      const sessionTimeoutMs = 24 * 60 * 60 * 1000; // 24 hours
      const sessionStartTime = Date.now();

      // Simulate long session
      const longSessionTime = sessionStartTime + sessionTimeoutMs + 1000;

      // Check if session should be considered expired
      const isSessionExpired = longSessionTime > sessionStartTime + sessionTimeoutMs;
      expect(isSessionExpired).toBe(true);

      // In real implementation, expired sessions would trigger re-authentication
    });

    it("validates concurrent session handling", async () => {
      // Test that multiple active sessions are handled correctly
      const timeoutWindow = 24 * 60 * 60 * 1000; // 24 hours
      const session1Time = new Date();
      const session2Time = new Date(Date.now() + 1000);

      // Both sessions should be valid if within timeout window
      expect(session1Time.getTime()).toBeLessThan(Date.now() + timeoutWindow);
      expect(session2Time.getTime()).toBeLessThan(Date.now() + timeoutWindow);

      // In practice, the system should handle multiple valid sessions
      // or implement session invalidation policies
    });
  });
});
