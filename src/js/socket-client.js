// socket-client.js
import { BackgroundMusic } from './backgroundMusic.js';
import { SoundBoard } from './soundboard.js';
import { AmbianceSounds } from './ambianceSounds.js';


// Determine the WebSocket URL based on the environment
let socketUrl;

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development environment
    socketUrl = 'ws://localhost:3001';
} else {
    // Production environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socketUrl = `${protocol}//${window.location.host}/ws/`;
}

const socketClient = new WebSocket(socketUrl);

// Store the ID for this client
let clientId = null;
let isConnected = false; // Boolean to know if client is connected

// Event listener for when the connection is opened
socketClient.onopen = function (event) {
    console.log('Connected to WebSocket Server');
};

// Event listener for when a message is received from the server
socketClient.onmessage = function (event) {
    console.log('Received message:', event.data);
    try {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'registered':
                handleRegistered(data);
                break;

            case 'subscribed':
                handleSubscribed(data);
                break;

            case 'backgroundMusicChange':
                console.log(`Received backgroundMusicChange from ID ${data.id}:`, data.content);
                handleReceivedBackgroundMusicChange(data.content);
                break;

            case 'backgroundMusicVolumeChange':
                console.log(`Received backgroundMusicVolumeChange from ID ${data.id}:`, data.content);
                handleReceivedBackgroundVolumeChange(data.content);
                break;

            case 'backgroundMusicStop':
                console.log(`Received backgroundMusicStop from ID ${data.id}:`, data.content);
                handleReceivedBackgroundStop();
                break;

            case 'playSoundboardSound':
                console.log(`Received playSoundboardSound from ID ${data.id}:`, data.content.filename);
                handleReceivedPlaySoundboardSound(data.content.filename);
                break;

            case 'message':
                console.log(`Received message from ID ${data.id}:`, data.content);
                handleReceivedContent(data.content);
                break;

            case 'ambianceStatusUpdate':
                console.log(`Received ambiance status update from ID ${data.id}:`, data.content.ambianceStatus);
                handleReceivedAmbianceStatus(data.content.ambianceStatus);
                break;

            case 'error':
                displayStatusMessage(data.message, 'red');
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('Error processing incoming message:', error);
    }
};

/**
 * Handles the 'registered' message type.
 * @param {Object} data - The message data.
 */
function handleRegistered(data) {
    isConnected = true;
    clientId = data.id;
    displayStatusMessage(`Session created with ID: ${data.id}`, 'green');
    document.getElementById('session-status').textContent = 'Created';
    document.getElementById('generated-id').textContent = data.id;
    document.getElementById('your-id').style.display = 'block';

    // Hide session creation/joining buttons and input
    hideSessionControls();
}

/**
 * Handles the 'subscribed' message type.
 * @param {Object} data - The message data.
 */
function handleSubscribed(data) {
    isConnected = true;
    clientId = data.id;
    displayStatusMessage(`Successfully joined session: ${data.id}`, 'green');
    document.getElementById('session-status').textContent = 'Joined';
    document.getElementById('generated-id').textContent = data.id;
    document.getElementById('your-id').style.display = 'block';

    // Hide session creation/joining buttons and input
    hideSessionControls();
}

function handleReceivedBackgroundMusicChange(musicData) {
    // Ensure that we don't process our own messages
    if (musicData.senderId === clientId) return;

    // Update the BackgroundMusic playback
    BackgroundMusic.playReceivedBackgroundSound(musicData);
}

function handleReceivedBackgroundVolumeChange(volumeData) {
    // Ensure that we don't process our own messages
    if (volumeData.senderId === clientId) return;

    // Update the volume
    BackgroundMusic.setVolumeFromSocket(volumeData.volume);
}

function handleReceivedBackgroundStop() 
{
    BackgroundMusic.stopReceivedBackgroundSound();
}

// Event listener for when the connection is closed
socketClient.onclose = function (event) {
    console.log('Disconnected from WebSocket server');
    isConnected = false;
    showSessionControls();
};

/**
 * Sends a registration message to create a session.
 * @param {string} id - The session ID to register.
 */
export function registerId(id) {
    const message = JSON.stringify({ type: 'register', id: id });
    socketClient.send(message);
    console.log(`Sent register request for ID: ${id}`);
}

/**
 * Sends a subscription message to join a session.
 * @param {string} id - The session ID to join.
 */
export function subscribeToId(id) {
    const message = JSON.stringify({ type: 'subscribe', id: id });
    socketClient.send(message);
    console.log(`Sent subscribe request for ID: ${id}`);
}

/**
 * Sends a general message.
 * @param {string} content - The message content.
 */
export function sendMessage(content) {
    if (isConnected && clientId) {
        const message = JSON.stringify({
            type: 'message',
            id: clientId,
            content: content,
        });
        socketClient.send(message);
        console.log('Sent message:', content);
    } else {
        console.error('Client is not connected to a session.');
        displayStatusMessage('You are not connected to a session.', 'red');
    }
}

