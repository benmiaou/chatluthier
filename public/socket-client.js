const socketClient = new WebSocket('ws://localhost:3001');

socketClient.onopen = function (event) {
    // Alert the user that they are
    // connected to the WebSocket server
    console.log('You are Connected to WebSocket Server');
};

// Event listener for when a message
//  is received from the server
socketClient.onmessage = function (event) {
    console.log(event.data)
};

// Event listener for when the
// WebSocket connection is closed
socketClient.onclose = function (event) {
    // Log a message when disconnected
    //  from the WebSocket server
    console.log('Disconnected from WebSocket server');
};

// Function to send a message
//  to the WebSocket server
function sendMessage(raw_message) {
    let formated_message = JSON.stringify({type: raw_message})
    console.log("Client side: " + formated_message)
    socketClient.send(formated_message);
}
