var method = ServerManager.prototype;
//requiriendo dependencias
const express = require('express');
const socketio = require('socket.io');
const http = require('http');
var app_rest = express();
app_rest.use(express.json());

function ServerManager(port){
    this.app = express()//instancia de express
    this.server = http.createServer(this.app)//creando el server con http y express como handle request
    this.io = socketio(this.server)//iniciando el server de socket.io
    this.PORT = process.env.PORT || port
}

method.get_io = function(){
    return this.io;
};

method.get_server = function(){
    return this.server;
};

method.get_port = function(){
    return this.PORT;
};

method.get_app_rest = function(){
    return app_rest;
}

module.exports = ServerManager;