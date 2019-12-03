var ClientManager = require('./utilities/clientManager.js');
var clientManager = new ClientManager('http://localhost:3000');
var socket_router = clientManager.get_client_socket();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();



// PRODUCTOR SE CONECTA A ROUTER Y LE MANDA MENSAJE. Y creo que muere ahi
// Add a connect listener
socket_router.on('connect', function (socket) {
    console.log('Productor se conecto a Router!');
    var message = {
        details: "mensaje de productor",
        date: new Date(),
        topic: 'Alerts'
    };
    msgSender.send(message, 'PRODUCER', socket_router);

});




