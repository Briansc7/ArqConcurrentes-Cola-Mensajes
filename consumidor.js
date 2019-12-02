'use strict'
//requiriendo dependencias

var ClientManager = require('./clientManager.js');
var clientManager = new ClientManager('http://localhost:3002');
var socket_nodo_datos = clientManager.get_client_socket();

var MsgSender = require('./msgSender.js');
var msgSender = new MsgSender();


var message_queue = []

socket_nodo_datos.on('connect', function (socket_nodo_datos) {
    console.log('Connected!');
    send();

});


socket_nodo_datos.on('HANDSHAKE', function (from) {
        console.log(from+ ' connected!');

        if (from == 'COLA') {

            socket_nodo_datos.on('MESSAGE', (msg) => {
                console.log("Message: "+msg.details+" Topic: "+msg.topic);
                writePromise(msg).then((resp) => {
                    console.log("Mensaje recibido de nodo datos");

                }).catch((err) => {

                    console.log(err);
                })

            })
        }

});


socket_nodo_datos.on('connection', function (socket){
    console.log('Client '+socket.id+ ' connected!');
 
   socket.on('HANDSHAKE', function (from) {
     console.log(from+ ' connected!');

     if (from == 'PRODUCER') {

        socket.on('MESSAGE', (msg) => {
        console.log("Message: "+msg.details+" Topic: "+msg.topic);
        writePromise(msg).then((resp) => {
          console.log("mensaje del productor atendido");

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

 function get_direction_queue(){
     return 'http://localhost:3002';
 }

var message = {
    details: "mensaje de consumidor",
    date: new Date(),
    topic: 'Alerts'
}

function send() {
    /*socket_nodo_datos.emit('HANDSHAKE', 'CONSUMER');
    socket_nodo_datos.emit('MESSAGE', message);
    console.log("Message sent to server");*/

    msgSender.send(message, 'CONSUMER', socket_nodo_datos)

}
