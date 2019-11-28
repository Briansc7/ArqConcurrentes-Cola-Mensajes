var io = require('socket.io-client');
var socket_router = io.connect('http://localhost:3000', {reconnect: true});

var message = {
    details: "mensaje de productor",
    date: new Date(),
    topic: 'Alerts'
}


// Add a connect listener
socket_router.on('connect', function (socket_router) {
    console.log('Connected!');
    send();

});

function send() {
    socket_router.emit('HANDSHAKE', 'PRODUCER');
    socket_router.emit('MESSAGE', message);
    console.log("Message sent to server");

}



