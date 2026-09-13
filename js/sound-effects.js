// Short effects are decoded once, outside the input/render loop.
export function createSoundEffects(paths, getVolume) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let context;
    try {
        context = AudioContextClass ? new AudioContextClass({ latencyHint: 'interactive' }) : null;
    } catch {
        context = null;
    }
    const buffers = new Map();
    const active = new Map();
    let resuming = null;

    function unlock() {
        if (context && context.state !== 'running' && !resuming) {
            resuming = context.resume().catch(() => {}).finally(() => { resuming = null; });
        }
    }
    // Keep listening so audio can resume after a mobile browser interruption.
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true });

    async function preload(name) {
        if (!context) return;
        const controller = new AbortController();
        let timeout;
        try {
            const buffer = await Promise.race([
                (async () => {
                    const response = await fetch(paths[name], { signal: controller.signal });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.arrayBuffer();
                    return new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject));
                })(),
                new Promise((_, reject) => {
                    timeout = setTimeout(() => {
                        controller.abort();
                        reject(new Error('Audio preload timed out'));
                    }, 15000);
                })
            ]);
            buffers.set(name, buffer);
        } catch (error) {
            // A missing effect must not cause decoding/network retries on each tap.
            console.warn(`Sound effect unavailable: ${paths[name]}`, error);
        } finally {
            clearTimeout(timeout);
        }
    }

    function stop(name) {
        const voice = active.get(name);
        if (!voice) return;
        active.delete(name);
        voice.source.stop();
        voice.source.disconnect();
        voice.gain.disconnect();
    }

    function play(name) {
        if (!context || !buffers.has(name)) return;
        unlock();
        // One voice per effect preserves the old restart behavior and bounds work.
        stop(name);
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffers.get(name);
        gain.gain.value = getVolume(name);
        source.connect(gain);
        gain.connect(context.destination);
        const voice = { source, gain };
        active.set(name, voice);
        source.onended = () => {
            source.disconnect();
            gain.disconnect();
            if (active.get(name) === voice) active.delete(name);
        };
        source.start();
    }

    return {
        supported: Boolean(context),
        preload,
        play,
        updateVolumes() {
            active.forEach(({ gain }, name) => { gain.gain.value = getVolume(name); });
        },
        stopAll() { [...active.keys()].forEach(stop); }
    };
}
