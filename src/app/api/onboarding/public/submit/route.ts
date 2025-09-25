import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Postgres error codes
const INVALID_AUTH_SPEC = "28000";

// Environment variable validation helper
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

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

// Rate limiter instance
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});

// Enhanced validation for JSONB fields
const validateJsonbField = (field: unknown, fieldName: string, maxLength: number = 10000) => {
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

  return field;
};

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientId = forwardedFor || realIp || "unknown";

    const { success } = await ratelimit.limit(clientId);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get client IP and user agent for consent tracking
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
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Parse and validate request
    const body = (await req.json()) as unknown;

    // Debug: Log the received data
    console.log("Received onboarding submission:", JSON.stringify(body, null, 2));

    const { token, client, consent, photo_path } = OnboardingSubmissionSchema.parse(body);

    // Enhanced server-side validation
    if (!EMAIL_REGEX.test(client.primary_email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (client.primary_phone && !PHONE_REGEX.test(client.primary_phone)) {
      return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
    }

    if (client.emergency_contact_phone && !PHONE_REGEX.test(client.emergency_contact_phone)) {
      return NextResponse.json(
        { error: "Invalid emergency contact phone format" },
        { status: 400 },
      );
    }

    // Validate JSONB fields
    try {
      if (client.address) {
        validateJsonbField(client.address, "address", 5000);
      }
      if (client.health_context) {
        validateJsonbField(client.health_context, "health_context", 10000);
      }
      if (client.preferences) {
        validateJsonbField(client.preferences, "preferences", 5000);
      }
      validateJsonbField(consent, "consent", 10000);
    } catch (validationError) {
      return NextResponse.json(
        {
          error: validationError instanceof Error ? validationError.message : "Invalid data format",
        },
        { status: 400 },
      );
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient<Database>(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SECRET_KEY"),
    );

    // Prepare client data for database
    const clientData = {
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

    // Prepare consent data with tracking information
    const consentData = {
      ...consent,
      ip_address: ip,
      user_agent: userAgent,
    };

    // Call the secure database function
    const { data: contactId, error } = await supabase.rpc("onboard_client_with_token", {
      p_token: token,
      p_client: clientData,
      p_consent: consentData,
      ...(photo_path && { p_photo_path: photo_path }),
    });

    if (error) {
      console.error("Onboarding submission error:", error);

      // Handle specific error codes with robust checking
      if (
        error?.code === INVALID_AUTH_SPEC ||
        (error?.message && error.message.includes("invalid_authorization_specification"))
      ) {
        // Postgres error code for "invalid_authorization_specification" (invalid or expired token)
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
      }

      return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
    }

    // Track successful submission
    try {
      await supabase.rpc("increment_submission_count", { token_value: token });
    } catch (trackingError) {
      // Don't fail the request if tracking fails
      console.warn("Failed to track submission:", trackingError);
    }

    return NextResponse.json({
      success: true,
      data: {
        contactId,
        message: "Onboarding completed successfully",
      },
    });
  } catch (error) {
    console.error("Submit onboarding error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid form data",
          details: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
