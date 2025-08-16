// Sample component based on current generation prompt
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PricingCards() {
  const plans = [
    {
      name: "Basic",
      price: "$9",
      period: "/month",
      features: ["5 Contacts", "Basic Sync", "Email Support"],
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      features: ["Unlimited Contacts", "Advanced Sync", "AI Insights", "Priority Support"],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      features: ["Everything in Pro", "Custom Integrations", "Dedicated Support", "SLA"],
      popular: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto p-6">
      {plans.map((plan) => (
        <Card key={plan.name} className="relative">
          {plan.popular && (
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              Most Popular
            </Badge>
          )}
          <CardHeader>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <div className="text-3xl font-bold">
              {plan.price}
              <span className="text-sm font-normal">{plan.period}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