export function sendBackgroundVolumeChangeMessage(gainValue)
{
    if (isConnected && clientId) {
        const message = JSON.stringify({
            type: 'backgroundMusicVolumeChange',
            id: clientId,
            content: gainValue,
        });
        socketClient.send(message);
    }
}

export function sendBackgroundMusicChangeMessage(musicData)
{
    if (isConnected && clientId) {
        const message = JSON.stringify({
            type: 'backgroundMusicChange',
            id: clientId,
            content: musicData,
        });
        socketClient.send(message);
    }
}

export function sendBackgroundStopMessage()
{
    if (isConnected && clientId) {
        const message = JSON.stringify({
            type: 'backgroundMusicStop',
            id: clientId,
        });
        socketClient.send(message);
    }
}

/**
 * Sends an ambiance message.
 * @param {Object} ambianceStatus - The ambiance status to send.
 */
export function sendAmbianceMessage(ambianceStatus) {
    if (isConnected && clientId) {
        const message = JSON.stringify({
            type: 'ambianceStatusUpdate', // Define a new message type
            id: clientId,
            content: {
                ambianceStatus: ambianceStatus
            },
        });
        socketClient.send(message);
    }
}

/**
 * Sends a playSoundboardSound message.
 * @param {string} filename - The filename of the sound to play.
 */
export function sendPlaySoundboardSoundMessage(filename) {
    if (isConnected && clientId) 
    {
        const message = JSON.stringify({
            type: 'playSoundboardSound',
            id: clientId,
            content: { filename: filename }
        });
        socketClient.send(message);
    } 
}


/**
 * Handles received content messages.
 * @param {string} content - The message content.
 */
function handleReceivedContent(content) {
    // Implement logic to handle the content
    console.log('Handling received content:', content);
    // For example, play the song specified in content
    // playSong(content); // Implement this function as needed
}

/**
 * Displays a status message to the user.
 * @param {string} message - The message to display.
 * @param {string} color - The color of the message text.
 */
function displayStatusMessage(message, color = 'red') {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.style.color = color;

        // Clear the message after 10 seconds
        if (displayStatusMessage.timeoutId) {
            clearTimeout(displayStatusMessage.timeoutId);
        }
        displayStatusMessage.timeoutId = setTimeout(() => {
            statusMessage.textContent = '';
        }, 5000); // 10000 milliseconds = 10 seconds
    }
}

/**
 * Hides session creation/joining buttons and input textbox.
 */
function hideSessionControls() {
    const createIdButton = document.getElementById('create-id-button');
    const joinIdButton = document.getElementById('join-id-button');
    const joinIdInput = document.getElementById('join-id-input');

    if (createIdButton) createIdButton.style.display = 'none';
    if (joinIdButton) joinIdButton.style.display = 'none';
    if (joinIdInput) joinIdInput.style.display = 'none';
}

/**
 * Shows session creation/joining buttons and input textbox.
 */
function showSessionControls() {
    const createIdButton = document.getElementById('create-id-button');
    const joinIdButton = document.getElementById('join-id-button');
    const joinIdInput = document.getElementById('join-id-input');

    if (createIdButton) createIdButton.style.display = 'inline-block';
    if (joinIdButton) joinIdButton.style.display = 'inline-block';
    if (joinIdInput) joinIdInput.style.display = 'inline-block';
}

// Event listeners for the buttons
document.getElementById('create-id-button').addEventListener('click', () => {
    const randomId = generateRandomId();
    registerId(randomId);
});

document.getElementById('join-id-button').addEventListener('click', () => {
    const idToJoin = document.getElementById('join-id-input').value.trim();
    if (idToJoin) {
        subscribeToId(idToJoin);
    } else {
        displayStatusMessage('Please enter a Session ID to join.', 'red');
    }
});

// Clear status message when input changes
document.getElementById('join-id-input').addEventListener('input', () => {
    displayStatusMessage('');
});

// Function to generate a random ID
function generateRandomId() {
    return Math.random().toString(36).substr(2, 9);
}


/**
 * Handles received ambiance status updates.
 * @param {Object} ambianceStatus - The ambiance status to apply.
 */
function handleReceivedAmbianceStatus(ambianceStatus) {
    Object.keys(ambianceStatus).forEach(filename => {
        const volume = ambianceStatus[filename];
        const soundBar = AmbianceSounds.soundBars.find(sb => sb.ambianceSound.filename === filename);
        if (soundBar) {
            soundBar.setVolume(volume, false); // Apply volume without sending a message
            soundBar.progressBar.style.width = `${volume * 100}%`;
        }
    });
}

/**
 * Handles the 'playSoundboardSound' message type.
 * @param {string} filename - The filename of the sound to play.
 */
function handleReceivedPlaySoundboardSound(filename) 
{
        SoundBoard.playSoundRemote(filename);
}
