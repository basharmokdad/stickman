"""Add sound to a rendered story and master it (-14 LUFS, -1 dBTP) -> out_dir/final.mp4.

usage:
  python mix.py <out_dir>                     free: a quiet synthesized pad + soft synthesized hits (numpy only)
  python mix.py <out_dir> --audio <folder>    use your own files instead: music.(mp3|wav) for the bed and
                                              <type>.(mp3|wav) for any sound type below (missing ones are synthesized)
Sound events come from the story's `sounds` list (written to meta.json by render.py):
  {at: seconds, type: thud|tap|clack|pop|chime|splash|wave|thunder|rain|crowd|whoosh, gain: dB, dur: s, pitch: x}
The story's `music: {mood: hopeful|tense|sad|calm, gain: dB}` sets the pad."""
import json
import os
import pathlib
import subprocess
import sys
import wave

import numpy as np

out = pathlib.Path(sys.argv[1]).resolve()
AUD = pathlib.Path(sys.argv[sys.argv.index("--audio") + 1]) if "--audio" in sys.argv else None
meta = json.loads((out / "meta.json").read_text())
DUR, SR = float(meta["duration"]), 44100
N = int(DUR * SR)
rng = np.random.default_rng(7)
t_ = lambda d: np.arange(int(d * SR)) / SR


def filt(x, lo=None, hi=None):
    """smooth FFT band filter (no scipy needed)"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a, d):
    e = np.exp(-np.arange(n) / SR / d)
    k = max(1, int(a * SR))
    e[:k] *= np.linspace(0, 1, k)
    return e


def noise(d):
    return rng.standard_normal(int(d * SR))


# ------------------------------------------------------------------ synthesized sounds (soft, tactile, no stock whooshes)
def s_thud(p=1, **_):
    t = t_(0.5); f = 62 * p * (1 + 0.6 * np.exp(-t * 30))
    return 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.12) + 0.25 * filt(noise(0.5), hi=900) * env(len(t), 0.001, 0.03)
def s_tap(p=1, **_):
    t = t_(0.18); return 0.5 * filt(noise(0.18), lo=300, hi=2500) * env(len(t), 0.001, 0.025) + 0.4 * np.sin(2 * np.pi * 190 * p * t) * env(len(t), 0.001, 0.05)
def s_clack(p=1, **_):
    t = t_(0.25); return 0.55 * filt(noise(0.25), lo=1200, hi=5000) * env(len(t), 0.0005, 0.02) + 0.5 * np.sin(2 * np.pi * 310 * p * t) * env(len(t), 0.001, 0.07)
def s_pop(p=1, **_):
    t = t_(0.25); return 0.5 * np.sin(2 * np.pi * 820 * p * t * (1 - 0.3 * t)) * env(len(t), 0.001, 0.05)
def s_chime(p=1, **_):
    t = t_(2.0); return 0.28 * (np.sin(2 * np.pi * 1320 * p * t) + 0.6 * np.sin(2 * np.pi * 1980 * p * t) + 0.3 * np.sin(2 * np.pi * 2640 * p * t)) * env(len(t), 0.003, 0.5)
def s_splash(p=1, **_):
    t = t_(1.0); return 0.7 * filt(noise(1.0), lo=400, hi=4500 * p) * env(len(t), 0.004, 0.2)
def s_wave(p=1, dur=2.5, **_):
    n = noise(dur); t = t_(dur); e = np.minimum(1, t / (dur * 0.55)) * np.minimum(1, (dur - t) / (dur * 0.45))
    return 0.6 * filt(n, lo=80, hi=1100 * p) * e ** 1.5
def s_thunder(p=1, dur=3.0, **_):
    t = t_(dur); crack = filt(noise(dur), lo=600, hi=5000) * env(len(t), 0.001, 0.06)
    rumble = filt(noise(dur), hi=260 * p) * np.minimum(1, t / 0.15) * np.exp(-t / (dur * 0.4)) * (1 + 0.4 * np.sin(2 * np.pi * 3.1 * t))
    return 0.5 * crack + 2.2 * rumble
def s_rain(p=1, dur=3.0, **_):
    t = t_(dur); e = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    return 0.22 * filt(noise(dur), lo=1800, hi=9000) * e
def s_crowd(p=1, dur=2.0, **_):
    t = t_(dur); e = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.4)
    am = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 5.3 * t) * np.sin(2 * np.pi * 3.7 * t + 1))
    return 0.35 * filt(noise(dur), lo=250, hi=1600) * am * e
def s_whoosh(p=1, dur=0.6, **_):
    t = t_(dur); e = np.sin(np.pi * t / dur) ** 2
    return 0.25 * filt(noise(dur), lo=300, hi=1400 * p) * e


SYN = {k[2:]: v for k, v in globals().items() if k.startswith("s_")}


def load(path):
    """decode any file to mono float via ffmpeg"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def user_file(name):
    if not AUD:
        return None
    for ext in (".wav", ".mp3", ".ogg", ".flac"):
        if (AUD / (name + ext)).exists():
            return AUD / (name + ext)
    return None


