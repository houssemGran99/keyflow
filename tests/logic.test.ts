// Run with: npm test  (Node >= 22.6 strips TypeScript types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { accuracyOf, comboMultiplier, currentStreak, dayKey, gradeFor, judge, CHALLENGE_LEVELS, skillFromXp } from "../src/lib/scoring.ts";
import { detectChord, fitRange, keyLayout, parseNote, scaleNotes, noteName } from "../src/lib/music.ts";
import { parseMidi, writeMidi } from "../src/lib/midi-file.ts";

test("timing judgement windows", () => {
  const w = CHALLENGE_LEVELS.normal.windows;
  assert.equal(judge(0.01, w), "perfect");
  assert.equal(judge(-0.05, w), "perfect");
  assert.equal(judge(0.08, w), "great");
  assert.equal(judge(-0.15, w), "good");
  assert.equal(judge(0.3, w), "miss");
});

test("combo multiplier tiers", () => {
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(10), 2);
  assert.equal(comboMultiplier(25), 3);
  assert.equal(comboMultiplier(80), 4);
});

test("accuracy and grades", () => {
  assert.equal(accuracyOf({ perfect: 10, great: 0, good: 0, miss: 0 }), 100);
  assert.equal(accuracyOf({ perfect: 0, great: 0, good: 0, miss: 0 }), 0);
  assert.equal(accuracyOf({ perfect: 1, great: 1, good: 1, miss: 1 }), 56.25);
  assert.ok(accuracyOf({ perfect: 10, great: 0, good: 0, miss: 0 }, 4) < 100);
  assert.equal(gradeFor(96), "S");
  assert.equal(gradeFor(90), "A");
  assert.equal(gradeFor(70), "B");
  assert.equal(gradeFor(60), "C");
  assert.equal(gradeFor(10), "D");
});

test("skill levels and streaks", () => {
  assert.equal(skillFromXp(0).level, "Novice");
  assert.equal(skillFromXp(1200).level, "Performer");
  assert.equal(skillFromXp(99999).next, null);
  const today = new Date(2026, 10, 21);
  const d = (offset: number) => dayKey(new Date(2026, 10, 21 - offset));
  assert.equal(currentStreak([d(0), d(1), d(2)], today), 3);
  assert.equal(currentStreak([d(1), d(2)], today), 2); // streak still alive until end of today
  assert.equal(currentStreak([d(3)], today), 0);
});

test("note parsing and naming", () => {
  assert.equal(parseNote("C4"), 60);
  assert.equal(parseNote("A4"), 69);
  assert.equal(parseNote("F#5"), 78);
  assert.equal(parseNote("Bb3"), 58);
  assert.equal(noteName(61), "C#4");
  assert.throws(() => parseNote("H2"));
});

test("chord detection", () => {
  assert.equal(detectChord([60, 64, 67]), "C");
  assert.equal(detectChord([57, 60, 64]), "Am");
  assert.equal(detectChord([64, 67, 72]), "C/E");
  assert.equal(detectChord([67, 71, 74, 77]), "G7");
  assert.equal(detectChord([60]), null);
});

test("keyboard layout geometry", () => {
  const rects = keyLayout(48, 84);
  const whites = rects.filter((r) => !r.black);
  assert.equal(whites.length, 22);
  const last = whites[whites.length - 1];
  assert.ok(Math.abs(last.x + last.w - 1) < 1e-9);
  const [lo, hi] = fitRange(62, 79, 3);
  assert.equal(lo % 12, 0);
  assert.ok(hi - lo >= 36 && lo <= 62 && hi >= 79);
});

test("scales", () => {
  assert.deepEqual(scaleNotes(60, [2, 2, 1, 2, 2, 2, 1]), [60, 62, 64, 65, 67, 69, 71, 72]);
  assert.equal(scaleNotes(60, [2, 2, 1, 2, 2, 2, 1], true).length, 15);
});

test("MIDI write -> parse round trip", () => {
  const notes = [
    { midi: 60, startTime: 0, duration: 0.5, velocity: 0.8, track: 0 },
    { midi: 64, startTime: 0.5, duration: 0.25, velocity: 0.6, track: 0 },
    { midi: 48, startTime: 0, duration: 1, velocity: 0.5, track: 1 },
  ];
  const bytes = writeMidi(notes, 100);
  const parsed = parseMidi(bytes);
  assert.equal(parsed.bpm, 100);
  assert.equal(parsed.notes.length, 3);
  const c = parsed.notes.find((n) => n.midi === 60)!;
  assert.ok(Math.abs(c.duration - 0.5) < 0.01);
  const e = parsed.notes.find((n) => n.midi === 64)!;
  assert.ok(Math.abs(e.startTime - 0.5) < 0.01);
  assert.throws(() => parseMidi(new Uint8Array([1, 2, 3, 4])));
});
