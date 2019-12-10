'use strict'
//requiriendo dependencias 

var ClientManager = require('./utilities/clientManager.js');
var config = require('./config/config.json');
var clientManager = new ClientManager(config.nodo_datos1.endpoint + config.nodo_datos1.port);
var socket_nodo_datos = clientManager.get_client_socket();

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
     
    res.status(200).send({response: "API OK!" });

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
        writePromise(msg, 'PRODUCER-from-orquestador', socket_nodo_datos).then((resp) => {
            console.log("Mensaje enviado al nodo correspondiente segun Topic");

                     }).catch((err) => {


                         console.log(err);
                     });




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
socket_nodo_datos.on('connect', function (socket_nodo_datos) {
    console.log('Orquestador conectado a Nodo1!');

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
