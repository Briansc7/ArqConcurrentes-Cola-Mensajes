'use strict'
//requiriendo dependencias 

var ServerManager = require('./serverManager.js');

var serverManager = new ServerManager(3002);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

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
        writePromise(msg).then((resp) => {
          console.log("Mensaje enviado al nodo correspondiente segun Topic");

        }).catch((err) => {

            console.log(err);
        })

        })
     }
     else if(from == 'CONSUMER'){
         socket.on('MESSAGE', (msg) => {
             console.log("Message: "+msg.details+" Topic: "+msg.topic);
             writePromise2(message2).then((resp) => {
                 console.log("Mensaje enviado al consumidor");

             }).catch((err) => {

                 console.log(err);
             })

         })
       }
   });
 
 });
/*
  // Add a connect listener
  socket_consumidor.on('connect', function (socket_consumidor) {
      console.log('Connected!');

  });*/


 function writePromise (msg) {

    return new Promise((resolve, reject) => {
        send(msg);
        resolve("write promise done");


    });
 }

function writePromise2 (msg) {

    return new Promise((resolve, reject) => {
        send2(msg);
        resolve("write promise done");


    });
}

function send(message) {
    io.emit('HANDSHAKE', 'PRODUCER');
    io.emit('MESSAGE', message);
    console.log("Message sent to server");

}

var message2 = {
    details: "mensaje de nodo datos",
    date: new Date(),
    topic: 'Alerts'
}

function send2(message) {
    io.emit('HANDSHAKE', 'COLA');
    io.emit('MESSAGE', message);
    console.log("Message sent to server");

}
