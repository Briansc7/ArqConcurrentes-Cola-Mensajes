

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
var clientManager = new ClientManager(config.router_endpoint+config.router_port);
var socket_router = clientManager.get_client_socket();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var fork = require('child_process').fork;
var child;

socket_router.on('connect', function (socket) {
    console.log('Connected!');

    var message = {
        from: 'SUBSCRIBER',
        details: "pedido de suscripcion",
        date: new Date(),
        topic: 'Alerts'
    };

    msgSender.send(message,  socket_router);

});



socket_router.on('MESSAGE', (msg) => {

    if(msg.from == 'DIR_QUEUE'){
        console.log("Message: "+msg.details+" Topic: "+msg.topic);

        child = fork('./consumidor.js', [msg.dir]);

    }

});







function get_direction_queue(){
    return 'http://localhost:3002';
}