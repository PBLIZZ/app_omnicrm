// Refined component based on wellness CRM prompt
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export function WellnessPricingCards() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for solo practitioners starting their journey",
      features: ["Up to 50 clients", "Basic scheduling", "Email support", "Client portal"],
      popular: false,
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      description: "Ideal for growing practices with advanced needs",
      features: [
        "Unlimited clients",
        "Advanced scheduling",
        "AI insights",
        "Priority support",
        "Custom forms",
        "Analytics dashboard",
      ],
      popular: true,
      cta: "Start Free Trial",
    },
    {
      name: "Practice",
      price: "$149",
      period: "/month",
      description: "Complete solution for established wellness practices",
      features: [
        "Everything in Professional",
        "Multi-location support",
        "Team collaboration",
        "Advanced reporting",
        "API access",
        "Dedicated support",
      ],
      popular: false,
      cta: "Contact Sales",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto p-6">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={`group relative bg-white dark:bg-slate-800 border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 ${
            plan.popular
              ? "border-teal-200 dark:border-teal-700 ring-1 ring-teal-100 dark:ring-teal-800"
              : "border-slate-200 dark:border-slate-700"
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-teal-600 hover:bg-teal-600 text-white font-medium px-3 py-1 rounded-full shadow-sm">
                Most Popular
              </Badge>
            </div>
          )}

          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {plan.name}
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{plan.description}</p>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {plan.price}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-1">{plan.period}</span>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mt-0.5 mr-3">
                    <Check className="w-3 h-3 text-teal-600 dark:text-teal-400 stroke-[2.5]" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`w-full font-medium py-2.5 rounded-md shadow-sm hover:shadow-md transition-all duration-200 ${
                plan.popular
                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                  : plan.cta === "Contact Sales"
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {plan.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
