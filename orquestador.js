'use strict'
//requiriendo dependencias 

var ClientManager = require('./utilities/clientManager.js');
var clientManager = new ClientManager('http://localhost:3002');
var socket_nodo_datos = clientManager.get_client_socket();

var ServerManager = require('./utilities/serverManager.js');
var serverManager = new ServerManager(3001);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var hashmap_queue = {};

hashmap_queue['Alerts'] = 'http://localhost:3002';

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
        writePromise(msg, 'PRODUCER', socket_nodo_datos).then((resp) => {
          console.log("Mensaje enviado al nodo correspondiente segun Topic");

        }).catch((err) => {

            console.log(err);
        })

        })
     }

       if (from == 'SUBSCRIBER') {

           socket.on('MESSAGE', (msg) => {
               console.log("Message: "+msg.details+" Topic: "+msg.topic);

               var msg_dir_queue = {
                   details: "respuesta direccion cola",
                   date: new Date(),
                   dir: ""
               };

               msg_dir_queue.dir = get_direction_queue(msg.topic);

               writePromise(msg_dir_queue, 'DIR_QUEUE', socket).then((resp) => {
                   console.log("Mensaje de retorno enviado al Router con el Endpoint");

               }).catch((err) => {

                   console.log(err);
               })

           })
       }
   });
 
 });

 // Add a connect listener
 socket_nodo_datos.on('connect', function (socket_nodo_datos) {
     console.log('Connected!');

 });


  function writePromise (msg, handshake, socket) {

     return new Promise((resolve, reject) => {
         //send(msg, handshake, socket);
         msgSender.send(msg, handshake, socket);
         resolve("write promise done");


     });


  }



 function get_direction_queue(topic){
      return hashmap_queue[topic];
 }
