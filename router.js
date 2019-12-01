'use strict'
//requiriendo dependencias 

var ClientManager = require('./clientManager.js');
var clientManager = new ClientManager('http://localhost:3001');
var socket_orquestador = clientManager.get_client_socket();

var ServerManager = require('./serverManager.js');
var serverManager = new ServerManager(3000);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var message_queue = []

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
socket_orquestador.on('connect', function (socket_orquestador) {
    console.log('Connected!');

});

 function writePromise (msg) {

    return new Promise((resolve, reject) => {
        send(msg);
        resolve("write promise done");


    });

    
 }

function send(message) {
    socket_orquestador.emit('HANDSHAKE', 'PRODUCER');
    socket_orquestador.emit('MESSAGE', message);
    console.log("Message sent to server");

}