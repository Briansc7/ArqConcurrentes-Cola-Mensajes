'use strict'
//requiriendo dependencias 
const express = require('express');
const socketio = require('socket.io');
const http = require('http');
var ClientManager = require('./clientManager.js');
var ServerManager = require('./serverManager.js');

var io_client = require('socket.io-client');


/*
const app = express()//instancia de express
const server = http.createServer(app)//creando el server con http y express como handle request
const io = socketio(server)//iniciando el server de socket.io
const PORT = process.env.PORT || 3002

 */



//var socket_consumidor = io_client.connect('http://localhost:3003', {reconnect: true});

var clientManager = new ClientManager('http://localhost', 3003);
var socket_consumidor = clientManager.get_client_socket();

var serverManager = new ServerManager('http://localhost', 3002);
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
   });
 
 });

  // Add a connect listener
  socket_consumidor.on('connect', function (socket_consumidor) {
      console.log('Connected!');

  });


 function writePromise (msg) {

    return new Promise((resolve, reject) => {
        send(msg);
        resolve("write promise done");


    });


 }

function send(message) {
    socket_consumidor.emit('HANDSHAKE', 'PRODUCER');
    socket_consumidor.emit('MESSAGE', message);
    console.log("Message sent to server");

}
