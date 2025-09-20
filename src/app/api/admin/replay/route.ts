import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";

const postHandler = createRouteHandler({
  auth: true,
})(async () => {
  return NextResponse.json({ error: "Temporarily disabled for build fix" }, { status: 500 });
});

const getHandler = createRouteHandler({
  auth: true,
})(async () => {
  return NextResponse.json({ error: "Temporarily disabled for build fix" }, { status: 500 });
});

export const POST = postHandler;
export const GET = getHandler;
