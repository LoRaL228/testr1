class AudioAnalyzerExtension {
    constructor(runtime) {
        this.runtime = runtime;

        // Настройка Web Audio API
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 4096; // как просил :)
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

        this.microphoneReady = false;
        this.initMicrophone();
    }

    async initMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            this.microphoneReady = true;
        } catch (error) {
            console.error("Ошибка доступа к микрофону:", error);
        }
    }

    getInfo() {
        return {
            id: 'audioAnalyzer',
            name: 'Аудио Анализатор',
            blocks: [
                {
                    opcode: 'getPeakFrequency',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'Пиковая частота'
                },
                {
                    opcode: 'getVolumeAtFrequency',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'Громкость частоты [FREQ] Гц',
                    arguments: {
                        FREQ: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 440
                        }
                    }
                },
                {
                    opcode: 'playTone',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'Воспроизвести [FREQ] Гц в течение [DURATION] сек',
                    arguments: {
                        FREQ: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 440
                        },
                        DURATION: {
                            type: Scratch.ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                }
            ]
        };
    }

    getPeakFrequency() {
        if (!this.microphoneReady) return 0;

        this.analyser.getByteFrequencyData(this.frequencyData);

        let maxVal = -1;
        let maxIndex = -1;
        for (let i = 0; i < this.frequencyData.length; i++) {
            if (this.frequencyData[i] > maxVal) {
                maxVal = this.frequencyData[i];
                maxIndex = i;
            }
        }

        const nyquist = this.audioContext.sampleRate / 2;
        const freqPerBin = nyquist / this.analyser.frequencyBinCount;
        const peakFrequency = maxIndex * freqPerBin;

        return Math.round(peakFrequency);
    }

    getVolumeAtFrequency(args) {
        if (!this.microphoneReady) return 0;

        const targetFreq = parseFloat(args.FREQ);
        if (isNaN(targetFreq) || targetFreq <= 0) return 0;

        this.analyser.getByteFrequencyData(this.frequencyData);

        const nyquist = this.audioContext.sampleRate / 2;
        const freqPerBin = nyquist / this.analyser.frequencyBinCount;
        const binIndex = Math.round(targetFreq / freqPerBin);

        if (binIndex < 0 || binIndex >= this.frequencyData.length) return 0;

        return this.frequencyData[binIndex];
    }

    playTone(args) {
        const freq = parseFloat(args.FREQ);
        const duration = parseFloat(args.DURATION);

        if (isNaN(freq) || freq <= 0 || isNaN(duration) || duration <= 0) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime); // не громко
        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
}

Scratch.extensions.register(new AudioAnalyzerExtension());
