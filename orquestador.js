'use strict'
//requiriendo dependencias 

var ClientManager = require('./clientManager.js');
var clientManager = new ClientManager('http://localhost:3002');
var socket_nodo_datos = clientManager.get_client_socket();

var ServerManager = require('./serverManager.js');
var serverManager = new ServerManager(3001);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var message_queue = []

var hashmap_queue = {}

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
        writePromise(msg).then((resp) => {
          console.log("Mensaje enviado al nodo correspondiente segun Topic");

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


  function writePromise (msg) {

     return new Promise((resolve, reject) => {
         send(msg);
         resolve("write promise done");


     });


  }

 function send(message) {
     socket_nodo_datos.emit('HANDSHAKE', 'PRODUCER');
     socket_nodo_datos.emit('MESSAGE', message);
     console.log("Message sent to server");

 }

 function get_direction_queue(topic){
      return hashmap_queue[topic];
 }
