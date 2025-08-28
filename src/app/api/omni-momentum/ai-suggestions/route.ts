import { NextRequest } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/server/http/responses";
import { categorizeTask } from "@/lib/openai";
import { enhanceTaskWithAI } from "@/server/ai/task-enhancement";
import { apiRequest } from "@/lib/queryClient";

interface ContextualSuggestion {
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedMinutes: number;
  suggestedTags: string[];
  context: "time-based" | "energy-based" | "wellness" | "productivity";
  confidence: number;
}

// Generate AI-powered contextual suggestions based on user's current state
export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    
    // Generate time-appropriate suggestions
    const suggestions: ContextualSuggestion[] = [];

    // Morning suggestions (6-10 AM)
    if (hour >= 6 && hour < 10) {
      suggestions.push({
        title: "Morning client prep review",
        description: "Review today's client sessions and prepare personalized notes",
        category: "client-care",
        priority: "high",
        estimatedMinutes: 15,
        suggestedTags: ["morning", "client-prep", "planning"],
        context: "time-based",
        confidence: 0.85,
      });

      suggestions.push({
        title: "Set daily wellness intention",
        description: "Take 5 minutes to set your personal wellness intention for the day",
        category: "personal-wellness",
        priority: "medium",
        estimatedMinutes: 5,
        suggestedTags: ["intention", "mindfulness", "personal"],
        context: "wellness",
        confidence: 0.8,
      });
    }

    // Mid-morning suggestions (10 AM - 12 PM)
    else if (hour >= 10 && hour < 12) {
      suggestions.push({
        title: "Follow up with recent clients",
        description: "Send check-in messages to clients from recent sessions",
        category: "client-care",
        priority: "medium",
        estimatedMinutes: 20,
        suggestedTags: ["follow-up", "client-care", "communication"],
        context: "productivity",
        confidence: 0.75,
      });

      suggestions.push({
        title: "Update social media content",
        description: "Share a wellness tip or behind-the-scenes content",
        category: "content-creation",
        priority: "low",
        estimatedMinutes: 15,
        suggestedTags: ["social-media", "content", "wellness-tips"],
        context: "productivity",
        confidence: 0.7,
      });
    }

    // Afternoon suggestions (12 PM - 6 PM)
    else if (hour >= 12 && hour < 18) {
      suggestions.push({
        title: "Admin task batch processing",
        description: "Handle scheduling, invoicing, and administrative tasks in one focused session",
        category: "administrative",
        priority: "medium",
        estimatedMinutes: 30,
        suggestedTags: ["admin", "batch-processing", "efficiency"],
        context: "productivity",
        confidence: 0.8,
      });

      suggestions.push({
        title: "Mindful lunch break",
        description: "Take a proper break to nourish yourself mindfully",
        category: "personal-wellness",
        priority: "high",
        estimatedMinutes: 20,
        suggestedTags: ["self-care", "nutrition", "mindfulness"],
        context: "wellness",
        confidence: 0.9,
      });
    }

    // Evening suggestions (6 PM - 10 PM)
    else if (hour >= 18 && hour < 22) {
      suggestions.push({
        title: "Plan tomorrow's priorities",
        description: "Set up tomorrow's top 3 priorities and prepare for success",
        category: "administrative",
        priority: "medium",
        estimatedMinutes: 10,
        suggestedTags: ["planning", "priorities", "preparation"],
        context: "productivity",
        confidence: 0.85,
      });

      suggestions.push({
        title: "Reflect on today's wins",
        description: "Journal about today's accomplishments and gratitude",
        category: "personal-wellness",
        priority: "low",
        estimatedMinutes: 10,
        suggestedTags: ["reflection", "gratitude", "journaling"],
        context: "wellness",
        confidence: 0.75,
      });
    }

    // Universal wellness suggestions
    suggestions.push({
      title: "5-minute breathing practice",
      description: "Reset your nervous system with conscious breathing",
      category: "personal-wellness",
      priority: "medium",
      estimatedMinutes: 5,
      suggestedTags: ["breathing", "reset", "mindfulness"],
      context: "wellness",
      confidence: 0.95,
    });

    // Limit to top 4 suggestions and sort by confidence
    const topSuggestions = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);

    return ok({ 
      suggestions: topSuggestions,
      generatedAt: now.toISOString(),
      context: {
        hour,
        timeOfDay: hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening",
      }
    });

  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    
    // Return fallback suggestions
    const fallbackSuggestions: ContextualSuggestion[] = [
      {
        title: "Quick client check-in",
        description: "Reach out to a client to see how they're doing",
        category: "client-care", 
        priority: "medium",
        estimatedMinutes: 10,
        suggestedTags: ["client-care", "communication"],
        context: "productivity",
        confidence: 0.6,
      },
      {
        title: "Take a mindful moment",
        description: "Pause and take three deep breaths to center yourself",
        category: "personal-wellness",
        priority: "low", 
        estimatedMinutes: 2,
        suggestedTags: ["mindfulness", "self-care"],
        context: "wellness",
        confidence: 0.8,
      },
    ];

    return ok({ 
      suggestions: fallbackSuggestions,
      generatedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}