# ------------------------------------------------------------------ the bed: a slow pad + a few soft piano-like notes
CHORDS = {"hopeful": [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]],
          "calm": [[48, 55, 62, 67], [43, 50, 57, 62], [45, 52, 59, 64], [41, 48, 55, 60]],
          "sad": [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 64, 67], [43, 50, 59, 62]],
          "tense": [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]}
mid = lambda m: 440 * 2 ** ((m - 69) / 12)


def pad(mood):
    ch, seg = CHORDS.get(mood, CHORDS["hopeful"]), 3.5
    y, t = np.zeros(N), np.arange(N) / SR
    for i in range(int(DUR / seg) + 2):
        a, b = i * seg - 0.8, (i + 1) * seg + 0.8
        w = np.clip(np.minimum((t - a) / 0.8, (b - t) / 0.8), 0, 1)
        for m in ch[i % len(ch)]:
            f = mid(m)
            y += w * (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t + 1) + 0.12 * np.sin(2 * np.pi * 2 * f * t))
    y = filt(y, hi=1500) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.17 * t))
    notes = np.zeros(N)
    r = np.random.default_rng(3)
    for k in np.arange(0.6, DUR - 0.5, 1.15):
        m = ch[int(k / seg) % len(ch)][r.integers(1, 4)] + 12
        n = int(1.6 * SR); s = int(k * SR); tt = np.arange(n) / SR
        tone = (np.sin(2 * np.pi * mid(m) * tt) + 0.3 * np.sin(4 * np.pi * mid(m) * tt)) * env(n, 0.004, 0.45)
        notes[s:s + n] += tone[:max(0, min(n, N - s))]
    out_ = y / (np.abs(y).max() + 1e-9) * 0.35 + notes / (np.abs(notes).max() + 1e-9) * 0.22
    fade = np.minimum(1, np.minimum(t / 0.6, (DUR - t) / 0.8))
    return out_ * fade


mix = np.zeros(N)
mu = meta.get("music") or {}
mf = user_file("music")
bed = load(mf)[:N] if mf else pad(mu.get("mood", "hopeful"))
bed = np.pad(bed, (0, N - len(bed)))
mix += bed * 10 ** (mu.get("gain", -6) / 20)
for e in meta.get("sounds", []):
    f = user_file(e["type"])
    s = load(f) if f else SYN.get(e["type"], s_tap)(p=e.get("pitch", 1), dur=e.get("dur", 2.0))
    s = s / (np.abs(s).max() + 1e-9) * 0.8 * 10 ** (e.get("gain", -6) / 20)
    k = int(e["at"] * SR)
    if k >= N:
        continue
    mix[k:k + len(s)] += s[:N - k]

wav = out / "mix.wav"
with wave.open(str(wav), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix / max(1.0, np.abs(mix).max()), -1, 1) * 32000).astype(np.int16).tobytes())


def lufs(af):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", af + ",ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(r[r.rindex(" I:"):].split()[1]), float(r[r.rindex("Peak:"):].split()[1])


g = -14.0 - lufs("anull")[0]
for _ in range(8):
    chain = f"volume={g:.2f}dB,alimiter=limit=0.84:level=0:attack=3:release=80"
    i, tp = lufs(chain)
    if abs(i + 14) < 0.3:
        break
    g += -14 - i
r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(wav), "-af", chain + ",aformat=channel_layouts=stereo",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", str(out / "final.mp4")], capture_output=True, text=True)
if r.returncode:
    raise SystemExit(r.stderr[-1200:])
print(f"master {i:.1f} LUFS, peak {tp:.1f} dBTP -> {out / 'final.mp4'}")
