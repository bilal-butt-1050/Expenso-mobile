"""Generate Expenso's UI sounds into assets/sounds/ (44.1 kHz, mono, 16-bit WAV).

Stdlib only, deterministic (fixed noise seed), so re-running gives byte-identical files.
Run from the mobile/ folder:  python scripts/generate-sounds.py

Every sound is normalised to PEAK_DBFS and gets a short fade-in and fade-out, so none starts or
ends on a click. Tweak the numbers in each make_* function and re-run.
"""

import math
import os
import random
import struct
import wave

RATE = 44100
PEAK_DBFS = -14.0  # the brief: around -12 dBFS or quieter
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sounds")


def silence(seconds):
    return [0.0] * int(seconds * RATE)


def mix_into(buf, sig, at):
    """Add `sig` into `buf` starting at `at` seconds."""
    start = int(at * RATE)
    for i, s in enumerate(sig):
        if start + i < len(buf):
            buf[start + i] += s


def tone(freq, seconds, decay, harmonics=((1, 1.0), (2, 0.18)), attack=0.004):
    """A struck tone: sine plus soft harmonics, a fast attack and an exponential decay."""
    out = []
    for i in range(int(seconds * RATE)):
        t = i / RATE
        env = min(1.0, t / attack) * math.exp(-t / decay)
        out.append(env * sum(a * math.sin(2 * math.pi * freq * m * t) for m, a in harmonics))
    return out


def bandpassed_noise(seconds, f_start, f_end, q, env_fn, rng):
    """White noise through an RBJ band-pass whose centre sweeps from f_start to f_end."""
    out = []
    x1 = x2 = y1 = y2 = 0.0
    n = int(seconds * RATE)
    for i in range(n):
        p = i / max(1, n - 1)
        f0 = f_start * (f_end / f_start) ** p  # exponential sweep sounds even to the ear
        w0 = 2 * math.pi * f0 / RATE
        alpha = math.sin(w0) / (2 * q)
        a0 = 1 + alpha
        b0, b2 = alpha / a0, -alpha / a0
        a1, a2 = -2 * math.cos(w0) / a0, (1 - alpha) / a0
        x0 = rng.uniform(-1.0, 1.0)
        y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, x0, y1, y0
        out.append(y0 * env_fn(p))
    return out


def finish(buf, fade_in=0.003, fade_out=0.03):
    """Fade the edges (no clicks) and normalise to PEAK_DBFS."""
    n = len(buf)
    fi, fo = int(fade_in * RATE), int(fade_out * RATE)
    for i in range(min(fi, n)):
        buf[i] *= i / fi
    for i in range(min(fo, n)):
        buf[n - 1 - i] *= i / fo
    peak = max(abs(s) for s in buf) or 1.0
    gain = 10 ** (PEAK_DBFS / 20) / peak
    return [s * gain for s in buf]


def write(name, buf):
    path = os.path.join(OUT_DIR, name)
    frames = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)) for s in buf)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(frames)
    print(f"{name}: {len(buf) / RATE:.2f} s, {os.path.getsize(path)} bytes")


# --- the sounds -----------------------------------------------------------------------------------


def make_add():
    """Record added: a bright rising fifth, G5 then D6."""
    buf = silence(0.42)
    mix_into(buf, tone(783.99, 0.30, 0.10), 0.0)
    mix_into(buf, tone(1174.66, 0.34, 0.12), 0.075)
    return finish(buf)


def make_update():
    """Record updated: one soft tick-chime, A5 with a faint high tick on the attack."""
    buf = silence(0.26)
    mix_into(buf, tone(880.0, 0.26, 0.07, harmonics=((1, 1.0), (3, 0.06))), 0.0)
    mix_into(buf, tone(3520.0, 0.03, 0.006, harmonics=((1, 0.25),), attack=0.001), 0.0)
    return finish(buf)


def make_settle():
    """Loan settled or paid: a small coin clink, two quick metallic strikes (inharmonic partials)."""
    coin = ((1, 1.0), (2.76, 0.45), (5.40, 0.22), (8.93, 0.10))
    buf = silence(0.38)
    mix_into(buf, tone(2100.0, 0.25, 0.045, harmonics=coin, attack=0.001), 0.0)
    mix_into(buf, [s * 0.7 for s in tone(2380.0, 0.28, 0.055, harmonics=coin, attack=0.001)], 0.07)
    return finish(buf)


def make_delete(rng):
    """Record deleted: a soft whoosh falling in pitch, ending in a light low 'into the bin' thud."""
    buf = silence(0.45)
    whoosh = bandpassed_noise(0.28, 2600.0, 380.0, 1.1, lambda p: math.sin(math.pi * p) ** 1.5, rng)
    mix_into(buf, whoosh, 0.0)
    # The thud: a tone dropping from 230 Hz to 110 Hz, quickly damped, with a touch of low noise.
    # Its 2nd harmonic keeps it audible on a phone speaker, which barely reproduces < 200 Hz.
    thud = []
    phase = 0.0
    for i in range(int(0.16 * RATE)):
        t = i / RATE
        f = 110.0 + 120.0 * math.exp(-t / 0.03)
        phase += 2 * math.pi * f / RATE
        thud.append(min(1.0, t / 0.002) * math.exp(-t / 0.045) * (math.sin(phase) + 0.4 * math.sin(2 * phase)))
    thud_noise = bandpassed_noise(0.06, 400.0, 200.0, 0.8, lambda p: (1 - p) ** 2, rng)
    mix_into(buf, [s * 0.6 for s in thud], 0.25)
    mix_into(buf, [s * 0.35 for s in thud_noise], 0.25)
    return finish(buf)


def make_signin():
    """Signed in: a warm rising C major arpeggio, C5 E5 G5, with a mellow (low-harmonic) timbre."""
    warm = ((1, 1.0), (2, 0.12))
    buf = silence(0.50)
    mix_into(buf, tone(523.25, 0.40, 0.14, harmonics=warm, attack=0.006), 0.0)
    mix_into(buf, tone(659.25, 0.36, 0.14, harmonics=warm, attack=0.006), 0.07)
    mix_into(buf, tone(783.99, 0.36, 0.16, harmonics=warm, attack=0.006), 0.14)
    return finish(buf, fade_out=0.05)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    rng = random.Random(1050)
    sounds = {
        "add.wav": make_add(),
        "update.wav": make_update(),
        "settle.wav": make_settle(),
        "delete.wav": make_delete(rng),
        "signin.wav": make_signin(),
    }
    for name, buf in sounds.items():
        # Self-check: the brief's limits.
        assert len(buf) / RATE <= 0.5, name
        assert max(abs(s) for s in buf) <= 10 ** (-12 / 20), name
        assert abs(buf[0]) < 1e-3 and abs(buf[-1]) < 1e-3, f"{name} starts or ends on a click"
        write(name, buf)
