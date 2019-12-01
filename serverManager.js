var method = ServerManager.prototype;
//requiriendo dependencias
const express = require('express')
const socketio = require('socket.io')
const http = require('http')

function ServerManager(url, port){
    this.app = express()//instancia de express
    this.server = http.createServer(app)//creando el server con http y express como handle request
    this.io = socketio(server)//iniciando el server de socket.io
    this.PORT = process.env.PORT || port
}

module.exports = ServerManager;