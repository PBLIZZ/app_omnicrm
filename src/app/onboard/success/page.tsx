import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Heart, Calendar, MessageCircle, Phone, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Welcome to Your Wellness Journey!",
  description: "Your profile has been completed successfully",
};

interface PractitionerContact {
  name?: string;
  email?: string;
  phone?: string;
  preferredMethod?: "email" | "phone" | "message";
}

interface OnboardingSuccessPageProps {
  practitionerContact?: PractitionerContact;
}

export default function OnboardingSuccessPage({
  practitionerContact,
}: OnboardingSuccessPageProps = {}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Wellness Journey!
          </h1>
          <p className="text-xl text-gray-600">Your profile has been completed successfully</p>
        </div>

        {/* Success Message */}
        <Card className="mb-8 border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-2">Profile Complete!</h3>
                <p className="text-green-800">
                  Thank you for taking the time to complete your wellness profile. Your practitioner
                  now has all the information they need to provide you with personalized care and
                  support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
            <CardDescription>Here's what you can expect in the coming days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  1. Your practitioner will review your information
                </h4>
                <p className="text-gray-600 text-sm">
                  They'll carefully review your health context, goals, and preferences to create a
                  personalized wellness plan just for you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">2. Schedule your first session</h4>
                <p className="text-gray-600 text-sm">
                  You'll receive a call or message to schedule your initial consultation or first
                  session at a time that works for you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">3. Begin your wellness journey</h4>
                <p className="text-gray-600 text-sm">
                  Start working towards your wellness goals with personalized guidance and support
                  from your dedicated practitioner.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Have Questions?</CardTitle>
          </CardHeader>
          <CardContent>
            {practitionerContact &&
            (practitionerContact.name || practitionerContact.email || practitionerContact.phone) ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  If you have any questions or need to update your information, don't hesitate to
                  reach out to your wellness practitioner directly.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">
                    Contact {practitionerContact.name || "Your Practitioner"}
                  </h4>

                  <div className="space-y-2">
                    {practitionerContact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <a
                          href={`mailto:${practitionerContact.email}`}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {practitionerContact.email}
                        </a>
                      </div>
                    )}

                    {practitionerContact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a
                          href={`tel:${practitionerContact.phone}`}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {practitionerContact.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {practitionerContact.preferredMethod && (
                    <p className="text-xs text-gray-500">
                      Preferred contact method: {practitionerContact.preferredMethod}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  If you have any questions or need to update your information, don't hesitate to
                  reach out to your wellness practitioner directly.
                </p>
                <p className="text-sm text-gray-500">
                  You can also update your profile information at any time during your sessions.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="text-center space-y-4">
          <p className="text-gray-600">We're excited to be part of your wellness journey!</p>

          <div className="text-sm text-gray-500">
            <p>This page will remain accessible if you need to reference it later.</p>
            <p className="mt-2">Bookmark this page or take a screenshot for your records.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
