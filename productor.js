var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
const process = require('process');
var clientManager = new ClientManager(config.router_endpoint+config.router_port);
var socket_router = clientManager.get_client_socket();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var stdin = process.openStdin();

stdin.addListener("data", function(d) {
    //listerner de lo que se ingresa por consola, cuando se presiona enter se envia el mensaje ingresado
    var message = {
        details: d.toString().trim(), //mensaje ingresado por consola
        date: new Date(),
        topic: process.argv[2] //topic definido al iniciar el productor
    };
    msgSender.send(message, 'PRODUCER', socket_router);

});



// PRODUCTOR SE CONECTA A ROUTER Y LE MANDA MENSAJE. Y creo que muere ahi
// Add a connect listener
socket_router.on('connect', function (socket) {
    console.log('Productor se conecto al Router!');
    console.log('Escriba los mensajes que desee enviar y presione enter para enviarlos');
});






