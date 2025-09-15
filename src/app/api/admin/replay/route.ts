import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";

const postHandler = createRouteHandler({
  auth: true,
})(async (): Promise<Response> => {
  const apiResponse = new ApiResponseBuilder("admin-replay-post");
  return apiResponse.error(
    "Temporarily disabled for build fix",
    "INTERNAL_ERROR",
    undefined,
    undefined,
    503,
  );
});

const getHandler = createRouteHandler({
  auth: true,
})(async (): Promise<Response> => {
  const apiResponse = new ApiResponseBuilder("admin-replay-get");
  return apiResponse.error(
    "Temporarily disabled for build fix",
    "INTERNAL_ERROR",
    undefined,
    undefined,
    503,
  );
});

export const POST = postHandler;
export const GET = getHandler;
