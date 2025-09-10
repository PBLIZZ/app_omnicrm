import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { createContactService } from "@/server/services/contacts.service";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_create_test_contact" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.create_test_contact", requestId);

  try {
    const testContact = await createContactService(userId, {
      displayName: "Test Contact",
      primaryEmail: "test@example.com",
      source: "manual",
    });

    return api.success({
      message: "Test contact created successfully",
      contact: testContact,
    });
  } catch (error) {
    return api.error(
      "Failed to create test contact",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
