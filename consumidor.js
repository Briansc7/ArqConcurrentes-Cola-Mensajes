'use strict'
//requiriendo dependencias 

var ServerManager = require('./serverManager.js');
var serverManager = new ServerManager('http://localhost', 3003);
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


 function writePromise (msg) {

    return new Promise((resolve, reject) => {

        resolve("write promise done");


    });

    
 }
