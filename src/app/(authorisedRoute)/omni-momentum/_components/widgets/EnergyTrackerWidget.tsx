"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Heart, Star, Clock, Moon, Plus, Minus } from 'lucide-react';

interface DailyPulseWidgetProps {
  onSubmit: (data: {
    energy: number;
    mood: string;
    customMood?: string;
    sleep: number;
    napTime: number;
    timestamp: Date;
  }) => void;
}

export function EnergyTrackerWidget({ onSubmit }: DailyPulseWidgetProps) {
  const { toast } = useToast();
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [customMood, setCustomMood] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [napMinutes, setNapMinutes] = useState<number>(0);

  // Wellness practitioner-focused mood options  
  const moods = [
    { value: 'energized', emoji: '✨', label: 'Energized' },
    { value: 'happy', emoji: '😊', label: 'Happy' },
    { value: 'calm', emoji: '😌', label: 'Calm' },
    { value: 'low', emoji: '😔', label: 'Low' },
    { value: 'overwhelmed', emoji: '😫', label: 'Overwhelmed' },
    { value: 'other', emoji: '💭', label: 'Other' }
  ];

  const handleEnergySelect = (rating: number) => {
    setSelectedEnergy(rating);
  };

  const handleNapAdjust = (increment: boolean) => {
    if (increment && napMinutes < 60) {
      setNapMinutes(prev => prev + 10);
    } else if (!increment && napMinutes > 0) {
      setNapMinutes(prev => prev - 10);
    }
  };

  const handleSubmit = () => {
    if (selectedEnergy && selectedMood && sleepHours[0]) {
      onSubmit({
        energy: selectedEnergy,
        mood: selectedMood,
        ...(selectedMood === 'other' && customMood.trim() ? { customMood } : {}),
        sleep: sleepHours,
        napTime: napMinutes,
        timestamp: new Date()
      });
      
      // Reset form
      setSelectedEnergy(null);
      setSelectedMood(null);
      setCustomMood('');
      setSleepHours(7);
      setNapMinutes(0);

      // Show success message
      toast({
        title: "✨ Daily Pulse Recorded!",
        description: "Your wellness data will help inform your day ahead"
      });
    }
  };

  const isComplete = selectedEnergy && selectedMood && sleepHours && 
    (selectedMood !== 'other' || customMood.trim());

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600" />
          Daily Pulse
        </CardTitle>
        <CardDescription className="text-sm">
          Quick, intuitive wellness check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Energy Level (1-5 Stars) */}
        <div>
          <p className="text-sm font-medium mb-3">Energy Level</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => handleEnergySelect(rating)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star 
                  className={`h-6 w-6 ${
                    selectedEnergy && rating <= selectedEnergy
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-200'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-xs text-muted-foreground self-center">
              {selectedEnergy ? `${selectedEnergy}/5` : 'Rate your vitality'}
            </span>
          </div>
        </div>

        {/* Sleep Duration (Slider: 3-7+ Hours) */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-1">
            <Moon className="h-4 w-4" />
            Sleep Duration: {sleepHours === 7 ? '7+' : sleepHours} hours
          </p>
          <Slider
            value={[sleepHours]}
            onValueChange={(values) => setSleepHours(values[0]!)}
            max={7}
            min={3}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>3h</span>
            <span>7+h</span>
          </div>
        </div>

        {/* Nap Time (Quick Increment Buttons) */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Nap Time: {napMinutes} minutes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNapAdjust(false)}
              disabled={napMinutes === 0}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center text-sm font-medium">
              {napMinutes === 0 ? 'No nap' : `${napMinutes} min`}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNapAdjust(true)}
              disabled={napMinutes >= 60}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mood Check ("Today, I'm Feeling…") */}
        <div>
          <p className="text-sm font-medium mb-3">Today, I'm Feeling…</p>
          <div className="grid grid-cols-2 gap-2">
            {moods.map(mood => (
              <Button
                key={mood.value}
                variant={selectedMood === mood.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMood(mood.value)}
                className="h-8 text-xs justify-start"
              >
                <span className="mr-2">{mood.emoji}</span>
                {mood.label}
              </Button>
            ))}
          </div>
          
          {/* Custom Mood Input */}
          {selectedMood === 'other' && (
            <Input
              placeholder="Describe how you're feeling..."
              value={customMood}
              onChange={(e) => setCustomMood(e.target.value)}
              className="mt-2 text-sm"
            />
          )}
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit}
          disabled={!isComplete}
          className="w-full"
          size="sm"
        >
          <Heart className="h-4 w-4 mr-2" />
          Record My Pulse
        </Button>
      </CardContent>
    </Card>
  );
}