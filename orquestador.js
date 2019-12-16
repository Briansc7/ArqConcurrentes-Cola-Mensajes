'use strict'
//requiriendo dependencias 

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
const editJsonFile = require("edit-json-file");
let file = editJsonFile('./config/config.json');
const process = require('process');
var orquestador_name = process.argv[2];

var clientManager1 = new ClientManager(config.nodo_datos1.endpoint + config.nodo_datos1.port);
var socket_nodo_datos1 = clientManager1.get_client_socket();
var clientManager2 = new ClientManager(config.nodo_datos2.endpoint + config.nodo_datos2.port);
var socket_nodo_datos2 = clientManager2.get_client_socket();

var ServerManager = require('./utilities/serverManager.js');
var serverManager = new ServerManager(getOrquestadorPort(orquestador_name));
const io = serverManager.get_io();
const PORT = serverManager.get_port();

const server = serverManager.get_server();


//corriendo el servidor
server.listen(PORT, () => {
    console.log(`Server running in http://localhost:${PORT}`)
});



var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var topics;
var datanodeEndpoints;
var datanodeNames = ["nodo_datos1", "nodo_datos2"];
var topicsNames = [];
reloadConfigToMemory();




io.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');

    socket.on('PRODUCER-from-router', function (msg) {
        console.log('Productor conectado desde Router!');
        // MENSAJE DE PRODUCER PARA ESCRIBIR

        console.log("Message: " + msg.details + " Topic: " + msg.topic);
        // aca enviar mensaje al Nodo segun topic. Y despues mandar replica de mensaje al otro Nodo
        //Por el momento no mandamos la replica

        //comprobar que el topic es valido
        if(topicsNames.includes(msg.topic) === false){
            console.log("No existe el topic: "+ msg.topic);
            return;
        }

        //obtener el datanode correspondiente al topic
        var datanodeConTopic = topics.get(msg.topic);

        var socket_nodo_datos_con_topic = null;

        if(datanodeConTopic === "nodo_datos1"){
            socket_nodo_datos_con_topic = socket_nodo_datos1;
        }

        if(datanodeConTopic === "nodo_datos2"){
            socket_nodo_datos_con_topic = socket_nodo_datos2;
        }

        //comprobar a cual nodo de datos pertenece el topic
        //file = editJsonFile('./config/config.json'); //recargo el json

        if(socket_nodo_datos_con_topic == null){
            console.log("No existe el topic");
        }
        else{
            writePromise(msg, 'PRODUCER-from-orquestador', socket_nodo_datos_con_topic).then((resp) => {
                console.log("Mensaje enviado al nodo correspondiente segun Topic");

            }).catch((err) => {


                console.log(err);
            });
        }






    });


        socket.on('SUBSCRIBER-from-router', (topic) => {
            console.log("Consumidor conectado desde Router!");
            console.log("Topic: " + topic);
            // aca devolver el Endpoint del Nodo al Router para que este se lo devuelva al Consumer
            var endpoint = getDatanodeEnpointOfTopic(topic);
            console.log(endpoint);
            if (endpoint != null) {
            writePromise(endpoint, 'ENDPOINT', socket).then((resp) => {
                console.log("Mensaje de retorno enviado al Router con el Endpoint");

            }).catch((err) => {

                console.log(err);
            })

        } else {

        msgSender.send("El topic al cual se quiere subscribir no existe!", "ERROR", socket);

        }

        });

    socket.on('CREATE-QUEUE', (pedido_queue) => {


        console.log(`Recibido pedido de creacion de cola, Topic: ${pedido_queue.topic}, Modo: ${pedido_queue.mode}, MaxSize: ${pedido_queue.maxSize}, Nodo de datos: ${pedido_queue.datanode}`);
        //por el momento lo agregamos al nodo de datos 1
        var msg = {
            details: 'Pedido de creacion de cola',
            topic: pedido_queue.topic,
            mode: pedido_queue.mode,
            maxSize: pedido_queue.maxSize,

        };

        //compruebo que el datanode es valido
        if(datanodeNames.includes(pedido_queue.datanode) === false){
            console.log("datanode invalido");
            return;
        }

        var socket_nodo_datos = null;
        if (pedido_queue.datanode === "nodo_datos1")
            socket_nodo_datos = socket_nodo_datos1;
        if (pedido_queue.datanode === "nodo_datos2")
            socket_nodo_datos = socket_nodo_datos2;
        if (socket_nodo_datos != null && topics.get(pedido_queue.topic)==null){
            writePromise(msg,'CREATE-QUEUE',socket_nodo_datos).then(() => {
                console.log("Pedido de creacion de cola enviado al nodo de datos");//se podria esperar a tener una respuesta del nodo de datos para darlo por exitoso
                topics.set(pedido_queue.topic, pedido_queue.datanode);
                console.log(topics);
            }).catch((err) => {

                console.log(err);
            });
        }
        else{
            console.log("Nodo de datos invalido o topic ya existe");
        }

    });


    socket.on('RELOAD', (msg) => {
        //pedido de recargar las variables de memoria porque cambio algo en config.json
        console.log("variables en memoria reacargadas debido a: "+msg.reason);
        reloadConfigToMemory();
    });
       


});

