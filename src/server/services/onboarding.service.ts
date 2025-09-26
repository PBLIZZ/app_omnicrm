import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Validation schemas
const AddressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .optional();

const HealthContextSchema = z
  .object({
    conditions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    fitnessLevel: z.string().optional(),
    stressLevel: z.string().optional(),
    medications: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .optional();

const PreferencesSchema = z
  .object({
    sessionTimes: z.array(z.string()).optional(),
    communicationPreference: z.enum(["email", "phone", "text"]).optional(),
    reminderFrequency: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
    notes: z.string().optional(),
  })
  .optional();

const ClientDataSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  primary_email: z.string().email("Valid email is required"),
  primary_phone: z.string().optional(),
  date_of_birth: z.string().optional(), // ISO date string
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  referral_source: z.string().optional(),
  address: AddressSchema,
  health_context: HealthContextSchema,
  preferences: PreferencesSchema,
});

const ConsentDataSchema = z.object({
  consent_type: z
    .enum(["data_processing", "marketing", "hipaa", "photography"])
    .default("data_processing"),
  consent_text_version: z.string().min(1, "Consent version is required"),
  granted: z.boolean().default(true),
  signature_svg: z.string().optional(),
  signature_image_url: z.string().optional(),
});

const OnboardingSubmissionSchema = z.object({
  token: z.string().min(1, "Token is required").max(255, "Token too long"),
  client: ClientDataSchema,
  consent: ConsentDataSchema,
  photo_path: z.string().optional(),
});

// Type definitions
export type OnboardingSubmissionData = z.infer<typeof OnboardingSubmissionSchema>;

interface ClientIpData {
  ip: string;
  userAgent: string;
}

// Constants
const INVALID_AUTH_SPEC = "28000";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

// Environment variable validation helper
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Rate limiter instance
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});

export class OnboardingService {
  /**
   * Check rate limits for client requests
   */
  static async checkRateLimit(clientId: string): Promise<{ success: boolean }> {
    return await ratelimit.limit(clientId);
  }

  /**
   * Extract client IP address from request headers
   */
  static extractClientIpData(headers: {
    "x-forwarded-for"?: string | null;
    "x-real-ip"?: string | null;
    "user-agent"?: string | null;
  }): ClientIpData {
    const forwardedFor = headers["x-forwarded-for"];
    const realIp = headers["x-real-ip"];

    let ip = "unknown";
    if (forwardedFor) {
      // Split on commas, trim each part, and take the first non-empty value
      const ips = forwardedFor
        .split(",")
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);
      if (ips.length > 0) {
        ip = ips[0]!;
      }
    } else if (realIp) {
      ip = realIp.trim();
    }

    // Clean up IP address - remove port numbers and IPv6 brackets
    ip = ip.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
    const userAgent = headers["user-agent"] || "unknown";

