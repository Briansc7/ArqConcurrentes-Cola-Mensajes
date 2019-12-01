var ClientManager = require('./clientManager.js');
var clientManager = new ClientManager('http://localhost', 3000);
var socket_router = clientManager.get_client_socket();

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



