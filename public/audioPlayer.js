class AudioPlayer 
{
    constructor() 
    {
        this.audioElement = document.createElement('audio');
        this.audioElement.style.display = 'none';
        this.audioElement.controls = true;
        this.audioElement.autoplay = true;
        this.audioElement.volume = 0.5;
        this.audioElement.preload=false;
        this.audioElement.enable = false;
        this.onEndedCallback = null; // Custom callback for when playback ends naturally
        this.isPlaying = false;
    }

    async playSound(audioUrl) {
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            let response = await cache.match(audioUrl);
            if (!response) {
                // Start streaming immediately without waiting for the cache
                this.audioElement.src = audioUrl;
                this.audioElement.play().then(() => {
                    this.isPlaying = true;
                    console.log("Playback started successfully from stream.");
                }).catch(error => {
                    console.error("Error playing audio:", error);
                });
                this.enqueueFetch(audioUrl); // Queue the fetch operation
            } else {
                // If the audio is in the cache, use it directly
                this.audioElement.src = URL.createObjectURL(await response.blob());
                this.audioElement.play().then(() => {
                    this.isPlaying = true;
                    console.log("Playback started successfully from cache.");
                }).catch(error => {
                    console.error("Error playing audio:", error);
                });
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

    stop() 
    {
        if(this.isPlaying)
        {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isPlaying = false;
            console.log("Playback has been stopped.");
        }
    }

    pause() 
    {
        this.audioElement.pause();
    }

    resume() 
    {
        this.audioElement.play();
    }

    getPlayer()
    {
        return this.audioElement;
    }

    setLoop(looping)
    {
        this.audioElement.loop = looping;
    }

    isCurrentlyPlaying() 
    {
        return this.isPlaying;
    }

    setVolume(level) {
        this.audioElement.volume = level;
        console.log(`Volume set to ${level}.`);
    }

}