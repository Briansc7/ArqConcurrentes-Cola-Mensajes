'use strict'
//requiriendo dependencias 

var ClientManager = require('./utilities/clientManager.js');
var clientManager = new ClientManager('http://localhost:3001');
var socket_orquestador = clientManager.get_client_socket();

var ServerManager = require('./utilities/serverManager.js');
var serverManager = new ServerManager(3000);
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

     if (from == 'PRODUCER') {

        socket.on('MESSAGE', (msg) => {
        console.log("Message: "+msg.details+" Topic: "+msg.topic);
        writePromise(msg, 'PRODUCER', socket_orquestador).then((resp) => {
          console.log("Mensaje enviado al nodo correspondiente segun Topic");

        }).catch((err) => {

            console.log(err);
        })

        })
     }

     if (from == 'SUBSCRIBER'){
         socket.on('MESSAGE', (msg) => {
             console.log("Message: "+msg.details+" Topic: "+msg.topic);
             socket_consumidor = socket;
             writePromise(msg, 'SUBSCRIBER', socket_orquestador).then((resp) => {
                 console.log("Mensaje de suscripcion enviado al orquestador");

             }).catch((err) => {

                 console.log(err);
             })

         })
     }

       if (from == 'DIR_QUEUE'){
           socket.on('MESSAGE', (msg) => {
               console.log("Message: "+msg.details+" Topic: "+msg.topic);
               writePromise(msg, 'DIR_QUEUE', socket_consumidor).then((resp) => {
                   console.log("Mensaje de suscripcion enviado al orquestador");

               }).catch((err) => {

                   console.log(err);
               })

           })
       }

   });
 
 });

// Add a connect listener
socket_orquestador.on('connect', function (socket_orquestador) {
    console.log('Connected!');

});

 function writePromise (msg, handshake, socket) {

    return new Promise((resolve, reject) => {
        //send(msg);
        msgSender.send(msg, handshake, socket);
        resolve("write promise done");


    });

    
 }
