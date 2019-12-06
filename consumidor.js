'use strict'
//requiriendo dependencias

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
const process = require('process');
var MsgSender = require('./utilities/msgSender.js');

var clientManager = new ClientManager(config.router_endpoint+config.router_port);
var socket_router = clientManager.get_client_socket();
var socket_nodo_datos;
var msgSender = new MsgSender();

socket_router.on('connect', function (socket) {
    console.log('Consumidor conectado a Router!');
    var topicASubscribir = process.argv[2];
    subscribePromise(topicASubscribir, "SUBSCRIBER", socket_router).then(resp => {

        console.log("Consumidor se quiere subscribir a topic "+topicASubscribir);
    });
    

});




socket_router.on('HANDSHAKE', function (from) {
         if (from == 'ENDPOINT') {

            socket_router.on('MESSAGE', (endpoint) => {
                console.log("Endpoint recibido de router: "+endpoint);
                connectToNodePromise(endpoint).then(socket => {

                    socket_nodo_datos = socket;
                });

    

            });
        }

});


socket_nodo_datos.on('connection', function (socket){
    console.log('Client '+socket.id+ ' connected!');
 
   socket.on('HANDSHAKE', function (from) {
     console.log(from+ ' connected!');

     if (from == 'PRODUCER-from-datos') {

        socket.on('MESSAGE', (msg) => {
        console.log("Message: "+msg.details+" Topic: "+msg.topic);
        writePromise(msg).then((resp) => {
          console.log("mensaje del productor atendido");

        }).catch((err) => {

            console.log(err);
        })

        })
     }
   });
 
 });



 function subscribePromise (topicASubscribir, handshake, socket_router) {

    return new Promise((resolve, reject) => {

        msgSender.send(topicASubscribir, handshake, socket_router);
        resolve("Done");


    });

    
 }


 function connectToNodePromise(endpoint) {

    return new Promise((resolve, reject) => {

        var clientManager = new ClientManager(endpoint);
        var socket_nodo = clientManager.get_client_socket();
        resolve(socket_nodo);
    });
 }





