var ClientManager = require('./utilities/clientManager.js');
var clientManager = new ClientManager('http://localhost:3000');
var socket_router = clientManager.get_client_socket();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();




// Add a connect listener
socket_router.on('connect', function (socket) {
    console.log('Connected!');
    var message = {
        details: "mensaje de productor",
        date: new Date(),
        topic: 'Alerts'
    };
    msgSender.send(message, 'PRODUCER', socket_router);

});




