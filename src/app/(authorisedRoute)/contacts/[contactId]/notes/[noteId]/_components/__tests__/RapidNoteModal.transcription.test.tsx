import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React, { useEffect } from "react";

// Mock VoiceRecorder to immediately emit onRecordingComplete on mount
vi.mock("../VoiceRecorder", () => {
  return {
    VoiceRecorder: ({ onRecordingComplete }: { onRecordingComplete: (b: Blob) => void }) => {
      useEffect(() => {
        onRecordingComplete(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }));
      }, [onRecordingComplete]);
      return <div data-testid="voice-recorder" />;
    },
  };
});

// Mock waitForTranscription to resolve after a timeout so we can assert the in-progress UI
vi.mock("../waitForTranscription", () => {
  return {
    waitForTranscription: (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1000)),
  };
});

import { RapidNoteModal } from "../RapidNoteModal";

describe("RapidNoteModal transcription progress (1.5.11)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("shows a progress indicator while transcribing", async () => {
    render(
      <RapidNoteModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => ({ success: true })}
        lastViewedContactId="c-1"
      />,
    );

    // Click mic to enter recording state so mocked VoiceRecorder mounts
    const micButton = screen.getByRole("button", { name: /record voice note/i });
    await act(async () => {
      micButton.click();
    });

    // VoiceRecorder mock will call onRecordingComplete -> transcription starts
    // The UI should display the transcribing indicator during the mocked delay
    expect(screen.queryByText(/Transcribing…/i)).toBeInTheDocument();

    // Fast-forward the mocked wait
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // After resolving, the indicator should eventually disappear
    // Use findBy to allow state updates to flush
    await act(async () => {
      // Nothing to do; act to flush effects
    });

    expect(screen.queryByText(/Transcribing…/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
