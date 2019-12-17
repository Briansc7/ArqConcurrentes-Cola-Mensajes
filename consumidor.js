'use strict'
//requiriendo dependencias

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
const process = require('process');
var MsgSender = require('./utilities/msgSender.js');

var clientManager = new ClientManager(config.router_endpoint + config.router_port);
var socket_router = clientManager.get_client_socket();
var socket_nodo_datos;
var topicASubscribir;
var msgSender = new MsgSender();

var ya_se_recibio_endpoint = false;

socket_router.on('connect', function (socket) {
    console.log('Consumidor conectado a Router!');
    topicASubscribir = process.argv[2];

    if(ya_se_recibio_endpoint === false){
        subscribeToRouterPromise(topicASubscribir, "SUBSCRIBER", socket_router).then(resp => {

            console.log("Consumidor se quiere subscribir a topic " + topicASubscribir);
        });
    }



});





socket_router.on('ENDPOINT', function (endpoint) {
   console.log("Endpoint recibido de router: " + endpoint);
    ya_se_recibio_endpoint = true;
    connectToNodePromise(endpoint).then(socket => {

        socket_nodo_datos = socket;

        socket_nodo_datos.on('connect', function (socket) {
    

          
        
            subscribeToNodePromise('SUBSCRIBER').then(() => {

                console.log("Consumidor se subscribio a topic "+topicASubscribir);


            })
        
        });

          socket_nodo_datos.on('QUEUE_MESSAGE', function (msg) {
                console.log('Mensaje recibido de Nodo de datos!');
                console.log("Mensaje: "+msg);
               // console.log("Message: " + msg.details + " Topic: " + msg.topic);
                       
        
                
            });


    });



});







function subscribeToRouterPromise(topicASubscribir, messageId, socket_router) {

    return new Promise((resolve, reject) => {

        msgSender.send(topicASubscribir, messageId, socket_router);
        resolve("Done");


    });


}


function subscribeToNodePromise(messageId) {

    return new Promise((resolve, reject) => {

        msgSender.send(topicASubscribir, messageId, socket_nodo_datos);
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





