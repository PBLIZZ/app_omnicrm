/**
 * VoiceRecorder Component
 * Task 1.1.3 - MediaRecorder API Integration
 *
 * A voice recording component with:
 * - Microphone button to start/stop recording
 * - Real-time waveform visualization during recording
 * - 3-minute maximum duration with countdown timer
 * - Auto-stop when max duration reached
 * - Returns audio blob via callback
 *
 * @see __tests__/VoiceRecorder.test.tsx for test coverage
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoiceRecorderProps {
  /**
   * Callback when recording is complete
   * Receives the recorded audio as a Blob
   */
  onRecordingComplete: (audioBlob: Blob) => void;

  /**
   * Optional error handler
   */
  onError?: (error: string) => void;

  /**
   * Maximum recording duration in seconds
   * @default 180 (3 minutes)
   */
  maxDuration?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function VoiceRecorder({
  onRecordingComplete,
  onError,
  maxDuration = 180,
  className,
}: VoiceRecorderProps): JSX.Element {
  const [isRecording, setIsRecording] = useState(false);
  const [remainingTime, setRemainingTime] = useState(maxDuration);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  /**
   * Cleanup function to stop media tracks and clear timers
   */
  const cleanup = useCallback(() => {
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    mediaRecorderRef.current = null;
    analyserRef.current = null;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Start recording audio
   */
  const startRecording = async (): Promise<void> => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available event
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle stop event
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(audioBlob);
        cleanup();
        setIsRecording(false);
        setRemainingTime(maxDuration);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRemainingTime(maxDuration);

      // Setup waveform visualization
      setupWaveform(stream);

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            stopRecording();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to access microphone";
      if (onError) {
        onError(errorMessage);
      }
      cleanup();
    }
  };

  /**
   * Stop recording audio
   */
  const stopRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  /**
   * Setup waveform visualization
   */
  const setupWaveform = (stream: MediaStream): void => {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      drawWaveform();
    } catch (error) {
      console.error("Failed to setup waveform visualization:", error);
    }
  };

  /**
   * Draw waveform visualization on canvas
   */
  const drawWaveform = (): void => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = (): void => {
      if (!isRecording) return;

      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "rgb(250, 250, 250)";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(59, 130, 246)"; // Blue-500
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] ?? 128) / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Recording Controls */}
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              void startRecording();
            }}
            aria-label="Start recording"
            className="rounded-full h-16 w-16"
          >
            <Mic className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={stopRecording}
            aria-label="Stop recording"
            className="rounded-full h-16 w-16"
          >
            <Square className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Timer Display */}
      {isRecording && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Recording</span>
          </div>
          <span className="text-2xl font-mono font-semibold tabular-nums">
            {formatTime(remainingTime)}
          </span>
        </div>
      )}

      {/* Waveform Visualization */}
      {isRecording && (
        <canvas
          ref={canvasRef}
          width={400}
          height={100}
          role="img"
          aria-label="Audio waveform visualization"
          className="border rounded-lg bg-gray-50"
        />
      )}
    </div>
  );
}
