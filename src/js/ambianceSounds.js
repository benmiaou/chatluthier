import { GoogleLogin } from './googleLogin.js'; // Newly added import
import { SoundBar } from './soundBar.js';
import { sendAmbianceMessage } from './socket-client.js';


export const AmbianceSounds = {
    soundBars: [],
    currentAmbiances: {},
    audioContext: null,
    ambianceSounds: null,
    selectedContext: "All",
    presets: {}, // Stocker les presets

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },

    async loadAmbianceButtons() {
        // Load the main ambiance sounds file
        let mainResponse = await fetch('/ambianceSounds');
        let mainAmbianceSounds = await mainResponse.json();
    
        // If the user is logged in, load the user-specific ambiance sounds file
        let userAmbianceSounds = [];
        if (GoogleLogin.userId) {
            let userResponse = await fetch(`/ambianceSounds?userId=${GoogleLogin.userId}`);
            userAmbianceSounds = await userResponse.json();
        }
    
        // Merge the user-specific changes with the main ambiance sounds
        const ambianceSounds = mainAmbianceSounds.map(mainSound => {
            const userSound = userAmbianceSounds.find(userSound => userSound.filename === mainSound.filename);
            if (userSound) {
                // Apply user-specific contexts and isEnabled status
                return {
                    ...mainSound,
                    contexts: userSound.contexts,
                    isEnabled: userSound.isEnabled
                };
            }
            return mainSound;
        });
    
        // Log the merged ambiance sounds
        console.log(ambianceSounds);
    
        // Generate ambient buttons using the merged ambiance sounds
        this.ambianceSounds = ambianceSounds;
        this.generateAmbientButtons(this.ambianceSounds);
    
        // Load presets after generating the buttons
        if (GoogleLogin.isSignedIn) {
            await this.loadPresets();
        }
    
        return this.ambianceSounds;
    },

    async resetAmbientSounds() {
        this.soundBars.forEach(soundbar => {
            soundbar.setVolume(0, false);
            soundbar.progressBar.style.width = 0 + '%';
        })
        sendAmbianceMessage(this.getCurrentAmbianceStatus());
    },

    generateAmbientButtons(ambianceSounds) {
        this.soundBars = [];
        const section = document.getElementById("ambiance");
        section.innerHTML = ''; // Effacer le contenu existant

        ambianceSounds.forEach(ambianceSound => {
            // Ensure isEnabled is true by default if not set
            if (ambianceSound.isEnabled === undefined) {
                ambianceSound.isEnabled = true;
            }
        
            if (!ambianceSound.isEnabled) return;
        
            const container = document.createElement('div');
            container.className = 'sound-container';
        
            // Create a div for the sound bar
            const soundBarDiv = document.createElement('div');
            soundBarDiv.id = `sound-bar-${ambianceSound.filename}`; // Assign a unique ID
            soundBarDiv.className = 'sound-bar'; // Apply style
        
            container.appendChild(soundBarDiv);
            const soundBar = new SoundBar(ambianceSound);
            this.soundBars.push(soundBar);
            container.appendChild(soundBar.getElement());
        
            section.appendChild(container);
        });
        // Ajouter les contrôles de preset si l'utilisateur est connecté
        if (GoogleLogin.isSignedIn) {
            this.addPresetControls();
        }
    },

    addPresetControls() {
        const presetSection = document.getElementById("preset-controls");
        if (!presetSection) {
            // Create the container for preset controls if it doesn't exist
            const presetControls = document.createElement('div');
            presetControls.id = "preset-controls";

            // Create a sub-container for the input and button
            const inputButtonContainer = document.createElement('div');
            inputButtonContainer.id = 'input-button-container';

            // Text input for the preset name
            const presetNameInput = document.createElement('input');
            presetNameInput.className = 'text-input'
            presetNameInput.type = 'text';
            presetNameInput.id = 'preset-name';
            presetNameInput.placeholder = 'Name of the preset';
            
            // Button to save the preset
            const savePresetButton = document.createElement('button');
            savePresetButton.textContent = '+';
            savePresetButton.id = 'save-preset-button';
            savePresetButton.className = 'button-primary';
            savePresetButton.onclick = () => this.savePreset();

            // Append the input and button to the container
            inputButtonContainer.appendChild(presetNameInput);
            inputButtonContainer.appendChild(savePresetButton);

            // Dropdown to select presets
            const presetDropdown = document.createElement('select');
            presetDropdown.id = 'preset-dropdown';
            presetDropdown.className = 'selector-primary';
            presetDropdown.onchange = () => this.applyPreset(presetDropdown.value);

            // Append elements to the presetControls container
            presetControls.appendChild(inputButtonContainer);
            presetControls.appendChild(presetDropdown);

            // Insert the preset controls before the ambiance section
            const ambianceSection = document.getElementById("ambiance");
            ambianceSection.parentNode.insertBefore(presetControls, ambianceSection);
        }

        // Mettre à jour la boîte déroulante des presets
        this.updatePresetDropdown();
    },

    async savePreset() {
        const presetNameInput = document.getElementById('preset-name');
        const presetName = presetNameInput.value.trim();
        if (presetName === '') {
            alert('Veuillez entrer un nom pour le preset.');
            return;
        }

        // Récupérer les niveaux de volume actuels
        const presetData = {};
        this.soundBars.forEach(soundBar => {
            presetData[soundBar.ambianceSound.filename] = soundBar.getVolume();
        });

        // Sauvegarder le preset localement
        this.presets[presetName] = presetData;

        // Envoyer le preset au serveur
        if (GoogleLogin.userId) {
            const dataToSend = {
                userId: GoogleLogin.userId,
                presetName: presetName,
                presetData: presetData,
            };

            try {
                const response = await fetch('/save-preset', {
                    method: 'POST', // Méthode HTTP POST pour envoyer les données au serveur
                    headers: {
                        'Content-Type': 'application/json', // Type de contenu JSON
                    },
                    body: JSON.stringify(dataToSend), // Convertir les données en chaîne JSON
                });

                if (response.ok) {
                    console.log('Preset sauvegardé sur le serveur avec succès');
                    // Recharger les presets depuis le serveur pour s'assurer qu'ils sont à jour
                    await this.loadPresets();
                } else {
                    console.error('Erreur lors de la sauvegarde du preset sur le serveur');
                }
            } catch (error) {
                console.error('Erreur réseau :', error);
            }
        } else {
            console.error('User ID is not available'); // Gérer les cas où l'ID utilisateur est manquant
        }

        // Mettre à jour la boîte déroulante
        this.updatePresetDropdown();

        // Réinitialiser le champ de saisie
        presetNameInput.value = '';
    },

    applyPreset(presetName) {
        if (presetName === '') return;
        const presetData = this.presets[presetName];
        if (!presetData) return;
        this.applyStatus(presetData);
        // Send the current ambiance status via WebSocket
        const currentStatus = this.getCurrentAmbianceStatus();
        sendAmbianceMessage(currentStatus);
    
    },

    applyStatus(statusData)
    {
        this.soundBars.forEach(soundBar => {
            const volume = statusData[soundBar.ambianceSound.filename] || 0;
            soundBar.setVolume(volume, false);
            soundBar.progressBar.style.width = (volume * 100) + '%';
        });
    },

    updatePresetDropdown() {
        const presetDropdown = document.getElementById('preset-dropdown');
        if (!presetDropdown) return;

        // Effacer les options existantes
        presetDropdown.innerHTML = '';

        // Ajouter une option par défaut
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Sélectionner un preset';
        presetDropdown.appendChild(defaultOption);

        // N'afficher les presets que si l'utilisateur est connecté
        if (GoogleLogin.isSignedIn) {
            Object.keys(this.presets).forEach(presetName => {
                const option = document.createElement('option');
                option.value = presetName;
                option.textContent = presetName;
                presetDropdown.appendChild(option);
            });
        }
    },

    async loadPresets() {
        // Charger les presets depuis le serveur si l'utilisateur est connecté
        if (GoogleLogin.userId) {
            try {
                const response = await fetch(`/load-presets?userId=${GoogleLogin.userId}`);
                const data = await response.json();
                this.presets = data.presets || {};
                this.updatePresetDropdown();
            } catch (error) {
                console.error('Erreur lors du chargement des presets depuis le serveur :', error);
                this.presets = {};
            }
        } else {
            console.error('User ID is not available');
            this.presets = {};
        }
    },

    getCurrentAmbianceStatus() {
        const status = {};
        this.soundBars.forEach(soundBar => {
            status[soundBar.ambianceSound.filename] = soundBar.getVolume();
        });
        return status;
    },
};




