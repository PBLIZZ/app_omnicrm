"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Settings,
  Clock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns";
import type { ContactWithLastNote } from "@/server/db/business-schemas/contacts";

interface PersonalDetailsViewProps {
  contact: ContactWithLastNote;
  onEdit: () => void;
}

export function PersonalDetailsView({ contact, onEdit }: PersonalDetailsViewProps) {
  const formatAddress = (address: unknown) => {
    if (!address || typeof address !== "object") return null;

    const addr = address as Record<string, unknown>;
    const parts = [
      addr["street"],
      addr["city"],
      addr["state"],
      addr["postalCode"],
      addr["country"],
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : null;
  };

  const formatHealthContext = (healthContext: unknown) => {
    if (!healthContext || typeof healthContext !== "object") return null;

    const health = healthContext as Record<string, unknown>;
    return {
      conditions: health["conditions"] as string[] | undefined,
      medications: health["medications"] as string[] | undefined,
      allergies: health["allergies"] as string[] | undefined,
      emergencyContact: health["emergencyContact"] as string | undefined,
    };
  };

  const formatPreferences = (preferences: unknown) => {
    if (!preferences || typeof preferences !== "object") return null;

    const prefs = preferences as Record<string, unknown>;
    return {
      communicationMethod: prefs["communicationMethod"] as string | undefined,
      appointmentReminders: prefs["appointmentReminders"] as boolean | undefined,
      marketingConsent: prefs["marketingConsent"] as boolean | undefined,
      dataSharing: prefs["dataSharing"] as boolean | undefined,
    };
  };

  const healthContext = formatHealthContext(contact.healthContext);
  const preferences = formatPreferences(contact.preferences);
  const address = formatAddress(contact.address);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Personal Details</h2>
        <Button onClick={onEdit}>
          <Settings className="h-4 w-4 mr-2" />
          Edit Details
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{contact.displayName}</div>
                  <div className="text-sm text-muted-foreground">Display Name</div>
                </div>
              </div>

              {contact.primaryEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{contact.primaryEmail}</div>
                    <div className="text-sm text-muted-foreground">Primary Email</div>
                  </div>
                </div>
              )}

              {contact.primaryPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{contact.primaryPhone}</div>
                    <div className="text-sm text-muted-foreground">Primary Phone</div>
                  </div>
                </div>
              )}

              {contact.dateOfBirth && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {format(new Date(contact.dateOfBirth), "MMMM d, yyyy")}
                    </div>
                    <div className="text-sm text-muted-foreground">Date of Birth</div>
                  </div>
                </div>
              )}

              {address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{address}</div>
                    <div className="text-sm text-muted-foreground">Address</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Wellness Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2" />
              Wellness Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.lifecycleStage && (
              <div>
                <div className="text-sm font-medium mb-2">Lifecycle Stage</div>
                <Badge variant="secondary">{contact.lifecycleStage}</Badge>
              </div>
            )}

            {contact.clientStatus && (
              <div>
                <div className="text-sm font-medium mb-2">Client Status</div>
                <Badge variant="outline">{contact.clientStatus}</Badge>
              </div>
            )}

            {contact.referralSource && (
              <div>
                <div className="text-sm font-medium mb-2">Referral Source</div>
                <div className="text-sm">{contact.referralSource}</div>
              </div>
            )}

            {contact.confidenceScore && (
              <div>
                <div className="text-sm font-medium mb-2">Confidence Score</div>
                <div className="text-sm">{contact.confidenceScore}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Information */}
        {healthContext && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Health Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthContext.conditions && healthContext.conditions.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Medical Conditions</div>
                  <div className="space-y-1">
                    {healthContext.conditions.map((condition, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {healthContext.medications && healthContext.medications.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Medications</div>
                  <div className="space-y-1">
                    {healthContext.medications.map((medication, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {medication}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {healthContext.allergies && healthContext.allergies.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Allergies</div>
                  <div className="space-y-1">
                    {healthContext.allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {(contact.emergencyContactName || contact.emergencyContactPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.emergencyContactName && (
                <div>
                  <div className="text-sm font-medium mb-1">Name</div>
                  <div className="text-sm">{contact.emergencyContactName}</div>
                </div>
              )}

              {contact.emergencyContactPhone && (
                <div>
                  <div className="text-sm font-medium mb-1">Phone</div>
                  <div className="text-sm">{contact.emergencyContactPhone}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preferences & Consents */}
        {preferences && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Preferences & Consents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preferences.communicationMethod && (
                <div>
                  <div className="text-sm font-medium mb-1">Preferred Communication</div>
                  <div className="text-sm">{preferences.communicationMethod}</div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Appointment Reminders</span>
                  <Badge variant={preferences.appointmentReminders ? "default" : "secondary"}>
                    {preferences.appointmentReminders ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Marketing Consent</span>
                  <Badge variant={preferences.marketingConsent ? "default" : "secondary"}>
                    {preferences.marketingConsent ? "Consented" : "Not Consented"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Sharing</span>
                  <Badge variant={preferences.dataSharing ? "default" : "secondary"}>
                    {preferences.dataSharing ? "Allowed" : "Restricted"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-1">Source</div>
              <div className="text-sm">{String(contact.source || "Manual Entry")}</div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Created</div>
              <div className="text-sm">
                {contact.createdAt
                  ? formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })
                  : "Unknown"}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Last Updated</div>
              <div className="text-sm">
                {contact.updatedAt
                  ? formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })
                  : "Unknown"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
