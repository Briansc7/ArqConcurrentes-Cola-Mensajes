'use strict'
//requiriendo dependencias 

// ROUTER RECIBE MENSAJES DE:
// 1) Productor --> reenvia al Orquestador un mensaje que tiene Topic y Contenido
// 2) Consumidor --> reenvia al Orquestador el Topic al cual se quiere subscribir
// 3) Orquestador --> recibe mensaje de respuesta con el Endpoint del nodo al cual se tiene que conectar el Consumidor

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
var clientManager = new ClientManager(config.orquestador_endpoint + config.orquestador_port);
var socket_orquestador = clientManager.get_client_socket();
var socket_consumidor;

var ServerManager = require('./utilities/serverManager.js');
var serverManager = new ServerManager(config.router_port);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

//corriendo el servidor
server.listen(PORT, () => {

    console.log(`Server running in http://localhost:${PORT}`)
});

// Add a connect listener
socket_orquestador.on('connect', function (socket_orquestador) {

    console.log('Router Conectado a Orquestador!');

});

io.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');

    socket.on('PRODUCER', function (msg) {
            console.log('Productor conectado!');
            console.log("Message: " + msg.details + " Topic: " + msg.topic);
            writePromise(msg, 'PRODUCER-from-router', socket_orquestador).then((resp) => {
                console.log("Router envio mensaje de Productor al Orquestador!");


            }).catch((err) => {

                console.log(err);
            })


        },



        socket.on('SUBSCRIBER', (topic) => {
            console.log("Consumidor conectado!");
            console.log("Topic: " + topic);

            socket_consumidor = socket;//estoy hay que mejorarlo, quizas ponerlo en el mensaje que viaja para saber a quien responder
        
            writePromise(topic, 'SUBSCRIBER-from-router', socket_orquestador).then((resp) => {
                console.log("Mensaje de suscripcion enviado al orquestador");

            }).catch((err) => {

                console.log(err);
            });


            
            
          



        }));


       

       








});


socket_orquestador.on('ENDPOINT', function (endpoint) {
    console.log("Endpoint de Orquestador recibido!");
    console.log(endpoint);



    writePromise(endpoint, 'ENDPOINT', socket_consumidor).then((resp) => {
        console.log("Endpoint enviado al Consumidor!");

    }).catch((err) => {

        console.log(err);
    })


});







function writePromise(msg, messageId, socket) {

    return new Promise((resolve, reject) => {
        
        msgSender.send(msg, messageId, socket);
        resolve("Done");



    });


}