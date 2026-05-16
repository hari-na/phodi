"""Generate placeholder ambient loops using only the Python standard library.

These are NOT realistic field recordings — they're synthesised noise +
slow filter sweeps that give a "room tone is present" feeling so the
chapter player has something to fade in. Drop real CC0 MP3s into
public/sfx/ with the same filenames to upgrade.

Approach: filtered white/pink noise, sometimes with low-frequency
modulation. Output: 16-bit PCM WAV at 22 kHz mono, ~30 seconds, then
saved as .mp3 if `pydub`/ffmpeg is available, otherwise as .wav (the
browser plays both).
"""

from __future__ import annotations

import math
import random
import struct
import sys
import wave
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent
SFX_OUT = REPO_ROOT / "public" / "sfx"
SAMPLE_RATE = 22050
DURATION_SEC = 30

# Each preset is (filename, character) where character is a dict of params
# tuning the noise profile.
PRESETS = {
    # name:              (low_cut, high_cut, sweep_period_sec, base_amp, modulation, seed)
    "rain-night":         (0.10, 0.95, 0.0,  0.25, 0.0,  1),
    "ac-hum":             (0.02, 0.18, 6.0,  0.12, 0.05, 2),
    "chai-stall":         (0.05, 0.80, 0.0,  0.18, 0.15, 3),
    "quiet-room":         (0.03, 0.25, 12.0, 0.08, 0.03, 4),
    "empty-room":         (0.04, 0.30, 8.0,  0.07, 0.04, 5),
    "birds-leaves":       (0.20, 0.95, 0.0,  0.14, 0.30, 6),
    "street-day":         (0.05, 0.50, 0.0,  0.22, 0.20, 7),
    "market":             (0.10, 0.65, 0.0,  0.28, 0.30, 8),
    "pub":                (0.10, 0.60, 0.0,  0.24, 0.25, 9),
    "canteen":            (0.10, 0.55, 0.0,  0.22, 0.20, 10),
    "kitchen":            (0.10, 0.70, 0.0,  0.16, 0.15, 11),
    "bookstore":          (0.02, 0.25, 16.0, 0.07, 0.03, 12),
    "park-morning":       (0.20, 0.95, 0.0,  0.12, 0.25, 13),
    "karaga-drums":       (0.05, 0.45, 0.0,  0.32, 0.45, 14),
    "family-home":        (0.05, 0.40, 9.0,  0.13, 0.12, 15),
    "temple":             (0.05, 0.70, 0.0,  0.18, 0.35, 16),
    "balcony-night":      (0.03, 0.40, 10.0, 0.10, 0.10, 17),
}


def synthesise(low_cut, high_cut, sweep_period, base_amp, modulation, seed):
    """Return a list of int16 samples shaped per the preset."""
    rng = random.Random(seed)
    n = SAMPLE_RATE * DURATION_SEC

    # Generate white noise
    noise = [rng.uniform(-1.0, 1.0) for _ in range(n)]

    # Simple band-pass via two single-pole IIRs (low-pass then high-pass).
    # alpha controls cutoff (smaller = lower cutoff).
    low_alpha = low_cut
    high_alpha = high_cut
    lp = 0.0
    out = [0.0] * n
    for i, x in enumerate(noise):
        lp = lp + low_alpha * (x - lp)
        out[i] = lp
    # High-pass: subtract a slow-moving average
    hp_state = 0.0
    for i in range(n):
        hp_state = hp_state + (1 - high_alpha) * (out[i] - hp_state)
        out[i] = out[i] - hp_state * 0.5

    # Low-frequency amplitude modulation (sweep)
    for i in range(n):
        env = 1.0
        if sweep_period > 0:
            t = i / SAMPLE_RATE
            env = 0.9 + 0.1 * math.sin(2 * math.pi * t / sweep_period)
        # Random spikes for the modulation parameter (suggests transients
        # like footsteps, conversation pulses, distant horns)
        if modulation > 0 and rng.random() < modulation * 0.002:
            env *= 1 + rng.uniform(0.5, 2.0)
        out[i] *= base_amp * env

    # Clip and convert to int16
    samples = []
    for x in out:
        clipped = max(-1.0, min(1.0, x))
        samples.append(int(clipped * 32767))
    return samples


def write_wav(path: Path, samples: list[int]):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        # Pack samples
        data = struct.pack("<%dh" % len(samples), *samples)
        w.writeframes(data)


def main():
    SFX_OUT.mkdir(parents=True, exist_ok=True)
    print(f"Synthesising {len(PRESETS)} placeholder ambient loops at {SFX_OUT}")
    for name, params in PRESETS.items():
        out = SFX_OUT / f"{name}.mp3"
        # We write as WAV but with .mp3 extension since the browser will play
        # WAV-format data regardless of extension via Content-Type sniffing.
        # If the user replaces with a real MP3, the filename still matches.
        samples = synthesise(*params)
        # Write as proper WAV first
        wav_path = SFX_OUT / f"{name}.wav"
        write_wav(wav_path, samples)
        # Also copy to .mp3 so the lib/sfx.ts paths resolve. Browsers happily
        # play WAV bytes from a .mp3 URL — they sniff the magic header.
        out.write_bytes(wav_path.read_bytes())
        size_kb = out.stat().st_size // 1024
        print(f"  {name}: {size_kb} KB")
    print(f"\nDone. {len(PRESETS)} placeholder loops written.")
    print(
        "These are synthesised approximations. For shipping quality, replace "
        "with real CC0 field recordings from freesound.org / pixabay using "
        "the same filenames."
    )


if __name__ == "__main__":
    main()
