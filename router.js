'use strict'
//requiriendo dependencias 

// ROUTER RECIBE MENSAJES DE:
// 1) Productor --> reenvia al Orquestador un mensaje que tiene Topic y Contenido
// 2) Consumidor --> reenvia al Orquestador el Topic al cual se quiere subscribir
// 3) Orquestador --> recibe mensaje de respuesta con el Endpoint del nodo al cual se tiene que conectar el Consumidor

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
var clientManager = new ClientManager(config.orquestador_endpoint+config.orquestador_port);
var socket_orquestador = clientManager.get_client_socket();

var ServerManager = require('./utilities/serverManager.js');
var serverManager = new ServerManager(config.router_port);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var socket_consumidor;

var message_queue = [];

//corriendo el servidor
server.listen(PORT, () => {
  console.log(`Server running in http://localhost:${PORT}`)
})

io.on('connection', function (socket){
    console.log('Client '+socket.id+ ' connected!');
 
   socket.on('HANDSHAKE', function (from) {
     console.log(from+ ' connected!');
     // MENSAJE DE PRODUCER PARA ESCRIBIR
     if (from == 'PRODUCER') {

        socket.on('MESSAGE', (msg) => {
        console.log("Message: "+msg.details+" Topic: "+msg.topic);
        writePromise(msg, 'PRODUCER-from-router', socket_orquestador).then((resp) => {
          console.log("Router envio mensaje de Productor al Orquestador!");
          

        }).catch((err) => {

            console.log(err);
        })

        })
     }
      // MENSAJE DE CONSUMER PARA SUBSCRIBIRSE
     if (from == 'SUBSCRIBER'){
         socket.on('MESSAGE', (msg) => {
             console.log("Topic: "+msg.topic);
             socket_consumidor = socket;
             writePromise(msg, 'SUBSCRIBER', socket_orquestador).then((resp) => {
                 console.log("Mensaje de suscripcion enviado al orquestador");

             }).catch((err) => {

                 console.log(err);
             })



         })
     }
        // MENSAJE DE ORQUESTADOR CON EL ENDPOINT A DONDE SE TIENE QUE CONECTAR EL CONSUMER
       /*if (from == 'DIR_QUEUE'){
           socket.on('MESSAGE', (msg) => {
               
               writePromise(msg, 'DIR_QUEUE', socket_consumidor).then((resp) => {
                   console.log("Endpoint enviado al Consumidor!");

               }).catch((err) => {

                   console.log(err);
               })

           })
       }*/

   });
 
 });

socket_orquestador.on('HANDSHAKE', function (from) {
    console.log(from+ ' connected!');

    if (from == 'DIR_QUEUE'){
        socket_orquestador.on('MESSAGE', (msg) => {
            console.log("Message: "+msg.details+" Endpoint de Topic: "+msg.dir);
            writePromise(msg, 'DIR_QUEUE', socket_consumidor).then((resp) => {
                console.log("Endpoint enviado al Consumidor!");

            }).catch((err) => {

                console.log(err);
            })

        })
    }
});

// Add a connect listener
socket_orquestador.on('connect', function (socket_orquestador) {
    console.log('Router Conectado a Orquestador!');

});

 function writePromise (msg, handshake, socket) {

   return new Promise((resolve, reject) => {
        //send(msg);
        msgSender.send(msg, handshake, socket);
        resolve("Router envio mensaje a Orquestador!");


    });

    
 }
