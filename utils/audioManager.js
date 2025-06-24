export default class AudioManager {
    constructor() {
        const AudioManager = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.gain.value = 1.0;
        this.sfxGain.gain.value = 1.0;

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);

        this.buffers = new Map();

        this.currentMusicSource = null;
    }

    async resumeContext() {
        if (this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch (err) {
                console.warn('AudioContext resume failed:', err);
            }
        }
    }

    async loadAudio(key, url) {
        const resp = await fetch(url);
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(key, audioBuffer);
    }

    async loadAudioList(list) {
        for (const item of list) {
            const { key, urls } = item;
            let loaded = false;
            for (const url of urls) {
                try {
                    await this.loadAudio(key, url);
                    loaded = true;
                    break;
                } catch (err) {
                    console.warn(`Failed to oad ${url} for key ${key}:`, err);
                }
            }

            if (!loaded) {
                console.error(`AudioManager : could not load any url for key ${key}`);
            }
        }
    }

    playSFX(key, { volume = 1.0, playbackRate = 1.0 } = {}) {
        const buffer = this.buffers.get(key);
        if (!buffer) {
            console.warn(`AudioManager: nobuffer for SFX key "${key}"`);
            return;
        }

        this.resumeContext();

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode).connect(this.sfxGain);
        source.start(0);
    }

    playMusic(key, { volume = 1.0, loop = true } = {}) {
        const buffer = this.buffers.get(key);
        if (!buffer) {
            console.warn(`AudioManager: no buffer for music key "${key}"`);
            return;
        }
        this.resumeContext();

        if (this.currentMusicSource) {
            try {
                this.currentMusicSource.stop();
            } catch (_) { }
            this.currentMusicSource.disconnect();
            this.currentMusicSource = null;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop;

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode).connect(this.musicGain);
        source.start(0);
        this.currentMusicSource = source;
    }

    stopMusic() {
        if (this.currentMusicSource) {
            try { this.currentMusicSource.stop(); } catch (_) { }
            this.currentMusicSource.disconnect();
            this.currentMusicSource = null;
        }
    }

    setMasterVolume(val) {
        this.masterGain.gain.value = val;
    }
    setMusicVolume(val) {
        this.musicGain.gain.value = val;
    }
    setSFXVolume(val) {
        this.sfxGain.gain.value = val;
    }
}