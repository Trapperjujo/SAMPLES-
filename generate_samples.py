import wave
import math
import struct
import os

sample_rate = 44100
duration = 2.0  # seconds

def generate_tone(filename, frequency_func, envelope_func):
    path = os.path.join('assets', 'samples', filename)
    num_samples = int(sample_rate * duration)
    with wave.open(path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = float(i) / sample_rate
            val = frequency_func(t)
            env = envelope_func(t)
            
            # constrain
            sample = int((val * env) * 32767.0)
            sample = max(-32768, min(32767, sample))
            
            wav_file.writeframes(struct.pack('h', sample))
    print(f"Generated {path}")

# Ensure dirs exist
os.makedirs(os.path.join('assets', 'samples'), exist_ok=True)

# Generate pseudo drums (noise burst)
import random
generate_tone('drums.wav', 
              lambda t: random.uniform(-1, 1), 
              lambda t: math.exp(-10 * (t % 0.5))) # 4 hits

# Generate pseudo bass (low sine)
generate_tone('bass.wav', 
              lambda t: math.sin(2 * math.pi * 55 * t), 
              lambda t: 1.0) 

# Generate pseudo guitar (sawtooth-ish)
generate_tone('guitars.wav', 
              lambda t: (t * 220 % 1) * 2 - 1, 
              lambda t: math.exp(-2 * t))

# Generate pseudo piano (sine with fast decay)
generate_tone('piano.wav', 
              lambda t: math.sin(2 * math.pi * 440 * t), 
              lambda t: math.exp(-5 * (t % 0.5)))

# Generate pseudo pads (slow attack/decay sine mix)
generate_tone('pads.wav', 
              lambda t: (math.sin(2 * math.pi * 220 * t) + math.sin(2 * math.pi * 222 * t)) / 2, 
              lambda t: math.sin(math.pi * t / duration))

# Generate pseudo synths (square wave)
generate_tone('synths.wav', 
              lambda t: 1.0 if (t * 880 % 1.0) > 0.5 else -1.0, 
              lambda t: math.exp(-1.0 * t))

print("All placeholder samples generated.")
