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
import { format, addHours } from "date-fns";
import { Euro } from "lucide-react";
import { SessionModalProps, CalendarEventCreateData } from "./types";

const sessionTypes = [
  "Appointment",
  "Class",
  "Workshop",
  "Group Class",
  "One to One",
  "Consultation",
  "Follow-up",
  "Assessment",
  "Treatment",
  "Therapy Session",
];

export function SessionModal({ onCreateEvent }: SessionModalProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to current time and 1 hour duration
  const now = new Date();
  const defaultEndTime = addHours(now, 1);

  const [formData, setFormData] = useState({
    title: "",
    startDate: format(now, "yyyy-MM-dd"),
    startTime: format(now, "HH:mm"),
    endTime: format(defaultEndTime, "HH:mm"),
    sessionType: "",
    description: "",
    location: "",
    attendees: "",
    clientName: "",
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create event data for Google Calendar API
      const startDateTime = `${formData.startDate}T${formData.startTime}`;
      const endDateTime = `${formData.startDate}T${formData.endTime}`;

      const eventData: CalendarEventCreateData = {
        summary: formData.title || `${formData.sessionType} Session`,
        description: `Session Type: ${formData.sessionType}\nClient: ${formData.clientName}\n\nAttendees: ${formData.attendees}\n\nNotes: ${formData.description}`,
        ...(formData.location && { location: formData.location }),
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        ...(formData.attendees && {
          attendees: formData.attendees.split(",").map((email) => ({ email: email.trim() })),
        }),
      };

      if (onCreateEvent) {
        await onCreateEvent(eventData);
      }
      setOpen(false);
      // Reset form
      const newNow = new Date();
      const newDefaultEndTime = addHours(newNow, 1);
      setFormData({
        sessionType: "",
        title: "",
        clientName: "",
        startDate: format(newNow, "yyyy-MM-dd"),
        startTime: format(newNow, "HH:mm"),
        endTime: format(newDefaultEndTime, "HH:mm"),
        location: "",
        attendees: "",
        description: "",
      });
    } catch (error) {
      console.error("Failed to create session event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Euro className="mr-2 h-4 w-4 text-green-500" />
          Add Client Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionType">Session Type</Label>
            <Select
              value={formData.sessionType}
              onValueChange={(value) => setFormData({ ...formData, sessionType: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose session type..." />
              </SelectTrigger>
              <SelectContent>
                {sessionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Leave blank to auto-generate from session type"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name (optional)</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="Client or participant name"
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
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Where will this session take place?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">Attendees (optional)</Label>
            <Input
              id="attendees"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              placeholder="Email addresses separated by commas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes/Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Session details, preparation notes, or special requirements..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
