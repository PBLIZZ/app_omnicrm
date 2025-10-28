"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { User, Building2, Globe, Phone, FileText, Shield, CheckCircle, Upload } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { fetchCurrentUser } from "@/lib/services/client/auth.service";
import { get, patch } from "@/lib/api";
import { toast } from "sonner";

interface UserProfile {
  userId: string;
  preferredName: string | null;
  organizationName: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Render the Practice Profile settings page where users can view and edit their profile, contact details, and professional bio.
 *
 * Loads current authentication and profile data, initializes form state from the profile, and submits updates to the profile API while providing success/error feedback and cache invalidation.
 *
 * @returns The React element representing the profile settings UI.
 */
export default function ProfileSettingsPage(): JSX.Element {
  const queryClient = useQueryClient();

  // Fetch current auth user (for Google photo/email)
  const { data: authUser } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { user } = await fetchCurrentUser();
      return user;
    },
  });

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/user-profile"],
    queryFn: async () => get("/api/user-profile"),
  });

  // Form state
  const [formData, setFormData] = useState({
    preferredName: "",
    organizationName: "",
    bio: "",
    phone: "",
    website: "",
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        preferredName: profile.preferredName ?? "",
        organizationName: profile.organizationName ?? "",
        bio: profile.bio ?? "",
        phone: profile.phone ?? "",
        website: profile.website ?? "",
      });
    }
  }, [profile]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await patch("/api/user-profile", data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error(
        `Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get display photo (custom > Google OAuth)
  const displayPhoto =
    profile?.profilePhotoUrl ?? (authUser?.user_metadata?.["avatar_url"] as string | undefined);
  const googleName = authUser?.user_metadata?.["full_name"] as string | undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Practice Profile</h1>
        <p className="text-muted-foreground mt-2">
          Customize how you appear in client communications and external materials
        </p>
      </div>

      {/* Privacy Notice */}
      <Alert className="bg-gradient-to-br from-green-100 via-emerald-50 to-green-100 border-l-4 border-green-400">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Your data is secure.</strong> All profile information is encrypted at rest using
          AES-256-GCM and protected by Row Level Security policies. You have full control over what
          information you share.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Photo Card */}
        <Card className="bg-gradient-to-br from-violet-100 via-purple-50 to-violet-100 border-l-4 border-violet-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile Photo</CardTitle>
            </div>
            <CardDescription>
              Your current photo from Google. Custom photo upload coming soon!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {displayPhoto ? (
                <Image
                  src={displayPhoto}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="rounded-full object-cover border-2 border-violet-300"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-violet-300 flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {profile?.profilePhotoUrl
                    ? "Using custom photo"
                    : googleName
                      ? `Using photo from your Google account (${googleName})`
                      : "No photo available"}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Custom Photo (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information Card */}
        <Card className="bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 border-l-4 border-sky-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Practice Information</CardTitle>
            </div>
            <CardDescription>
              How you want to be addressed in client-facing materials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="preferredName">Preferred Name</Label>
              <Input
                id="preferredName"
                placeholder='e.g., "Dr. Jane Smith" or "Jane Smith, RMT"'
                value={formData.preferredName}
                onChange={(e) => handleInputChange("preferredName", e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How you want to be addressed in emails, forms, and other communications
              </p>
            </div>

            <div>
              <Label htmlFor="organizationName">
                <Building2 className="h-4 w-4 inline mr-1" />
                Organization or Practice Name
              </Label>
              <Input
                id="organizationName"
                placeholder='e.g., "Wellness Studio NYC" or "Smith Holistic Health"'
                value={formData.organizationName}
                onChange={(e) => handleInputChange("organizationName", e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your practice or business name for branding purposes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card className="bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100 border-l-4 border-amber-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <CardTitle>Contact Details</CardTitle>
            </div>
            <CardDescription>
              Optional contact information for client communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Business Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                maxLength={30}
              />
            </div>

            <div>
              <Label htmlFor="website">
                <Globe className="h-4 w-4 inline mr-1" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourpractice.com"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Bio Card */}
        <Card className="bg-gradient-to-br from-rose-100 via-pink-50 to-rose-100 border-l-4 border-rose-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Professional Bio</CardTitle>
            </div>
            <CardDescription>
              A brief description of your practice and expertise (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="bio"
              placeholder="Tell clients about your practice, certifications, and areas of expertise..."
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              maxLength={500}
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.bio.length} / 500 characters
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {profile && (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Last updated: {new Date(profile.updatedAt).toLocaleString()}</span>
              </>
            )}
          </div>
          <Button type="submit" disabled={updateMutation.isPending} size="lg">
            {updateMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}