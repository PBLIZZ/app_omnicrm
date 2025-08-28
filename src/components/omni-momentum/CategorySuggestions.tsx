"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Heart, Users, FileText, TrendingUp, Briefcase } from "lucide-react";

interface Category {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  confidence?: number;
}

interface CategorySuggestionsProps {
  suggestions: Category[];
  selectedCategory?: string;
  onCategorySelect: (categoryId: string) => void;
  showConfidence?: boolean;
  variant?: "chips" | "cards" | "list";
  maxDisplay?: number;
}

const categoryIcons = {
  "personal-wellness": <Heart className="h-4 w-4" />,
  "client-care": <Users className="h-4 w-4" />,
  "administrative": <FileText className="h-4 w-4" />,
  "business-development": <TrendingUp className="h-4 w-4" />,
  "content-creation": <Briefcase className="h-4 w-4" />,
};

const categoryColors = {
  "personal-wellness": "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  "client-care": "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  "administrative": "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
  "business-development": "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  "content-creation": "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
};

function CategoryChip({ 
  category, 
  isSelected, 
  onClick, 
  showConfidence 
}: { 
  category: Category; 
  isSelected: boolean; 
  onClick: () => void;
  showConfidence: boolean;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={`
        h-auto p-3 flex items-center gap-2 text-left
        ${categoryColors[category.id as keyof typeof categoryColors] || categoryColors["personal-wellness"]}
        ${isSelected ? "ring-2 ring-primary" : ""}
      `}
    >
      <div className="flex items-center gap-2">
        {categoryIcons[category.id as keyof typeof categoryIcons] || categoryIcons["personal-wellness"]}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{category.label}</div>
          {showConfidence && category.confidence && (
            <Badge variant="secondary" className="text-xs mt-1">
              {Math.round(category.confidence * 100)}% confident
            </Badge>
          )}
        </div>
      </div>
    </Button>
  );
}

function CategoryCard({ 
  category, 
  isSelected, 
  onClick, 
  showConfidence 
}: { 
  category: Category; 
  isSelected: boolean; 
  onClick: () => void;
  showConfidence: boolean;
}) {
  return (
    <Card 
      className={`
        cursor-pointer transition-all hover:shadow-md
        ${isSelected ? "ring-2 ring-primary shadow-md" : ""}
        ${categoryColors[category.id as keyof typeof categoryColors] || "bg-white"}
      `}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {categoryIcons[category.id as keyof typeof categoryIcons] || categoryIcons["personal-wellness"]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">{category.label}</h4>
            <p className="text-xs text-muted-foreground mb-2">{category.description}</p>
            {showConfidence && category.confidence && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-2 w-2 mr-1" />
                {Math.round(category.confidence * 100)}% match
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategorySuggestions({
  suggestions,
  selectedCategory,
  onCategorySelect,
  showConfidence = true,
  variant = "chips",
  maxDisplay = 5,
}: CategorySuggestionsProps) {
  if (suggestions.length === 0) return null;

  const displayedSuggestions = suggestions.slice(0, maxDisplay);

  if (variant === "chips") {
    return (
      <div className="flex flex-wrap gap-2">
        {displayedSuggestions.map((category) => (
          <CategoryChip
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
            onClick={() => onCategorySelect(category.id)}
            showConfidence={showConfidence}
          />
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayedSuggestions.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
            onClick={() => onCategorySelect(category.id)}
            showConfidence={showConfidence}
          />
        ))}
      </div>
    );
  }

  // List variant
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Suggested Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedSuggestions.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "ghost"}
            onClick={() => onCategorySelect(category.id)}
            className="w-full justify-start h-auto p-3"
          >
            <div className="flex items-center gap-3 w-full">
              {categoryIcons[category.id as keyof typeof categoryIcons] || categoryIcons["personal-wellness"]}
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{category.label}</div>
                <div className="text-xs text-muted-foreground">{category.description}</div>
              </div>
              {showConfidence && category.confidence && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(category.confidence * 100)}%
                </Badge>
              )}
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}