// Add a connect listener
socket_nodo_datos1.on('connect', function (socket_nodo_datos) {
    console.log('Orquestador conectado a nodo_datos1!');
});

socket_nodo_datos1.on('RELOAD', (msg) => {
    //pedido de recargar las variables de memoria porque cambio algo en config.json
    console.log("variables en memoria reacargadas debido a: "+msg.reason);
    reloadConfigToMemory();
});

socket_nodo_datos2.on('connect', function (socket_nodo_datos) {
    console.log('Orquestador conectado a nodo_datos2!');
});

socket_nodo_datos2.on('RELOAD', (msg) => {
    //pedido de recargar las variables de memoria porque cambio algo en config.json
    console.log("variables en memoria reacargadas debido a: "+msg.reason);
    reloadConfigToMemory();
});


function writePromise(msg, messageId, socket) {

    return new Promise((resolve, reject) => {
        //send(msg, handshake, socket);
        msgSender.send(msg, messageId, socket);
        resolve("write promise done");


    });


}


function get_direction_queue(topic) {
    return hashmap_queue[topic];
}



function initTopics() {
    var topics = new Map();

    datanodeNames.forEach(datanodeName => {
        getDatanodeTopicsFromConfig(datanodeName).forEach(topic => {
            topics.set(topic.topic, datanodeName);
        });
    });

    console.log("ORQUESTADOR INICIADO");
    console.log(topics);

    return topics;

}

function getDataNodeTopicsMap(dataNodeName){
    //obtiene los topics de un datanode de memoria
    var topicsDatanode = new Map();

    topicsNames.forEach(topic => {
        //comapara el si topic pertenece a ese datanode
        if(topics.get(topic) === dataNodeName)
        {
            topicsDatanode.set(topic, dataNodeName);
        }

    });

    return topicsDatanode;
}


function getOrquestadorPort(orquestadorName){
    return JSON.stringify(
        file.get(orquestadorName+"_port")
    );
}

function getDatanodeEndpoint(dataNodeName){
    //obtiene el endpoint y port  de un datanode de memoria
    return datanodeEndpoints.get(dataNodeName);
}

function getDatanodeEnpointOfTopic(topic){
    return getDatanodeEndpoint(topics.get(topic));
}

function initDatanodeEnpoints(){
    var endpoints = new Map();
    datanodeNames.forEach(datanodeName => {
        endpoints.set(datanodeName,
            file.get(datanodeName+".endpoint")+
            JSON.stringify(file.get(datanodeName+".port"))
        );
        }

    );
    return endpoints;
}

function getDatanodeTopicsFromConfig(datanodeName){
    //obtiene los topics de un datanode de disco
    return file.get(datanodeName+".topics");
}

function reloadConfigToMemory(){
    file = editJsonFile('./config/config.json'); //recargo el json
    //actualizo las variables en memoria
    topics = initTopics();
    datanodeEndpoints = initDatanodeEnpoints();
    reloadTopicsNames();

}

function reloadTopicsNames(){
    topicsNames = [];
    datanodeNames.forEach(datanodeName => {
            getDatanodeTopicsFromConfig(datanodeName).forEach(topic => {
                    topicsNames.push(topic.topic);
                }

            );
        }
    )
}

