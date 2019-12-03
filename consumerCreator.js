

var ClientManager = require('./utilities/clientManager.js');
var clientManager = new ClientManager('http://localhost:3000');
var socket_router = clientManager.get_client_socket();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var fork = require('child_process').fork;
var child;

socket_router.on('connect', function (socket) {
    console.log('Connected!');

    var message = {
        details: "pedido de suscripcion",
        date: new Date(),
        topic: 'Alerts'
    };

    msgSender.send(message, 'SUBSCRIBER', socket_router);

});



socket_router.on('HANDSHAKE', function (from) {
        console.log(from+ ' connected!');

        if (from == 'DIR_QUEUE') {

            socket_router.on('MESSAGE', (msg) => {
                console.log("Message: "+msg.details+" Topic: "+msg.topic);

                child = fork('./consumidor.js',
                    [msg.dir]
                );

            })
        }
    });






function get_direction_queue(){
    return 'http://localhost:3002';
}