"use client";
import {
  Music, Hand, BookOpen, GraduationCap, Gem, Flame, Zap, Star, Trophy, CalendarCheck, CalendarDays, Dumbbell, Shapes,
  Timer, Mic, Cable, FileMusic, Eye, TrendingUp, Layers, Ear, Drum, HelpCircle, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Music, Hand, BookOpen, GraduationCap, Gem, Flame, Zap, Star, Trophy, CalendarCheck, CalendarDays, Dumbbell, Shapes,
  Timer, Mic, Cable, FileMusic, Eye, TrendingUp, Layers, Ear, Drum,
};

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const C = MAP[name] ?? HelpCircle;
  return <C size={size} className={className} />;
}
