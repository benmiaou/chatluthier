import { get, set } from 'https://unpkg.com/idb-keyval@5.0.2/dist/esm/index.js';

export const LocalDirectory = {
    directoryHandle: null,

    async selectDirectory() {
        console.log('selectDirectory');
        try 
        {
            console.log('Requesting directory picker');
            this.directoryHandle = await window.showDirectoryPicker();
            // Store the directory handle in IndexedDB after obtaining it
            await set('directory', this.directoryHandle);
            console.log('Directory handle stored in IndexedDB.');
            this.updateStatus("Directory is set and ready.", "green");
            AudioManager.loadLocalSoundFiles();
        } catch (error) {
            console.error('Error selecting or storing directory:', error);
            this.updateStatus("Failed to set directory.", "red");
        }
        return this.directoryHandle;
    },

    async getDirectory() {
        console.log('getDirectory');
        if (!this.directoryHandle) {
            try {
                const storedHandle = await get('directory');
                if (storedHandle) {
                    console.log('Directory handle retrieved from IndexedDB.');
                    // Test if the handle still has valid permissions
                    try {
                        // Attempt to read from the directory to confirm access rights
                        for await (const _ of storedHandle.values()) break; // We only need to start the iteration to test permissions
                        this.directoryHandle = storedHandle;
                        console.log('Access to directory confirmed.');
                        this.updateStatus("Directory is set and ready.", "green");
                    } catch (err) {
                        this.updateStatus("Directory not set.", "red");
                        console.error('Access to directory lost or permission revoked:', err);
                        this.directoryHandle = null; // Clear the handle as it's no longer valid
                    }
                }
            } catch (error) {
                this.updateStatus("Error retrieving directory handle.", "red");
                console.error('Error retrieving or testing directory handle:', error);
            }
        }
        return this.directoryHandle;
    },

    
    updateStatus(message, color) {
        const statusDisplay = document.getElementById('directoryStatus');
        if (statusDisplay) {
            statusDisplay.textContent = message;
            statusDisplay.style.color = color;
        }
    },

    async listDirectories(directory) {
        console.log('listDirectories');
        if (!directory)
            return;
        const directories = [];
        for await (const entry of directory.values()) {
            if (entry.kind === 'directory') {
                directories.push(entry);
            }
        }
        return directories;
    },

    async listMP3Files(directoryHandle) {
        let files = [];
        try {
            for await (const entry of directoryHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.mp3')) {
                    files.push(entry);
                }
            }
        } catch (error) {
            console.error('Error listing files:', error);
        }
        return files;
    },

    async initDirectories() {
        console.log('initDirectories');
        if (!this.directoryHandle)
            return;

        const requiredDirs = [
            'ambiance',
            'background/battle',
            'background/exploration',
            'images/icons',
            'soundboard'
        ];

        for (const path of requiredDirs) {
            await this.createDirectories(path);
        }
    },


    async createDirectories(path) {
        if (!this.directoryHandle)
            return;
        console.log('createDirectories ' + path);
        const parts = path.split('/');
        let currentDir = this.directoryHandle;

        for (const part of parts) {
            if (part) {
                try {
                    currentDir = await currentDir.getDirectoryHandle(part, { create: true });
                } catch (error) {
                    console.error('Error creating directory:', error);
                    return null;
                }
            }
        }

        return currentDir;
    },

    async listFiles(handle) {
        if (!handle)
            return;
        const files = [];
        for await (const entry of handle.values()) {
            files.push(entry);
        }
        return files;
    },

    async loadFile(fileHandle) {
        if (!fileHandle)
            return;
        const file = await fileHandle.getFile();
        const content = await file.text();
        return content;
    },

    async writeFile(filename, data) {
        if (!this.directoryHandle)
            return;
        const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
    }
};

window.LocalDirectory = LocalDirectory;
