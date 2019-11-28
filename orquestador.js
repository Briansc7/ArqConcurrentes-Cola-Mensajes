'use strict'
//requiriendo dependencias 
const express = require('express')
const socketio = require('socket.io')
const http = require('http')

var io_client = require('socket.io-client');

const app = express()//instancia de express
const server = http.createServer(app)//creando el server con http y express como handle request
const io = socketio(server)//iniciando el server de socket.io
const PORT = process.env.PORT || 3001

var socket_nodo_datos = io_client.connect('http://localhost:3002', {reconnect: true});

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
