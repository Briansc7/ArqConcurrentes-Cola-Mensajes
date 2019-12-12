'use strict'
//requiriendo dependencias 

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
const editJsonFile = require("edit-json-file");
let file = editJsonFile('./config/config.json');

var clientManager1 = new ClientManager(config.nodo_datos1.endpoint + config.nodo_datos1.port);
var socket_nodo_datos1 = clientManager1.get_client_socket();
var clientManager2 = new ClientManager(config.nodo_datos2.endpoint + config.nodo_datos2.port);
var socket_nodo_datos2 = clientManager2.get_client_socket();

var ServerManager = require('./utilities/serverManager.js');
var serverManager = new ServerManager(config.orquestador_port);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const http_port = 8080;
const server = serverManager.get_server();
const app_rest = serverManager.get_app_rest();

app_rest.listen(http_port, () => {

    console.log("Escuchando en el 8080 para API");
});

//corriendo el servidor
server.listen(PORT, () => {
    console.log(`Server running in http://localhost:${PORT}`)
});

app_rest.post('/queue', (req, res) => {
    //res.status(200).send({response: "API OK!" });
    console.log(`Recibido pedido de creacion de cola, Topic: ${req.body.topic}, Modo: ${req.body.mode}, MaxSize: ${req.body.maxsize}, Nodo de datos: ${req.body.datanode}`);
    //por el momento lo agregamos al nodo de datos 1
    var msg = {
        details: 'Pedido de creacion de cola',
        topic: req.body.topic,
        mode: req.body.mode,
        maxsize: req.body.maxsize,

    };
    var socket_nodo_datos = null;
    if (req.body.datanode == "nodo_datos1")
        socket_nodo_datos = socket_nodo_datos1;
    if (req.body.datanode == "nodo_datos2")
        socket_nodo_datos = socket_nodo_datos2;
    if (socket_nodo_datos != null){
        writePromise(msg,'CREATE-QUEUE',socket_nodo_datos).then(() => {
            console.log("Pedido de creacion de cola enviado al nodo de datos");//se podria esperar a tener una respuesta del nodo de datos para darlo por exitoso
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

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var topics = getTopics();




io.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');

    socket.on('PRODUCER-from-router', function (msg) {
        console.log('Productor conectado desde Router!');
        // MENSAJE DE PRODUCER PARA ESCRIBIR

        console.log("Message: " + msg.details + " Topic: " + msg.topic);
        // aca enviar mensaje al Nodo segun topic. Y despues mandar replica de mensaje al otro Nodo
        //Por el momento no mandamos la replica

        //comprobar a cual nodo de datos pertenece el topic
        var socket_nodo_datos_con_topic = null;
        var topic = getDataNodeTopicsMap("nodo_datos1").get(msg.topic);

        if(topic != null)
            socket_nodo_datos_con_topic = socket_nodo_datos1;

        topic = getDataNodeTopicsMap("nodo_datos2").get(msg.topic);

        if(topic != null)
                socket_nodo_datos_con_topic = socket_nodo_datos2;

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






    },


        socket.on('SUBSCRIBER-from-router', (topic) => {
            console.log("Consumidor conectado desde Router!");
            console.log("Topic: " + topic);
            // aca devolver el Endpoint del Nodo al Router para que este se lo devuelva al Consumer
            var endpoint = topics.get(topic);
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

        }));
       


});

// Add a connect listener
socket_nodo_datos1.on('connect', function (socket_nodo_datos) {
    console.log('Orquestador conectado a Nodo1!');

});

socket_nodo_datos2.on('connect', function (socket_nodo_datos) {
    console.log('Orquestador conectado a Nodo2!');

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



function getTopics() {
    var topics = new Map();
    config.nodo_datos1.topics.forEach(queue => {

        topics.set(queue.topic, config.nodo_datos1.endpoint + config.nodo_datos1.port);
    });

    config.nodo_datos2.topics.forEach(queue => {

        topics.set(queue.topic, config.nodo_datos2.endpoint + config.nodo_datos2.port);
    });

    console.log("ORQUESTADOR INICIADO");
    console.log(topics);

    return topics;

}

function getDataNodeTopicsMap(dataNodeName){
    var topics = new Map();
    getDataNodeTopics(dataNodeName).forEach(queue => {

        topics.set(queue.topic, config.nodo_datos1.endpoint + config.nodo_datos1.port);
    });

    return topics;
}

function getDataNodeTopics(dataNodeName){
    return file.get(dataNodeName+".topics");
}