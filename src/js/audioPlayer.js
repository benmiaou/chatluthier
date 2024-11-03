import { AUDIO_CACHE_NAME } from './constants.js';
import { PreLoader } from './preloader.js';

export class AudioPlayer {
    constructor() {
        this.audioElement = document.createElement('audio');
        this.audioElement.style.display = 'none';
        this.audioElement.controls = true;
        this.audioElement.autoplay = false;
        this.audioElement.volume = 0.5;
        this.audioElement.preload = false;
        this.audioElement.enable = false;
        this.onEndedCallback = null; // Custom callback for when playback ends naturally
        this.isPlaying = false;

        document.body.appendChild(this.audioElement);
    }

    async playSound(audioUrl) {
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            let response = await cache.match(audioUrl);
            if (!response) {
                // Start streaming immediately without waiting for the cache
                this.audioElement.src = audioUrl;
                console.log(PreLoader);
                PreLoader.enqueueFetch(audioUrl); // Queue the fetch operation
            } else {
                // If the audio is in the cache, use it directly
                this.audioElement.src = URL.createObjectURL(await response.blob());
            }

        } catch (error) {
            console.error("Error playing or caching audio:", error);
        }

        this.audioElement.onended = () => {
            this.isPlaying = false;
            if (this.onEndedCallback) {
                this.onEndedCallback(); // Call the registered callback if set
            }
            console.log("Playback finished.");
            URL.revokeObjectURL(this.audioElement.src); // Clean up the object URL to release memory
        };
    }

    setOnEndedCallback(callback) {
        this.onEndedCallback = callback;
    }

    stop() {
        if (this.isPlaying) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isPlaying = false;
            console.log("Playback has been stopped.");
        }
    }

    pause() {
        this.isPlaying = false;
        this.audioElement.pause();
    }

    play() {
        this.isPlaying = true;
        this.audioElement.play().then(() => {
            console.log("Playback started.");
        }).catch(error => {
            console.error("Error playing audio:", error);
        });
    }

    getPlayer() {
        return this.audioElement;
    }

    setLoop(looping) {
        this.audioElement.loop = looping;
    }

    isLooping() {
        return this.audioElement.loop;
    }

    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    setVolume(level) {
        this.audioElement.volume = level;
        console.log(`Volume set to ${level}.`);
    }
}