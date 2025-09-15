import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";

const postHandler = createRouteHandler({
  auth: true,
})(async () => {
  const apiResponse = new ApiResponseBuilder("admin-replay-post");
  return apiResponse.error(
    "Temporarily disabled for build fix",
    "INTERNAL_ERROR",
    undefined,
    undefined,
  );
});

const getHandler = createRouteHandler({
  auth: true,
})(async () => {
  const apiResponse = new ApiResponseBuilder("admin-replay-get");
  return apiResponse.error(
    "Temporarily disabled for build fix",
    "INTERNAL_ERROR",
    undefined,
    undefined,
  );
});

export const POST = postHandler;
export const GET = getHandler;
