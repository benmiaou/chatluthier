const PreLoader = 
{
    fetchQueue : [],
    isFetching : false,

    enqueueFetch(audioUrl) {
        this.fetchQueue.push(audioUrl);
        this.processFetchQueue(); // Start processing the queue if not already started
    },

    async processFetchQueue() {
        if (this.isFetching || this.fetchQueue.length === 0) {
            return; // Exit if a fetch is already in process or the queue is empty
        }

        this.isFetching = true;
        const url = this.fetchQueue.shift();
        console.log("Cache " + url)
        try {
            const cache = await caches.open(AUDIO_CACHE_NAME);
            const response = await fetch(url  + "?nocache=true");
            if (response.ok) {
                await cache.put(url, response);
                console.log("Audio file cached successfully:", url);
            } else {
                console.error("Failed to fetch the file for caching:", url);
            }
        } catch (error) {
            console.error("Error fetching and caching audio:", error);
        } finally {
            this.isFetching = false;
            this.processFetchQueue(); // Recursively process the next item in the queue
        }
    }
}