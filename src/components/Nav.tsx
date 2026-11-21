"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Dumbbell, Home, Piano, Swords, User } from "lucide-react";
import { useProgress } from "@/store/progress";
import { Logo } from "./ui";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/play", label: "Play", icon: Piano },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/challenges", label: "Challenges", icon: Swords },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/profile", label: "Profile", icon: User },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));
export const isGameRoute = (path: string) => path.startsWith("/learn/play") || path.startsWith("/challenges/play");

export function Nav() {
  const path = usePathname() ?? "/";
  const progress = useProgress((s) => s.progress);
  if (isGameRoute(path)) return null;
  return (
    <>
      <header className="sticky top-0 z-40 glass border-x-0 border-t-0">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="KeyFlow home">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {LINKS.slice(1).map((l) => {
              const active = isActive(path, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-surface-3 ring-1 ring-line-strong"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="hidden sm:inline text-muted">{progress.skillLevel}</span>
            <span className="rounded-full bg-surface-3 px-2.5 py-1 font-semibold ring-1 ring-line tabular-nums">
              <span className="text-gradient">{progress.xp.toLocaleString()} XP</span>
            </span>
          </div>
        </div>
      </header>
      {/* Mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-6">
          {LINKS.map((l) => {
            const active = isActive(path, l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-accent-2" : "text-muted"}`}
              >
                <Icon size={19} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
