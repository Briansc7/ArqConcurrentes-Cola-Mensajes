

var ClientManager = require('./utilities/clientManager.js');
var clientManager = new ClientManager('http://localhost:3001');
var socket_router = clientManager.get_client_socket();

var fork = require('child_process').fork;
var child;

var child = fork('./consumidor.js',
    [get_direction_queue()]
);
/*
socket_router.on('connect', function (socket) {
    console.log('Connected!');

    var message = {
        details: "pedido de suscripcion",
        date: new Date(),
        topic: 'Alerts'
    };

    msgSender.send(message, 'CONSUMER', socket_router);

});


socket_router.on('connection', function (socket){
    console.log('Client '+socket.id+ ' connected!');

    socket.on('HANDSHAKE', function (from) {
        console.log(from+ ' connected!');

        if (from == 'DIR_QUEUE') {

            socket.on('MESSAGE', (msg) => {
                console.log("Message: "+msg.details+" Topic: "+msg.topic);

                child = fork('./consumidor.js', []);

            })
        }
    });

});


 */

function get_direction_queue(){
    return 'http://localhost:3002';
}