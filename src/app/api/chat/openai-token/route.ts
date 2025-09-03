import { OpenAI } from "@openai/agents";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI();

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ephemeralKey = await openai.beta.chat.sessions.create({
      assistant_id: process.env.ASSISTANT_ID!,
    });
    return NextResponse.json(ephemeralKey);
  } catch (error) {
    console.error("Error creating ephemeral key:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
