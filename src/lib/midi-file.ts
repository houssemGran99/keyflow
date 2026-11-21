// Minimal Standard MIDI File reader/writer (format 0 and 1). Pure, unit-tested.
import type { Note } from "./types";

export interface ParsedMidi {
  notes: Note[];
  bpm: number;
  trackNames: string[];
  beatsPerBar: number;
}

class Reader {
  pos = 0;
  private d: Uint8Array;
  constructor(d: Uint8Array) {
    this.d = d;
  }
  u8() {
    return this.d[this.pos++];
  }
  u16() {
    const v = (this.d[this.pos] << 8) | this.d[this.pos + 1];
    this.pos += 2;
    return v;
  }
  u32() {
    const v = ((this.d[this.pos] << 24) >>> 0) + (this.d[this.pos + 1] << 16) + (this.d[this.pos + 2] << 8) + this.d[this.pos + 3];
    this.pos += 4;
    return v;
  }
  str(n: number) {
    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.d[this.pos + i]);
    this.pos += n;
    return s;
  }
  vlq() {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  }
  get eof() {
    return this.pos >= this.d.length;
  }
}

interface RawEvent {
  tick: number;
  track: number;
  kind: "on" | "off" | "tempo" | "timesig";
  midi?: number;
  vel?: number;
  channel?: number;
  value?: number;
}

export function parseMidi(buf: ArrayBuffer | Uint8Array): ParsedMidi {
  const data = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const r = new Reader(data);
  if (r.str(4) !== "MThd") throw new Error("Not a MIDI file (missing MThd header)");
  const hlen = r.u32();
  const format = r.u16();
  const ntracks = r.u16();
  const division = r.u16();
  r.pos = 8 + hlen;
  if (division & 0x8000) throw new Error("SMPTE-timed MIDI files are not supported");
  if (format > 1) throw new Error("Only MIDI format 0 and 1 are supported");

  const events: RawEvent[] = [];
  const trackNames: string[] = [];
  for (let t = 0; t < ntracks && !r.eof; t++) {
    const id = r.str(4);
    const len = r.u32();
    const end = r.pos + len;
    if (id !== "MTrk") {
      r.pos = end;
      continue;
    }
    let tick = 0;
    let running = 0;
    while (r.pos < end) {
      tick += r.vlq();
      let status = r.u8();
      if (status < 0x80) {
        r.pos--;
        status = running;
      } else if (status < 0xf0) running = status;
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (status === 0xff) {
        const meta = r.u8();
        const mlen = r.vlq();
        const start = r.pos;
        if (meta === 0x51 && mlen === 3) {
          const us = (data[start] << 16) | (data[start + 1] << 8) | data[start + 2];
          events.push({ tick, track: t, kind: "tempo", value: us });
        } else if (meta === 0x58 && mlen >= 2) {
          events.push({ tick, track: t, kind: "timesig", value: data[start] });
        } else if (meta === 0x03) {
          trackNames[t] = new TextDecoder().decode(data.slice(start, start + mlen));
        }
        r.pos = start + mlen;
      } else if (status === 0xf0 || status === 0xf7) {
        r.pos += r.vlq();
      } else if (type === 0x90 || type === 0x80) {
        const midi = r.u8();
        const vel = r.u8();
        events.push({ tick, track: t, kind: type === 0x90 && vel > 0 ? "on" : "off", midi, vel, channel: ch });
      } else if (type === 0xc0 || type === 0xd0) {
        r.pos += 1;
      } else {
        r.pos += 2;
      }
    }
    r.pos = end;
  }

  // Tempo map -> seconds
  const tempos = events.filter((e) => e.kind === "tempo").sort((a, b) => a.tick - b.tick);
  const tickToSec = (tick: number) => {
    let sec = 0;
    let lastTick = 0;
    let us = 500000;
    for (const tp of tempos) {
      if (tp.tick >= tick) break;
      sec += ((tp.tick - lastTick) * us) / division / 1e6;
      lastTick = tp.tick;
      us = tp.value!;
    }
    return sec + ((tick - lastTick) * us) / division / 1e6;
  };

  const noteEvents = events.filter((e) => e.kind === "on" || e.kind === "off").sort((a, b) => a.tick - b.tick || (a.kind === "off" ? -1 : 1));
  const open = new Map<string, RawEvent[]>();
  const notes: Note[] = [];
  const trackIds = new Map<string, number>();
  for (const e of noteEvents) {
    const key = `${e.track}:${e.channel}:${e.midi}`;
    if (e.kind === "on") {
      const list = open.get(key) ?? [];
      list.push(e);
      open.set(key, list);
    } else {
      const list = open.get(key);
      const on = list?.shift();
      if (!on) continue;
      const tk = `${on.track}:${on.channel}`;
      if (!trackIds.has(tk)) trackIds.set(tk, trackIds.size);
      const startTime = tickToSec(on.tick);
      notes.push({
        midi: on.midi!,
        startTime,
        duration: Math.max(0.05, tickToSec(e.tick) - startTime),
        velocity: Math.max(0.1, (on.vel ?? 90) / 127),
        track: trackIds.get(tk)!,
      });
    }
  }
  notes.sort((a, b) => a.startTime - b.startTime || a.midi - b.midi);
  const bpm = tempos.length ? Math.round(60e6 / tempos[0].value!) : 120;
  const ts = events.find((e) => e.kind === "timesig");
  return { notes, bpm, trackNames, beatsPerBar: ts?.value ?? 4 };
}

// ----------------------------------------------------------------- writer

function vlq(n: number): number[] {
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) {
    bytes.unshift((n & 0x7f) | 0x80);
    n >>= 7;
  }
  return bytes;
}

/** Write notes as a format-0 MIDI file (480 PPQ at the given tempo). */
export function writeMidi(notes: Note[], bpm = 120): Uint8Array<ArrayBuffer> {
  const ppq = 480;
  const secToTick = (s: number) => Math.round((s * bpm * ppq) / 60);
  const evs: { tick: number; bytes: number[]; order: number }[] = [];
  const us = Math.round(60e6 / bpm);
  evs.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff], order: 0 });
  for (const n of notes) {
    const ch = Math.min(15, n.track ?? 0);
    const vel = Math.max(1, Math.min(127, Math.round(n.velocity * 127)));
    evs.push({ tick: secToTick(n.startTime), bytes: [0x90 | ch, n.midi, vel], order: 2 });
    evs.push({ tick: secToTick(n.startTime + n.duration), bytes: [0x80 | ch, n.midi, 0], order: 1 });
  }
  evs.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const track: number[] = [];
  let last = 0;
  for (const e of evs) {
    track.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00);
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (ppq >> 8) & 0xff, ppq & 0xff];
  const len = track.length;
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  return new Uint8Array([...header, ...trackHeader, ...track]);
}
