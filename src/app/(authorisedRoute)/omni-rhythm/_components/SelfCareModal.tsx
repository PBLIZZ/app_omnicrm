"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addMinutes } from "date-fns";
import { Cross } from "lucide-react";
import { SelfCareModalProps } from "./types";

const selfCareOptions = [
  "Reflect on the day",
  "Centre myself",
  "Meditate",
  "Take a walk outside without my phone",
  "Practice gratitude",
  "Deep breathing exercises",
  "Stretch and movement",
  "Journal writing",
  "Listen to calming music",
  "Read something inspiring",
];

export function SelfCareModal({ onCreateEvent }: SelfCareModalProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to current time and 30 minutes duration
  const now = new Date();
  const defaultEndTime = addMinutes(now, 30);

  const [formData, setFormData] = useState({
    title: "Self Care Time",
    startDate: format(now, "yyyy-MM-dd"),
    startTime: format(now, "HH:mm"),
    endTime: format(defaultEndTime, "HH:mm"),
    selfCareType: "",
    description: "",
    location: "",
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create event data for Google Calendar API
      const startDateTime = `${formData.startDate}T${formData.startTime}`;
      const endDateTime = `${formData.startDate}T${formData.endTime}`;

      const eventData = {
        summary: formData.title,
        description: `Self Care Activity: ${formData.selfCareType}${formData.description ? `\n\nNotes: ${formData.description}` : ""}`,
        location: formData.location || undefined,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      await onCreateEvent(eventData);
      setOpen(false);
      // Reset form
      const newNow = new Date();
      const newDefaultEndTime = addMinutes(newNow, 30);
      setFormData({
        title: "Self Care Time",
        startDate: format(newNow, "yyyy-MM-dd"),
        startTime: format(newNow, "HH:mm"),
        endTime: format(newDefaultEndTime, "HH:mm"),
        selfCareType: "",
        description: "",
        location: "",
      });
    } catch (error) {
      console.error("Failed to create self care event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Cross className="mr-2 h-4 w-4 text-violet-500" />
          Add Self Care Slot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Self Care Time</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="selfCareType">Self Care Activity</Label>
            <Select
              value={formData.selfCareType}
              onValueChange={(value) => setFormData({ ...formData, selfCareType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a self care activity..." />
              </SelectTrigger>
              <SelectContent>
                {selfCareOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Where will you do this?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Any additional notes or intentions..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Self Care Time"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
