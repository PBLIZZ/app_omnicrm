// Enhanced examples showing Zod 4 features for your existing schemas
// This file demonstrates improvements you can make to your validation schemas

import { z } from "zod";

// Example 1: Enhanced sync preferences with better error messages
export const EnhancedUserSyncPrefsUpdateSchema = z
  .object({
    // Using the new Zod 4 error syntax for better UX
    gmailQuery: z
      .string({ error: "Gmail query is required" })
      .min(1, { error: "Gmail query cannot be empty" })
      .max(1000, { error: "Gmail query is too long (max 1000 characters)" })
      .optional(),
    
    gmailLabelIncludes: z
      .array(z.string({ error: "Label name must be text" }), { 
        error: "Gmail labels must be a list" 
      })
      .optional(),
    
    gmailTimeRangeDays: z
      .number({ error: "Time range must be a number" })
      .int({ error: "Time range must be a whole number" })
      .min(1, { error: "Time range must be at least 1 day" })
      .max(365, { error: "Time range cannot exceed 365 days" })
      .optional(),
    
    calendarIncludePrivate: z
      .boolean({ error: "Please select yes or no for private calendars" })
      .optional(),
    
    // Enhanced with conditional error messages
    driveMaxSizeMB: z
      .number()
      .int()
      .min(1)
      .max(5, { 
        error: "File size limit cannot exceed 5MB due to processing constraints" 
      })
      .optional(),
  })
  .strict();

// Example 2: Enhanced email validation with context-aware errors
export const EnhancedEmailSchema = z
  .string({ 
    error: (issue) => {
      if (issue.input === undefined) {
        return "Email address is required";
      }
      return "Please enter a valid email address";
    }
  })
  .email({ error: "Please enter a valid email address (e.g., user@example.com)" });

// Example 3: Enhanced array validation with better messaging
export const EnhancedCalendarSelectionSchema = z
  .array(
    z.string({ error: "Calendar ID must be text" }), 
    { error: "Calendar selection must be a list" }
  )
  .min(1, { 
    error: "Please select at least one calendar to sync" 
  })
  .max(10, { 
    error: "You can select up to 10 calendars at once" 
  });

// Example 4: Enhanced object validation with field-specific errors
export const EnhancedSyncPreferencesSchema = z.object({
  service: z.enum(["gmail", "calendar", "drive"], {
    error: "Please select a valid service: Gmail, Calendar, or Drive"
  }),
  
  // Conditional validation with better error context
  preferences: z.union([
    z.object({
      timeRangeDays: z
        .number()
        .int()
        .min(1, { error: "Sync period must be at least 1 day" })
        .max(365, { error: "Sync period cannot exceed 1 year" })
        .default(365),
    }),
    z.object({
      selectedCalendarIds: EnhancedCalendarSelectionSchema,
      includePrivate: z.boolean().default(false),
    }),
  ], {
    error: "Invalid preferences format for the selected service"
  }),
});

// Example 5: Using Zod 4's improved refinement with better error paths
export const EnhancedPasswordSchema = z
  .object({
    password: z
      .string({ error: "Password is required" })
      .min(8, { error: "Password must be at least 8 characters long" }),
    confirmPassword: z
      .string({ error: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"], // Error will be attached to confirmPassword field
  });

// Example 6: Enhanced with custom validation and better error messaging
export const EnhancedFileUploadSchema = z.object({
  fileName: z
    .string({ error: "File name is required" })
    .min(1, { error: "File name cannot be empty" })
    .refine(
      (name) => !name.includes(".."), 
      { error: "File name cannot contain '..' for security reasons" }
    ),
  
  fileSize: z
    .number({ error: "File size must be specified" })
    .positive({ error: "File size must be greater than 0" })
    .max(5 * 1024 * 1024, { 
      error: "File size cannot exceed 5MB" 
    }),
  
  mimeType: z
    .string({ error: "File type is required" })
    .refine(
      (type) => ["image/jpeg", "image/png", "application/pdf"].includes(type),
      { error: "Only JPEG, PNG, and PDF files are allowed" }
    ),
});

// Example 7: Using Zod 4's new error function with issue inspection
export const EnhancedUserInputSchema = z
  .string({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (issue: any) => {
      switch (issue.code) {
        case "invalid_type":
          return issue.input === undefined 
            ? "This field is required" 
            : "Please enter text only";
        case "too_small":
          return `Please enter at least ${issue['minimum']} characters`;
        case "too_big":
          return `Please keep it under ${issue['maximum']} characters`;
        default:
          return "Invalid input";
      }
    }
  })
  .min(3)
  .max(100);

// Export types for use in your application
export type EnhancedUserSyncPrefsUpdate = z.infer<typeof EnhancedUserSyncPrefsUpdateSchema>;
export type EnhancedSyncPreferences = z.infer<typeof EnhancedSyncPreferencesSchema>;
export type EnhancedPasswordForm = z.infer<typeof EnhancedPasswordSchema>;
export type EnhancedFileUpload = z.infer<typeof EnhancedFileUploadSchema>;
