var method = ServerManager.prototype;
//requiriendo dependencias
const express = require('express')
const socketio = require('socket.io')
const http = require('http')

function ServerManager(url, port){
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

module.exports = ServerManager;