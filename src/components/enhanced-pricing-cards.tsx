// Enhanced component based on improved generation prompt
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

export function EnhancedPricingCards() {
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto p-8">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={`group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${
            plan.popular
              ? "bg-gradient-to-br from-blue-50 to-purple-50 ring-2 ring-blue-500/20"
              : "bg-gradient-to-br from-white to-slate-50"
          }`}
        >
          {/* Animated background overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {plan.popular && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-4 py-2 rounded-full shadow-lg border-0">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Most Popular
              </Badge>
            </div>
          )}

          <CardHeader className="relative z-10 pb-4 pt-8">
            <CardTitle
              className={`text-2xl font-bold mb-2 ${
                plan.popular
                  ? "bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
              }`}
            >
              {plan.name}
            </CardTitle>
            <div className="flex items-baseline">
              <span className="text-5xl font-bold tracking-tight text-slate-900">{plan.price}</span>
              <span className="text-lg font-medium text-slate-500 ml-1">{plan.period}</span>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 pt-0">
            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center group/item">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mr-3 transition-all duration-200 group-hover/item:scale-110 ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : "bg-gradient-to-r from-emerald-500 to-green-500"
                    }`}
                  >
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                  <span className="text-slate-700 font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`w-full relative overflow-hidden font-semibold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-offset-2 group/button ${
                plan.popular
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500/20"
                  : "bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white focus:ring-slate-500/20"
              }`}
            >
              <span className="relative z-10 text-lg">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform skew-x-12 -translate-x-full group-hover/button:translate-x-full transition-transform duration-700" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
