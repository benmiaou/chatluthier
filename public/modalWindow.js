const ModalUploadWindow = {

    openBackgroundUploadModal() {
        // Populate the subtype selector
        const subtypeSelector = document.getElementById('subtypeSelector');
        const backgroundSubtypeSelector = document.getElementById('background-subtype-selector');
        
        backgroundSubtypeSelector.innerHTML = ''; // Clear existing options
        
        for (let i = 0; i < subtypeSelector.options.length; i++) {
            const option = document.createElement('option');
            option.value = subtypeSelector.options[i].value;
            option.textContent = subtypeSelector.options[i].textContent;
            backgroundSubtypeSelector.appendChild(option);
        }

        document.getElementById('background-upload-modal').style.display = 'block'; // Show modal
    },

    openAmbianceUploadModal() {
        document.getElementById('ambiance-upload-modal').style.display = 'block';
    },

    openSoundboardUploadModal() {
        document.getElementById('soundboard-upload-modal').style.display = 'block';
    },

    // Functions to close modals
    closeBackgroundUploadModal() {
        document.getElementById('background-upload-modal').style.display = 'none';
    },

    closeAmbianceUploadModal() {
        document.getElementById('ambiance-upload-modal').style.display = 'none';
    },

    closeSoundboardUploadModal() {
        document.getElementById('soundboard-upload-modal').style.display = 'none';
    },

    // Functions to upload files

    async uploadBackgroundFile() {
        const fileInput = document.getElementById('background-file-input');
        const backgroundTypeSelector = document.getElementById('background-type-selector'); 
        const backgroundSubtypeSelector = document.getElementById('background-subtype-selector');
        
        const selectedType = backgroundTypeSelector.value; // Get battle or exploration
        const selectedSubtype = backgroundSubtypeSelector.value; 
        const newSubtypeInput = document.getElementById('new-subtype-input').value.trim();
        
        let subtype = selectedSubtype;
        
        if (newSubtypeInput) {
            // If there's a new subtype, add it to the main subtypeSelector
            subtype = newSubtypeInput;
            const subtypeSelector = document.getElementById('subtypeSelector');
            
            const option = document.createElement('option');
            option.value = subtype;
            option.textContent = subtype;
            subtypeSelector.append(option);
        }
        
        const file = fileInput.files[0];

        if (!file) {
            alert("No file selected.");
            return;
        }

        try {
            const directory = await LocalDirectory.getDirectory();
            const backgroundDir = await directory.getDirectoryHandle('background', { create: true });
            const typeDir = await backgroundDir.getDirectoryHandle(selectedType, { create: true });
            const subDir = await typeDir.getDirectoryHandle(subtype, { create: true });

            const fileHandle = await subDir.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();

            console.log(`Uploaded ${file.name} to background in ${selectedType}/${subtype}.`);
            this.closeBackgroundUploadModal(); // Close modal after uploading
            await AudioManager.loadLocalSoundFiles();
        } catch (e) {
            console.error('Error uploading background file:', e);
        }
    },

    async uploadAmbianceFile() {
        const fileInput = document.getElementById('ambiance-file-input');
        const file = fileInput.files[0];

        if (!file) {
            alert("No file selected.");
            return;
        }

        try {
            const directory = await LocalDirectory.getDirectory();
            const ambianceDir = await directory.getDirectoryHandle('ambiance', { create: true });

            const fileHandle = await ambianceDir.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();

            console.log(`Uploaded ${file.name} to ambiance.`);
        } catch (e) {
            console.error('Error uploading ambiance file:', e);
        }

        this.closeAmbianceUploadModal(); // Close modal after uploading
        await AudioManager.loadLocalSoundFiles();
    },

    async uploadSoundboardFile() {
        const fileInput = document.getElementById('soundboard-file-input');
        const file = fileInput.files[0];

        if (!file) {
            alert("No file selected.");
            return;
        }

        try {
            const directory = await LocalDirectory.getDirectory();
            const soundboardDir = await directory.getDirectoryHandle('soundboard', { create: true });

            const fileHandle = await soundboardDir.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();

            console.log(`Uploaded ${file.name} to soundboard.`);
        } catch (e) {
            console.error('Error uploading soundboard file:', e);
        }

        this.closeSoundboardUploadModal(); // Close modal after uploading
        await AudioManager.loadLocalSoundFiles();
    },

}