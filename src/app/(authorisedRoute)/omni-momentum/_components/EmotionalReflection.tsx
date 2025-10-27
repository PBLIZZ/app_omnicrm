"use client";

import { useState } from "react";
import { Button, Textarea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Emotional Reflection Component - Chakra Deep Dive UI
 *
 * Matches the exact design from the reference images with proper colors,
 * backgrounds, and styling.
 */

export type ReflectionState = -3 | -2 | -1 | 0 | 1 | 2 | 3; // -3 (far left) to +3 (far right)

export interface ReflectionScores {
  safety: ReflectionState | null;
  creativity: ReflectionState | null;
  confidence: ReflectionState | null;
  connection: ReflectionState | null;
  expression: ReflectionState | null;
  clarity: ReflectionState | null;
  purpose: ReflectionState | null;
}

interface ReflectionDomain {
  id: keyof ReflectionScores;
  chakraName: string;
  subtitle: string;
  energyCenterName: string; // Short name for the energy center (e.g., "Base Energy", "Creative Flow")
  titleColour: string;
  circleBorderColor: string; // Border color for circle
  circleFillColor: string; // Fill/background color inside circle
  question: string;
  underLabel: string; // Left end of slider (under-active)
  balancedLabel: string; // Center of slider (balanced)
  overLabel: string; // Right end of slider (over-active)
}

const REFLECTION_DOMAINS: ReflectionDomain[] = [
  {
    id: "safety",
    energyCenterName: "Base Energy",
    chakraName:
      "Our fundamental sense of security, belonging, and groundedness; the foundation of our physical and emotional survival and stability.",
    subtitle:
      "This is our most basic need for safety and feeling secure in the world. It relates to our home, family, finances, and feeling supported and stable. When balanced, we feel grounded and trust that our fundamental needs are met.",
    titleColour: "text-red-600",
    circleBorderColor: "border-red-600",
    circleFillColor: "bg-red-300",
    question:
      "Is your business grounded with a core clientele? Are you grounded with a core wellness practice? Do you want to write a few words about your current state or that of your business?",
    underLabel: "Insecure",
    balancedLabel: "Grounded",
    overLabel: "Controlling",
  },
  {
    id: "creativity",
    energyCenterName: "Creative Flow",
    chakraName:
      "Our emotional fluidity, creativity, and capacity for pleasure and intimacy; the wellspring of our desires and connection to our inner emotional landscape.",
    subtitle:
      "This relates to our emotions, creativity, and sensuality. It's about how we experience pleasure, adapt to change, and express our authentic emotional self without judgment or blockage.",
    titleColour: "text-orange-400",
    circleBorderColor: "border-orange-400",
    circleFillColor: "bg-orange-200",
    question:
      "Does your business allow for creative expression and emotional flow? Are you adapting well to change in your practice?",
    underLabel: "Numb",
    balancedLabel: "Flowing",
    overLabel: "Compulsive",
  },
  {
    id: "confidence",
    energyCenterName: "Identity",
    chakraName:
      "Our source of personal power, self-esteem, and motivation; the engine from which our actions come, governing identity, ego, and will.",
    subtitle:
      "Our core sense of self, our confidence, and our drive is where our willpower resides, influencing our ability to take action, make decisions, and feel capable and in control of our lives.",
    titleColour: "text-yellow-400",
    circleBorderColor: "border-yellow-400",
    circleFillColor: "bg-yellow-200",
    question:
      "Do you feel capable and in control of your business direction? Is your confidence driving your practice forward?",
    underLabel: "Procrastinating",
    balancedLabel: "Focused",
    overLabel: "Controlling",
  },
  {
    id: "connection",
    energyCenterName: "Heart",
    chakraName:
      "Our capacity for empathy, connection, and emotional well-being; the center of our relationships and COMPASSION.",
    subtitle:
      "It's essentially about how we relate to others and ourselves on an emotional level, encompassing LOVE, forgiveness, kindness, and our ability to connect meaningfully.",
    titleColour: "text-green-500",
    circleBorderColor: "border-green-500",
    circleFillColor: "bg-green-300",
    question:
      "Are you connecting meaningfully with your clients and community? Is compassion at the heart of your business relationships?",
    underLabel: "Guarded",
    balancedLabel: "Loving",
    overLabel: "Enmeshed",
  },
  {
    id: "expression",
    energyCenterName: "Communication",
    chakraName:
      "Our voice, authenticity, and ability to articulate our thoughts, feelings, and truths effectively; the conduit for creative expression and honest interaction.",
    subtitle:
      "This is all about EXPRESSION of ourselves. This includes verbal COMMUNICATION, but also creative expression like art, writing, or music. It's about speaking our truth, setting boundaries, and feeling heard and understood.",
    titleColour: "text-sky-400",
    circleBorderColor: "border-sky-400",
    circleFillColor: "bg-sky-200",
    question:
      "Are you clearly communicating your business value and boundaries? Do you feel heard and understood by your clients?",
    underLabel: "Vague",
    balancedLabel: "Clear",
    overLabel: "Overbearing",
  },
  {
    id: "clarity",
    energyCenterName: "Insight",
    chakraName:
      "Our intuition, insight, and ability to perceive patterns and possibilities beyond the obvious; the source of our mental CLARITY and foresight.",
    subtitle:
      "This is about our inner knowing and how clearly we 'see' things, both literally and figuratively. It encompasses our ability to think critically, trust our gut feelings, and envision future possibilities or solutions.",
    titleColour: "text-indigo-600",
    circleBorderColor: "border-indigo-600",
    circleFillColor: "bg-indigo-300",
    question:
      "Do you have clarity on your business vision and next steps? Are you trusting your intuition in business decisions?",
    underLabel: "Confused",
    balancedLabel: "Perceptive",
    overLabel: "Over-thinking",
  },
  {
    id: "purpose",
    energyCenterName: "Purpose",
    chakraName:
      "Our sense of PURPOSE, understanding, and alignment with our deepest values; the wellspring of wisdom and existential fulfillment.",
    subtitle:
      "It's about how we connect to something larger than ourselves, whether that's a spiritual belief, a community, or a personal philosophy. This chakra relates to our feeling of being connected, finding meaning in life, and accessing our deepest wisdom.",
    titleColour: "text-violet-600",
    circleBorderColor: "border-violet-600",
    circleFillColor: "bg-violet-300",
    question:
      "Is your business aligned with your deeper purpose and values? Do you feel connected to something greater through your practice?",
    underLabel: "Disconnected",
    balancedLabel: "Connected",
    overLabel: "Spaced Out",
  },
];

interface EmotionalReflectionProps {
  onComplete: (scores: ReflectionScores, notes?: string) => void;
  onCancel?: () => void;
}

export function EmotionalReflection({
  onComplete,
  onCancel,
}: EmotionalReflectionProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState<ReflectionScores>({
    safety: 0, // Default to center (balanced)
    creativity: 0,
    confidence: 0,
    connection: 0,
    expression: 0,
    clarity: 0,
    purpose: 0,
  });
  const [reflectionNotes, setReflectionNotes] = useState("");

  const currentDomain = REFLECTION_DOMAINS[currentStep];
  const isLastStep = currentStep === REFLECTION_DOMAINS.length - 1;
  const progressPercent = Math.round(((currentStep + 1) / REFLECTION_DOMAINS.length) * 100);
  const currentScore = (currentDomain ? scores[currentDomain.id] : 0) ?? 0;

  const handleSliderClick = (value: ReflectionState): void => {
    if (!currentDomain) return;
    setScores((prev) => ({
      ...prev,
      [currentDomain.id]: value,
    }));
  };

  const handleNext = (): void => {
    if (isLastStep) {
      onComplete(scores, reflectionNotes.trim() || undefined);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = (): void => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!currentDomain) return <></>;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-5">
          {/* Progress */}
          <div className="flex items-center gap-3 text-xs">
            {/* 1 of 7 badge */}
            <span className="px-3 py-1 rounded-full border-2 border-orange-400 text-orange-400 font-semibold whitespace-nowrap">
              {currentStep + 1} of 7
            </span>

            {/* Full-width progress bar */}
            <div className="flex-1 h-3 bg-gradient-to-r from-green-100 to-green-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* % Complete */}
            <span className="text-orange-400 font-semibold whitespace-nowrap">
              {progressPercent}% Complete
            </span>
          </div>

          {/* Chakra Header */}
          <div className="flex items-start gap-4 pt-1">
            <div
              className={cn(
                "w-16 h-16 rounded-full border-4 flex-shrink-0",
                currentDomain.circleBorderColor,
                currentDomain.circleFillColor,
              )}
            />
            <div className="pt-1">
              <h2 className="text-2xl font-bold">
                <span className={currentDomain.titleColour}>
                  {currentDomain.energyCenterName} :{" "}
                </span>
                <span className="text-lg font-light text-gray-600">{currentDomain.chakraName}</span>
                <span className="text-lg font-light text-gray-500"> {currentDomain.subtitle}</span>
              </h2>
            </div>
          </div>

          {/* Slider - Shows spectrum from under to balanced to over (7 positions) */}
          <div className="space-y-3 py-2 max-w-2xl mx-auto">
            {/* Slider Track */}
            <div className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Background colored bar with red-green-red gradient */}
                    <div className="h-12 rounded-full bg-gradient-to-r from-red-100 via-green-100 to-red-100 border-2 border-gray-300 relative flex items-center px-4">
                {/* Thin grey line inside the colored bar */}
                <div className="absolute inset-x-4 h-0.5 bg-gray-400 rounded-full" />

                {/* Clickable area - captures clicks along the bar */}
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = clickX / rect.width;
                    const value = Math.round(percentage * 6 - 3); // Map 0-1 to -3 to 3
                    const clampedValue = Math.max(-3, Math.min(3, value)) as ReflectionState;
                    handleSliderClick(clampedValue);
                  }}
                />

                {/* Pointer indicator with "You are here" label */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
                  style={{
                    left: `calc(8% + ${((currentScore + 3) / 6) * 84}%)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Pointer dot - white circle with grey center */}
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 bg-white rounded-full shadow-lg" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                    </div>
                  </div>

                  {/* "You are here" label */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-300">
                      You are here
                    </span>
                  </div>
                </div>
              </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click anywhere on the bar to move the pointer</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Labels */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span
                className={cn(
                  "font-medium transition-colors text-left",
                  currentScore <= -2 ? "text-gray-900" : "text-gray-500",
                )}
              >
                {currentDomain.underLabel}
              </span>
              <span
                className={cn(
                  "font-semibold transition-colors text-center",
                  currentScore === 0 ? "text-green-700" : "text-gray-500",
                )}
              >
                {currentDomain.balancedLabel}
              </span>
              <span
                className={cn(
                  "font-medium transition-colors text-right",
                  currentScore >= 2 ? "text-gray-900" : "text-gray-500",
                )}
              >
                {currentDomain.overLabel}
              </span>
            </div>
          </div>

          {/* Question - Tighter spacing to textarea */}
          <div className="pt-0 pb-0">
            <h3 className="py-0 text-lg font-medium text-gray-600">{currentDomain.question}</h3>
          </div>

          {/* Reflection Textarea - Lighter gray background */}
          <Textarea
            value={reflectionNotes}
            onChange={(e) => setReflectionNotes(e.target.value)}
            placeholder="Take a moment to reflect on the definitions above and write down your thoughts..."
            rows={4}
            className={cn(
              "resize-none transition-all duration-200",
              // ── Border (double the original thickness) ──
              "border-4", // 2 × default border width
              currentDomain.circleBorderColor, // e.g. border-sky-400

              // ── Background – always -50 (very light) ──
              currentDomain.circleFillColor.replace(/bg-[a-z]+-\d+/, (match) =>
                match.replace(/\d+/, "50"),
              ),

              // ── Focus styles ──
              "focus:border-4", // keep thick on focus
              "focus:ring-2",
              `focus:ring-${currentDomain.circleBorderColor.replace("border-", "")}/20`,

              // ── Text colour – dark chakra shade ──
              currentDomain.circleBorderColor
                .replace("border-", "text-")
                .replace(/300|400|500|600/, "850"),
            )}
          />

          {/* Helper Text */}
          <p className="text-xs text-gray-500 italic text-left">
            Your reflections help you identify patterns for you and your business over time and can
            guide your business decisions for the better
          </p>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {currentStep > 0 ? (
              <Button
                onClick={handlePrevious}
                variant="outline"
                size="lg"
                className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50 text-base font-medium"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Previous
              </Button>
            ) : (
              <Button
                onClick={onCancel}
                variant="outline"
                size="lg"
                className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50 text-base font-medium"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleNext}
              size="lg"
              className={cn(
                "flex-1 h-12 text-white text-base font-semibold transition-all",
                "bg-blue-500 hover:bg-blue-600",
              )}
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ChevronRight className="w-5 h-5 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
