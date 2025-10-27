"use client";

import { Card, CardContent } from "@/components/ui";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

const WELLNESS_MANTRAS = [
  "Do what you can, with what you have, where you are. — Theodore Roosevelt",
  "Simplicity is the ultimate sophistication. — Leonardo da Vinci",
  "Where your attention goes, your energy flows. — James Redfield",
  "The key is not to prioritize what's on your schedule, but to schedule your priorities. — Stephen Covey",
  "Small deeds done are better than great deeds planned. — Peter Marshall",
  "You will never find time for anything. If you want time, you must make it. — Charles Buxton",
  "The shorter way to do many things is to do only one thing at a time. — Mozart",
  "Focus is the art of knowing what to ignore. — James Clear",
  "The successful warrior is the average man, with laser-like focus. — Bruce Lee",
  "Discipline equals freedom. — Jocko Willink",
  "He who conquers himself is the mightiest warrior. — Confucius",
  "When you are working on something exciting, it wakes you up in the morning. — Steve Jobs",
  "You can do anything, but not everything. — David Allen",
  "Energy and persistence conquer all things. — Benjamin Franklin",
  "Without hurry, without rest. — Johann Wolfgang von Goethe",
  "The only limit to our realization of tomorrow is our doubts of today. — Franklin D. Roosevelt",
  "A calm mind is a productive mind. — Unknown (Zen maxim)",
  "The greatest thing in this world is not so much where we stand as in what direction we are moving. — Oliver Wendell Holmes",
  "If you get tired, learn to rest, not to quit. — Banksy",
  "Flow is not about effort, it's about alignment. — Mihaly Csikszentmihalyi",
  "To be everywhere is to be nowhere. — Seneca",
  "When you stop chasing the wrong things, you give the right things a chance to catch you. — Lolly Daskal",
  "Don't mistake movement for progress. — John Wooden",
  "Do less, but better. — Greg McKeown",
  "A year from now you may wish you had started today. — Karen Lamb",
  "A goal properly set is halfway reached. — Zig Ziglar",
  "Vision without action is a daydream. Action without vision is a nightmare. — Japanese proverb",
  "The future depends on what you do today. — Mahatma Gandhi",
  "If you want to live a happy life, tie it to a goal, not to people or things. — Albert Einstein",
  "Dream big. Start small. Act now. — Robin Sharma",
  "When the why is clear, the how is easy. — Nietzsche",
  "Setting goals is the first step in turning the invisible into the visible. — Tony Robbins",
  "You do not rise to the level of your goals, you fall to the level of your systems. — James Clear",
  "A goal is a dream with a deadline. — Napoleon Hill",
  "The tragedy of life doesn't lie in not reaching your goal. It lies in having no goal to reach. — Benjamin Mays",
  "Don't aim at success. The more you aim at it, the more you miss it. — Viktor Frankl",
  "When you stop having goals, you stop growing. — Unknown",
  "If you want to go fast, go alone. If you want to go far, go together. — African proverb",
  "To accomplish great things, we must not only act, but also dream. — Anatole France",
  "Action expresses priorities. — Mahatma Gandhi",
  "Success is the sum of small efforts repeated day in and day out. — Robert Collier",
  "Begin with the end in mind. — Stephen Covey",
  "He who has a why to live can bear almost any how. — Friedrich Nietzsche",
  "A wise man will make more opportunities than he finds. — Francis Bacon",
  "Don't count the days; make the days count. — Muhammad Ali",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Goals are dreams with work clothes on. — Unknown",
  "If you can't measure it, you can't improve it. — Peter Drucker",
  "What you get by achieving your goals is not as important as what you become by achieving them. — Zig Ziglar",
  "The best way to predict the future is to create it. — Peter Drucker",
  "We are what we repeatedly do. Excellence, then, is not an act but a habit. — Aristotle",
  "Motivation is what gets you started. Habit is what keeps you going. — Jim Rohn",
  "First we make our habits, then our habits make us. — John Dryden",
  "Repetition is the mother of skill. — Tony Robbins",
  "An ant on the move does more than a dozing ox. — Lao Tzu",
  "Chains of habit are too light to be felt until they are too heavy to be broken. — Warren Buffett",
  "Discipline is choosing between what you want now and what you want most. — Abraham Lincoln (attributed)",
  "Your habits will determine your future. — Jack Canfield",
  "Don't break the chain. — Jerry Seinfeld",
  "A journey of a thousand miles begins with a single step. — Chinese proverb",
  "You'll never change your life until you change something you do daily. — John C. Maxwell",
  "The secret of your success is found in your daily routine. — John C. Maxwell",
  "You do not find the willpower; you build it. — Unknown",
  "Lose an hour in the morning, and you will spend all day looking for it. — Richard Whately",
  "Habits are safer than rules; you don't have to watch them. — Frank Hall Crane",
  "What you practice grows stronger. — Shauna Shapiro",
  "The man who moves a mountain begins by carrying away small stones. — Confucius",
  "Sow a thought, reap an action; sow an action, reap a habit; sow a habit, reap a character. — Chinese proverb",
  "The pain of discipline is far less than the pain of regret. — Sarah Bombell",
  "Habit is the intersection of knowledge, skill, and desire. — Stephen Covey",
  "To improve is to change; to be perfect is to change often. — Winston Churchill",
  "The more you sweat in peace, the less you bleed in war. — Chinese proverb",
  "What you do every day matters more than what you do once in a while. — Gretchen Rubin",
  "Consistency beats intensity. — Naval Ravikant",
  "Make it easy, make it obvious, make it satisfying. — James Clear",
  "You become what you think about. — Earl Nightingale",
  "Your energy introduces you before you even speak. — Unknown (mindfulness saying)",
  "The obstacle is the way. — Marcus Aurelius",
  "Patience is bitter, but its fruit is sweet. — Aristotle",
  "Things do not change; we change. — Henry David Thoreau",
  "No mud, no lotus. — Thích Nhất Hạnh",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "The best time to plant a tree was twenty years ago. The second best time is now. — Chinese proverb",
  "Success is liking yourself, liking what you do, and liking how you do it. — Maya Angelou",
  "In the middle of every difficulty lies opportunity. — Albert Einstein",
  "The mind is everything. What you think, you become. — Buddha",
  "Between stimulus and response, there is a space. — Viktor Frankl",
  "The man who moves with intention moves mountains. — Unknown",
  "Your work is to discover your work and then with all your heart give yourself to it. — Buddha",
  "Peace comes from within. Do not seek it without. — Buddha",
  "The quieter you become, the more you can hear. — Ram Dass",
  "Success is nothing more than a few simple disciplines practiced every day. — Jim Rohn",
  "To understand the immeasurable, the mind must be extraordinarily quiet. — Jiddu Krishnamurti",
  "A smooth sea never made a skilled sailor. — Franklin D. Roosevelt",
  "Everything you want is on the other side of consistency. — T. Harv Eker",
  "Stillness is the key. — Ryan Holiday",
  "You can't control the wind, but you can adjust your sails. — Greek proverb",
  "What we think, we become. What we feel, we attract. What we imagine, we create. — Buddha (attributed)",
  "The more man meditates upon good thoughts, the better will be his world and the world at large. — Confucius",
  "Be patient with yourself. Nothing in nature blooms all year. — Zen proverb",
];

/**
 * WellnessQuoteCard - Inspirational Wellness Productivity Mantra
 *
 * Displays rotating wellness-focused productivity mantras to inspire
 * practitioners throughout their day. Changes daily for variety.
 */
export function WellnessQuoteCard(): JSX.Element {
  const [mantra, setMantra] = useState(WELLNESS_MANTRAS[0]);

  useEffect(() => {
    // Select mantra based on day of year for consistency throughout the day
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const mantraIndex = dayOfYear % WELLNESS_MANTRAS.length;
    setMantra(WELLNESS_MANTRAS[mantraIndex] || WELLNESS_MANTRAS[0]);
  }, []);

  return (
    <Card className="bg-gradient-to-br from-teal-50 via-emerald-50 to-amber-50 border-teal-200 flex">
      <CardContent className="pl-6 pr-6 flex items-center justify-center text-center">
        <BookOpen className="w-6 h-6 text-violet-500 mr-3 flex-shrink-0" />
        <p className="text-sm font-medium text-gray-700 leading-relaxed italic">"{mantra}"</p>
      </CardContent>
    </Card>
  );
}