    return { ip, userAgent };
  }

  /**
   * Validate onboarding submission data
   */
  static validateSubmission(body: unknown): OnboardingSubmissionData {
    return OnboardingSubmissionSchema.parse(body);
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
  }

  /**
   * Validate phone format
   */
  static validatePhone(phone: string): boolean {
    return PHONE_REGEX.test(phone);
  }

  /**
   * Enhanced validation for JSONB fields
   */
  static validateJsonbField(field: unknown, fieldName: string, maxLength: number = 10000): void {
    if (typeof field !== "object" || field === null) {
      throw new Error(`Invalid ${fieldName}: must be an object`);
    }

    const jsonString = JSON.stringify(field);
    if (jsonString.length > maxLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    }

    // Check for suspicious patterns that might indicate injection attempts
    if (jsonString.includes("${") || jsonString.includes("{{") || jsonString.includes("}}")) {
      throw new Error(`${fieldName} contains potentially dangerous template syntax`);
    }
  }

  /**
   * Validate all client data including email, phone, and JSONB fields
   */
  static validateClientData(client: OnboardingSubmissionData["client"]): void {
    // Validate email format
    if (!this.validateEmail(client.primary_email)) {
      throw new Error("Invalid email format");
    }

    // Validate phone formats
    if (client.primary_phone && !this.validatePhone(client.primary_phone)) {
      throw new Error("Invalid phone format");
    }

    if (client.emergency_contact_phone && !this.validatePhone(client.emergency_contact_phone)) {
      throw new Error("Invalid emergency contact phone format");
    }

    // Validate JSONB fields
    if (client.address) {
      this.validateJsonbField(client.address, "address", 5000);
    }
    if (client.health_context) {
      this.validateJsonbField(client.health_context, "health_context", 10000);
    }
    if (client.preferences) {
      this.validateJsonbField(client.preferences, "preferences", 5000);
    }
  }

  /**
   * Validate consent data
   */
  static validateConsentData(consent: OnboardingSubmissionData["consent"]): void {
    this.validateJsonbField(consent, "consent", 10000);
  }

  /**
   * Prepare client data for database insertion
   */
  static prepareClientData(client: OnboardingSubmissionData["client"]) {
    return {
      display_name: `${client.first_name} ${client.last_name}`,
      primary_email: client.primary_email,
      primary_phone: client.primary_phone || null,
      date_of_birth: client.date_of_birth || null,
      emergency_contact_name: client.emergency_contact_name || null,
      emergency_contact_phone: client.emergency_contact_phone || null,
      referral_source: client.referral_source || null,
      address: client.address || null,
      health_context: client.health_context || null,
      preferences: client.preferences || null,
    };
  }

  /**
   * Prepare consent data with tracking information
   */
  static prepareConsentData(consent: OnboardingSubmissionData["consent"], clientIpData: ClientIpData) {
    return {
      ...consent,
      ip_address: clientIpData.ip,
      user_agent: clientIpData.userAgent,
    };
  }

  /**
   * Submit onboarding data to database
   */
  static async submitOnboarding(
    token: string,
    clientData: ReturnType<typeof OnboardingService.prepareClientData>,
    consentData: ReturnType<typeof OnboardingService.prepareConsentData>,
    photoPath?: string
  ): Promise<string> {
    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY"),
    );

    const { data: contactId, error } = await supabase.rpc("onboard_client_with_token", {
      p_token: token,
      p_client: clientData,
      p_consent: consentData,
      ...(photoPath && { p_photo_path: photoPath }),
    });

    if (error) {
      console.error("Onboarding submission error:", error);

      // Handle specific error codes with robust checking
      if (
        error?.code === INVALID_AUTH_SPEC ||
        (error?.message && error.message.includes("invalid_authorization_specification"))
      ) {
        throw new Error("Invalid or expired token");
      }

      throw new Error("Failed to complete onboarding");
    }

    return contactId;
  }

  /**
   * Track successful submission by incrementing token usage count
   */
  static async trackSubmission(token: string): Promise<void> {
    try {
      const supabase = createClient<Database>(
        getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredEnv("SUPABASE_SECRET_KEY"),
      );

      await supabase.rpc("increment_submission_count", { token_value: token });
    } catch (trackingError) {
      // Don't fail the request if tracking fails
      console.warn("Failed to track submission:", trackingError);
    }
  }

  /**
   * Complete onboarding process - main service method
   */
  static async processOnboardingSubmission(
    submissionData: OnboardingSubmissionData,
    clientIpData: ClientIpData
  ): Promise<{ contactId: string; message: string }> {
    const { token, client, consent, photo_path } = submissionData;

    // Validate all client data
    this.validateClientData(client);
    this.validateConsentData(consent);

    // Prepare data for database
    const clientData = this.prepareClientData(client);
    const consentData = this.prepareConsentData(consent, clientIpData);

    // Submit to database
    const contactId = await this.submitOnboarding(token, clientData, consentData, photo_path);

    // Track successful submission
    await this.trackSubmission(token);

    return {
      contactId,
      message: "Onboarding completed successfully",
    };
  }
}