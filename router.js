'use strict'
//requiriendo dependencias 

// ROUTER RECIBE MENSAJES DE:
// 1) Productor --> reenvia al Orquestador un mensaje que tiene Topic y Contenido
// 2) Consumidor --> reenvia al Orquestador el Topic al cual se quiere subscribir
// 3) Orquestador --> recibe mensaje de respuesta con el Endpoint del nodo al cual se tiene que conectar el Consumidor

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');

var clientManager1 = new ClientManager(config.orquestador1_endpoint + config.orquestador1_port);
var socket_orquestador1 = clientManager1.get_client_socket();
var orquestador1_conectado = false;

var clientManager2 = new ClientManager(config.orquestador2_endpoint + config.orquestador2_port);
var socket_orquestador2 = clientManager2.get_client_socket();
var orquestador2_conectado = false;

var socket_orquestador_principal = null;


var socket_consumidor_Map = new Map();

var ServerManager = require('./utilities/serverManager.js');
var serverManager = new ServerManager(config.router_port);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

const http_port = config.router_create_queue_port;
const app_rest = serverManager.get_app_rest();

app_rest.listen(http_port, () => {

    console.log("Escuchando en el puerto "+ http_port + " para la API de creacion de colas");
});

app_rest.post('/queue', (req, res) => {
    //res.status(200).send({response: "API OK!" });
    console.log(`Recibido pedido de creacion de cola, Topic: ${req.body.topic}, Modo: ${req.body.mode}, MaxSize: ${req.body.maxsize}, Nodo de datos: ${req.body.datanode}`);
    //por el momento lo agregamos al nodo de datos 1
    var msg = {
        details: 'Pedido de creacion de cola',
        topic: req.body.topic,
        mode: req.body.mode,
        maxSize: req.body.maxSize,
        datanode: req.body.datanode

    };

    if (req.body.datanode === "nodo_datos1" || req.body.datanode === "nodo_datos2" ){
        writePromise(msg,'CREATE-QUEUE',socket_orquestador_principal).then(() => {
            console.log("Pedido de creacion de cola enviado al orquestador");//se podria esperar a tener una respuesta del nodo de datos para darlo por exitoso
            res.status(200).send(req.body);
        }).catch((err) => {

            console.log(err);
        });
    }
    else{
        console.log("Nodo de datos invalido");
        res.status(404).send({
            error: 'Nodo de datos invalido'
        });
    }

});

//corriendo el servidor
server.listen(PORT, () => {

    console.log(`Servidor del router escuchando en el puerto ${PORT}`)
});

// Add a connect listener
socket_orquestador1.on('connect', function (socket_orquestador) {

    console.log('Router Conectado a Orquestador1!');
    orquestador1_conectado = true;
    decidir_socket_orquestador_principal();

});

socket_orquestador2.on('connect', function (socket_orquestador) {

    console.log('Router Conectado a Orquestador2!');
    orquestador2_conectado = true;
    decidir_socket_orquestador_principal();

});

socket_orquestador1.on('disconnect', function (socket_orquestador) {

    console.log('Se desconecto el Orquestador1!');
    orquestador1_conectado = false;
    decidir_socket_orquestador_principal();

});

socket_orquestador2.on('disconnect', function (socket_orquestador) {

    console.log('Se desconecto el Orquestador2!');
    orquestador2_conectado = false;
    decidir_socket_orquestador_principal();

});

function decidir_socket_orquestador_principal(){
    //se decide como orquestador principal el primero en conectarse
    //Luego de decidir el orquestador principal, si se conecta el otro orquestador, no se debe cambiar de orquestador
    //Solo debe haber cambio de orquestador principal cuando se cae el orquestador principal y el otro esta conectado
    //Solamente cuando hay cambio de orquestador, es decir no cuando se elige el orq. principal la primera vez,
    // se debe enviar pedido de recargar las variables en memoria del nuevo orquestador principal por si esta desactualizado
    if(orquestador1_conectado && (orquestador2_conectado === false)){

        if(socket_orquestador_principal !== socket_orquestador1){

            if(socket_orquestador_principal != null){
                writePromise({reason: "Cambio de orquestador principal"}, 'RELOAD', socket_orquestador1)
            }

            socket_orquestador_principal = socket_orquestador1;
            console.log('Orquestador1 elegido como principal!');
        }

    }

    if(orquestador2_conectado && (orquestador1_conectado === false)){

        if(socket_orquestador_principal !== socket_orquestador2){

            if(socket_orquestador_principal != null){
                writePromise({reason: "Cambio de orquestador principal"}, 'RELOAD', socket_orquestador2)
            }

            socket_orquestador_principal = socket_orquestador2;
            console.log('Orquestador2 elegido como principal!');
        }

    }
}


io.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');

    socket.on('PRODUCER', function (msg) {
            console.log('Productor conectado!');
            console.log("Message: " + msg.details + " Topic: " + msg.topic);
            writePromise(msg, 'PRODUCER-from-router', socket_orquestador_principal).then((resp) => {
                console.log("Router envio mensaje de Productor al Orquestador!");


            }).catch((err) => {

                console.log(err);
            })


        },



        socket.on('SUBSCRIBER', (topic) => {
            console.log("Consumidor conectado!");
            console.log("Topic: " + topic);

            //guardo en un map el socket al cual responder, y solo se manda el id del socket en el mensaje
            socket_consumidor_Map.set(socket.id, socket);

            var msg = {
                topic: topic,
                socket_consumidor: socket.id
            };
        
            writePromise(msg, 'SUBSCRIBER-from-router', socket_orquestador_principal).then((resp) => {
                console.log("Mensaje de suscripcion enviado al orquestador");

            }).catch((err) => {

                console.log(err);
            });



        }));





});


function devolverEndpointAlConsumidor(msg) {
    console.log("Endpoint de Orquestador recibido!");
    console.log(msg.endpoint);

    var socket_consumidor = socket_consumidor_Map.get(msg.socket_consumidor);
    socket_consumidor_Map.delete(msg.socket_consumidor);

    writePromise(msg.endpoint, 'ENDPOINT', socket_consumidor).then((resp) => {
        console.log("Endpoint enviado al Consumidor!");

    }).catch((err) => {

        console.log(err);
    })
}

socket_orquestador1.on('ENDPOINT', function (msg) {


    devolverEndpointAlConsumidor(msg);

});

socket_orquestador2.on('ENDPOINT', function (msg) {


    devolverEndpointAlConsumidor(msg);

});






function writePromise(msg, messageId, socket) {

    return new Promise((resolve, reject) => {
        
        msgSender.send(msg, messageId, socket);
        resolve("Done");



    });


}