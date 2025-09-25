import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";

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
  token: z.string().min(1, "Token is required"),
  client: ClientDataSchema,
  consent: ConsentDataSchema,
  photo_path: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get client IP and user agent for consent tracking
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");

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

    // Create Supabase client with service role for admin operations
    const supabase = createClient<Database>(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SECRET_KEY"]!,
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

      // Handle specific error codes
      if (error.code === "28000") {
        // Postgres error code for "invalid_authorization_specification" (invalid or expired token)
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
      }

      return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
    }

    // Track successful submission
    try {
      await supabase
        .from("onboarding_tokens")
        .update({
          submission_count: supabase.rpc("increment_submission_count", { token_value: token }),
        })
        .eq("token", token);
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
