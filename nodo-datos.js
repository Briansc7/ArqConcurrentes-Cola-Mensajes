'use strict'
//requiriendo dependencias 

var ServerManager = require('./utilities/serverManager.js');
var config = require('./config/config.json');

var serverManager = new ServerManager(config.nodo_datos_port);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var socket_consumer;

var message_queue = [];

//corriendo el servidor
server.listen(PORT, () => {
  console.log(`Server running in http://localhost:${PORT}`)
})

io.on('connection', function (socket){
    console.log('Client '+socket.id+ ' connected!');

    socket.on('MESSAGE', (msg) => {
        switch(msg.from){
            case 'PRODUCER-from-orquestador':
                console.log("Message: "+msg.details+" Topic: "+msg.topic);
                writePromise(msg, 'PRODUCER-from-datos', socket_consumer).then((resp) => {
                    console.log("Mensaje enviado al nodo correspondiente segun Topic");

                }).catch((err) => {

                    console.log(err);
                });
                break;
            case 'CONSUMER':
                socket_consumer = socket;
                console.log("Message: "+msg.details+" Topic: "+msg.topic);
                var message2 = {
                    from: 'COLA-from-nodo-datos',
                    details: "mensaje de nodo datos",
                    date: new Date(),
                    topic: 'Alerts'
                };
                writePromise(message2, 'COLA', socket).then((resp) => {
                    console.log("Mensaje enviado al consumidor");

                }).catch((err) => {

                    console.log(err);
                })
                break;
        }

    });

 });



 function writePromise (msg, handshake, socket) {

    return new Promise((resolve, reject) => {
        //send(msg, socket);
        msgSender.send(msg,handshake, socket);
        resolve("write promise done");


    });
 }

