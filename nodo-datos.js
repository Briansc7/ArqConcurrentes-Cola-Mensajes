'use strict'
//requiriendo dependencias 

var ServerManager = require('./utilities/serverManager.js');
var config = require('./config/config.json');
const process = require('process');
var node_name = process.argv[2];

var serverManager = new ServerManager(config.nodo_datos1.port);
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var socket_consumer;
var topics = initTopics();


//corriendo el servidor
server.listen(PORT, () => {
    console.log(`Server running in http://localhost:${PORT}`)
})

io.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');

    socket.on('PRODUCER-from-orquestador', function (msg) {
        console.log("Productor conectado desde Orquestador!");
        console.log("Message: " + msg.details + " Topic: " + msg.topic);
        // aca escribir en Queue segun topic
        writePromise(msg).then((resp) => {
            console.log("Mensaje escrito en Topic " + msg.topic);
            console.log(topics);
            //sendMessagesPromise

        }).catch((err) => {

            console.log(err);
        });



    },


        socket.on('SUBSCRIBER', (topic) => {

            console.log("Topic: " + topic);
            // aca registrar al socket del Consumidor con el topic

            subscribePromise(topic, socket).then((resp) => {
                console.log("Consumidor subscripto a Topic " + topic);

            }).catch((err) => {

                console.log(err);
            })

        }));


});



function writePromise(msg) {

    return new Promise((resolve, reject) => {
        var topic = topics.get(msg.topic);
        if (topic != null) {
            topic.queue.push(msg.details);
            resolve("Done");
        } else {

            reject("El Topic no existe");
        }



    });
}


function subscribePromise(topic, consumer_socket) {

    return new Promise((resolve, reject) => {
        var subs = topics.get(msg.topic).subscribers;
        if (subs != null) {
            subs.push(consumer_socket);
            resolve("Done");
        } else {

            reject("El Topic no existe");
        }



    });
}


function initTopics() {

    var topics = new Map();
    config.nodo_datos1.topics.forEach(queue => {

        topics.set(queue.topic, {
            "queue": [],
            "mode": queue.mode,
            "subscribers": []
        });


    });

    config.nodo_datos2.topics.forEach(queue => {

        topics.set(queue.topic, {
            "queue": [],
            "mode": queue.mode,
            "subscribers": []
        });


    });

    console.log("NODO DE DATOS INICIADO");
    console.log(topics);



    return topics;


}

