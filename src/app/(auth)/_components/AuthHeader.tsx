import Image from "next/image";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui";

interface AuthHeaderProps {
  title: string;
  description: string;
}

export function AuthHeader({ title, description }: AuthHeaderProps): JSX.Element {
  return (
    <CardHeader className="space-y-4 pt-6 pb-4 px-4 sm:px-6">
      <div className="flex items-center space-x-3 self-start">
        <Image
          src="/logo.png"
          alt="OmniCRM Logo"
          width={40}
          height={40}
          className="h-8 w-8 sm:h-10 sm:w-10"
        />
        <div>
          <p className="text-xl font-semibold text-teal-700">OmniCRM</p>
          <p className="text-xs text-gray-500">by Omnipotency AI</p>
        </div>
      </div>
      <div className="text-center">
        <CardTitle className="text-xl sm:text-2xl font-bold text-teal-800">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-gray-600">
          {description}
        </CardDescription>
      </div>
    </CardHeader>
  );
}
