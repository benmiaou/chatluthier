// socket-client.js
import { BackgroundMusic } from './backgroundMusic.js';
import { SoundBoard } from './soundboard.js';
import { AmbianceSounds } from './ambianceSounds.js';

let socketClient;
let clientId = null;
let isConnected = false;
const reconnectInterval = 5000; // Reconnect interval in milliseconds
let shouldAttemptReconnect = true; // Flag to control auto-reconnect

// Heartbeat variables
let heartbeatInterval = null;
const heartbeatIntervalTime = 30000; // 30 seconds


function connectWebSocket() {

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

    socketClient = new WebSocket(socketUrl);

    // Event listener for when the connection is opened
    socketClient.onopen = function (event) {
        console.log('Connected to WebSocket Server');
        isConnected = true;

        // If we have a session ID, re-subscribe to it
        if (clientId) {
            subscribeToId(clientId);
        }

        // Start the heartbeat mechanism
        startHeartbeat();
    };

    // Event listener for when the connection is closed
    socketClient.onclose = function (event) {
        console.log('Disconnected from WebSocket server');
        isConnected = false;
        showSessionControls();

        // Stop the heartbeat
        stopHeartbeat();

        // Hide the disconnect button
        hideDisconnectButton();

        if (shouldAttemptReconnect) {
            // Attempt to reconnect after a delay
            setTimeout(function () {
                console.log('Attempting to reconnect...');
                connectWebSocket();
            }, reconnectInterval);
        } else {
            console.log('Auto-reconnect disabled.');
        }
    };



    // Event listener for when a message is received from the server
    socketClient.onmessage = function (event) {
        console.log('Received message:', event.data);
        try {
            const data = JSON.parse(event.data);
            switch (data.type) {
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
}

function disconnectWebSocket() {
    if (socketClient && socketClient.readyState === WebSocket.OPEN) {
        // Disable auto-reconnect
        shouldAttemptReconnect = false;

        // Close the WebSocket connection
        socketClient.close();

        // Reset client state
        isConnected = false;
        clientId = null;
        socketClient = null;

        // Stop the heartbeat
        stopHeartbeat();

        // Update the UI
        displayStatusMessage('Disconnected from the session.', 'red');
        document.getElementById('generated-id').textContent = '';
        document.getElementById('your-id').style.display = 'none';

        // Show session controls
        showSessionControls();

        // Hide the disconnect button
        hideDisconnectButton();
    }
}

connectWebSocket();

function startHeartbeat() {
    // Clear any existing heartbeat interval
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(function () {
        if (socketClient && socketClient.readyState === WebSocket.OPEN) {
            socketClient.send(JSON.stringify({ type: 'ping' }));
            console.log('Sent heartbeat ping');
        }
    }, heartbeatIntervalTime);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

/**
 * Handles the 'subscribed' message type.
 * @param {Object} data - The message data.
 */
function handleSubscribed(data) {
    isConnected = true;
    clientId = data.id;
    displayStatusMessage(`Successfully joined session: ${data.id}`, 'green');
    document.getElementById('generated-id').textContent = data.id;
    document.getElementById('your-id').style.display = 'block';

    // Hide session creation/joining buttons and input
    hideSessionControls();

    // Show the disconnect button
    showDisconnectButton();
}

function handleReceivedBackgroundMusicChange(musicData) {
    // Update the BackgroundMusic playback
    BackgroundMusic.playReceivedBackgroundSound(musicData);
}

function handleReceivedBackgroundVolumeChange(volumeData) {
    // Update the volume
    BackgroundMusic.setVolumeFromSocket(volumeData.volume);
}

function handleReceivedBackgroundStop() 
{
    BackgroundMusic.stopReceivedBackgroundSound();
}


/**
 * Sends a subscription message to join a session.
 * @param {string} id - The session ID to join.
 */
export function subscribeToId(id) {
    shouldAttemptReconnect = true; // Enable auto-reconnect

    if (!socketClient || socketClient.readyState === WebSocket.CLOSED) {
        // Initialize WebSocket connection
        connectWebSocket();

        // Wait for the WebSocket to open before sending the subscribe message
        socketClient.addEventListener('open', function onOpen() {
            socketClient.removeEventListener('open', onOpen);
            const message = JSON.stringify({ type: 'subscribe', id: id });
            socketClient.send(message);
            console.log(`Sent subscribe request for ID: ${id}`);
        });
    } else if (socketClient.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type: 'subscribe', id: id });
        socketClient.send(message);
        console.log(`Sent subscribe request for ID: ${id}`);
    } else if (socketClient.readyState === WebSocket.CONNECTING) {
        // Wait for the WebSocket to open before sending the subscribe message
        socketClient.addEventListener('open', function onOpen() {
            socketClient.removeEventListener('open', onOpen);
            const message = JSON.stringify({ type: 'subscribe', id: id });
            socketClient.send(message);
            console.log(`Sent subscribe request for ID: ${id}`);
        });
    } else {
        console.error('WebSocket is in an unexpected state. Cannot subscribe to ID.');
    }
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
    const disconnectButton = document.getElementById('disconnect-button');
    const joinIdInput = document.getElementById('join-id-input');

    if (createIdButton) createIdButton.style.display = 'none';
    if (joinIdButton) joinIdButton.style.display = 'none';
    if (joinIdInput) joinIdInput.style.display = 'none';
    if (disconnectButton) disconnectButton.style.display = 'inline-block';
}

/**
 * Shows session creation/joining buttons and input textbox.
 */
function showSessionControls() {
    const createIdButton = document.getElementById('create-id-button');
    const joinIdButton = document.getElementById('join-id-button');
    const disconnectButton = document.getElementById('disconnect-button');
    const joinIdInput = document.getElementById('join-id-input');

    if (createIdButton) createIdButton.style.display = 'inline-block';
    if (joinIdButton) joinIdButton.style.display = 'inline-block';
    if (joinIdInput) joinIdInput.style.display = 'inline-block';
    if (disconnectButton) disconnectButton.style.display = 'none';
}

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

// Event listener for the disconnect button
document.getElementById('disconnect-button').addEventListener('click', () => {
    disconnectWebSocket();
    hideDisconnectButton()
});

function showDisconnectButton() {
    const disconnectButton = document.getElementById('disconnect-button-container');
    if (disconnectButton) {
        disconnectButton.style.display = 'inline-block';
    }
}

function hideDisconnectButton() {
    const disconnectButton = document.getElementById('disconnect-button-container');
    if (disconnectButton) {
        disconnectButton.style.display = 'none';
    }
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
