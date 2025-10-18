/**
 * VoiceRecorder Component Unit Tests
 * Test-Driven Development (TDD) - Task 1.1.1
 *
 * Tests for VoiceRecorder component functionality:
 * - Microphone button rendering
 * - MediaRecorder API integration
 * - Waveform visualization
 * - 3-minute timer countdown
 * - Audio recording state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VoiceRecorder } from "../../../app/(authorisedRoute)/contacts/[contactId]/notes/[noteId]/_components/VoiceRecorder";

/**
 * Mock MediaRecorder API
 * The MediaRecorder API is not available in jsdom test environment
 * so we need to mock it for testing
 */
class MockMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    // Store stream and options for testing
  }

  start(): void {
    this.state = "recording";
  }

  stop(): void {
    this.state = "inactive";
    if (this.onstop) {
      this.onstop();
    }
  }

  pause(): void {
    this.state = "paused";
  }

  resume(): void {
    this.state = "recording";
  }
}

describe("VoiceRecorder Component", () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock navigator.mediaDevices.getUserMedia
    mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: vi.fn(),
          kind: "audio",
        },
      ],
      getAudioTracks: () => [
        {
          stop: vi.fn(),
        },
      ],
    } as unknown as MediaStream);

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
      configurable: true,
    });

    // Mock MediaRecorder constructor
    global.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

    // Mock AudioContext (not available in jsdom)
    global.AudioContext = vi.fn().mockImplementation(() => ({
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteTimeDomainData: vi.fn(),
      }),
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
      }),
      close: vi.fn(),
    })) as typeof AudioContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Task 1.1.1: Test that VoiceRecorder renders with microphone button
   * Expected behavior:
   * - Component renders without crashing
   * - Microphone button is visible
   * - Button has accessible label/aria-label
   */
  it("should render with microphone button", () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />);

    // Look for microphone button by role and accessible name
    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    expect(micButton).toBeInTheDocument();
  });

  it("should have proper accessibility attributes on microphone button", () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });

    // Button should have aria-label for screen readers
    expect(micButton).toHaveAttribute("aria-label");

    // Button should not be disabled by default
    expect(micButton).not.toBeDisabled();
  });

  /**
   * Task 1.1.2: Test MediaRecorder API initialization
   * Expected behavior:
   * - getUserMedia is called when recording starts
   * - MediaRecorder is instantiated with audio stream
   * - Error handling for permission denied
   */
  it("should request microphone permission when recording starts", async () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
  });

  it("should handle microphone permission denied", async () => {
    // Mock permission denied error
    mockGetUserMedia.mockRejectedValueOnce(new Error("Permission denied"));

    const onError = vi.fn();
    render(<VoiceRecorder onRecordingComplete={vi.fn()} onError={onError} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining("Permission denied"));
    });
  });

  /**
   * Task 1.1.4: Test waveform canvas rendering
   * Expected behavior:
   * - Canvas element appears when recording starts
   * - Canvas has proper dimensions
   * - Canvas is hidden when not recording
   */
  it("should render waveform canvas during recording", async () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />);

    // Canvas should not be visible initially
    expect(screen.queryByRole("img", { name: /waveform/i })).not.toBeInTheDocument();

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    // Wait for recording to start
    await waitFor(() => {
      const canvas = screen.getByRole("img", { name: /waveform/i });
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName).toBe("CANVAS");
    });
  });

  /**
   * Task 1.1.6: Test 3-minute timer functionality
   * Expected behavior:
   * - Timer displays 3:00 initially
   * - Timer counts down when recording
   * - Recording auto-stops at 0:00
   */
  it("should display 3-minute timer countdown", async () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} maxDuration={180} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      // Timer should show 3:00 or countdown
      const timer = screen.getByText(/[0-2]:[0-5][0-9]/);
      expect(timer).toBeInTheDocument();
    });
  });

  it("should auto-stop recording after max duration", async () => {
    vi.useFakeTimers();
    const onRecordingComplete = vi.fn();

    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} maxDuration={3} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    // Fast-forward past max duration
    vi.advanceTimersByTime(4000);

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  /**
   * Task 1.1.8: Test recording controls
   * Expected behavior:
   * - Stop button appears during recording
   * - Stop button completes recording
   * - Recorded audio blob is returned via callback
   */
  it("should show stop button during recording", async () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      const stopButton = screen.getByRole("button", { name: /stop|finish/i });
      expect(stopButton).toBeInTheDocument();
    });
  });

  it("should call onRecordingComplete with audio blob when stopped", async () => {
    const onRecordingComplete = vi.fn();
    render(<VoiceRecorder onRecordingComplete={onRecordingComplete} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      const stopButton = screen.getByRole("button", { name: /stop|finish/i });
      fireEvent.click(stopButton);
    });

    await waitFor(() => {
      expect(onRecordingComplete).toHaveBeenCalledWith(expect.any(Blob));
    });
  });

  /**
   * Task 1.1.10: Test recording state indicators
   * Expected behavior:
   * - Visual indication when recording is active
   * - Button state changes between recording/idle
   * - Proper cleanup on unmount
   */
  it("should show visual recording indicator", async () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      // Look for recording indicator (could be pulsing dot, text, etc.)
      const indicator = screen.getByText(/recording/i);
      expect(indicator).toBeInTheDocument();
    });
  });

  it("should cleanup media stream on unmount", async () => {
    const mockTrack = {
      stop: vi.fn(),
      kind: "audio",
    };

    const mockStream = {
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
    } as unknown as MediaStream;

    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { unmount } = render(<VoiceRecorder onRecordingComplete={vi.fn()} />);

    const micButton = screen.getByRole("button", { name: /microphone|record|start recording/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    unmount();

    // Track should be stopped on cleanup
    expect(mockTrack.stop).toHaveBeenCalled();
  });
});
