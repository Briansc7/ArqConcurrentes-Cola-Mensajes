'use strict'
//requiriendo dependencias

var ClientManager = require('./utilities/clientManager.js');

const process = require('process');
var clientManager = new ClientManager(process.argv[2]);

var socket_nodo_datos = clientManager.get_client_socket();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var message_queue = [];


socket_nodo_datos.on('connect', function (socket) {
    console.log('Connected!');

    var message = {
        details: "mensaje de consumidor",
        date: new Date(),
        topic: 'Alerts'
    };

    msgSender.send(message, 'CONSUMER', socket_nodo_datos);

});







socket_nodo_datos.on('MESSAGE', (msg) => {

    switch (msg.from){
        case 'COLA':
            console.log("Message: "+msg.details+" Topic: "+msg.topic);
            writePromise(msg).then((resp) => {
                console.log("Mensaje recibido de nodo datos");

            }).catch((err) => {

                console.log(err);
            });
            break;
            case 'PRODUCER-from-datos':
                console.log("Message: "+msg.details+" Topic: "+msg.topic);
                writePromise(msg).then((resp) => {
                    console.log("mensaje del productor atendido");

                }).catch((err) => {

                    console.log(err);
                });
                break;

    }

});




socket_nodo_datos.on('connection', function (socket){
    console.log('Client '+socket.id+ ' connected!');
 });



 function writePromise (msg) {

    return new Promise((resolve, reject) => {

        resolve("write promise done");


    });

    
 }





