var io = require('socket.io-client');
var socket = io.connect('http://localhost:3000', {reconnect: true});

var message = {
    details: "mensaje de productor",
    date: new Date(),
    topic: 'Alerts'
}


// Add a connect listener
socket.on('connect', function (socket) {
    console.log('Connected!');
    send();

});

function send() {
    socket.emit('HANDSHAKE', 'PRODUCER');
    socket.emit('MESSAGE', message);
    console.log("Message sent to server");

}



