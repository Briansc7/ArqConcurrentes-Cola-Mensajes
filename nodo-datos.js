'use strict'
//requiriendo dependencias 

var ServerManager = require('./utilities/serverManager.js');
var config = require('./config/config.json');
const process = require('process');
var node_name = process.argv[2];

const editJsonFile = require("edit-json-file");
let file = editJsonFile('./config/config.json');

//var serverManager = new ServerManager(config.nodo_datos1.port);
var serverManager = new ServerManager(getDataNodePort(node_name));
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
});


io.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');

    socket.on('PRODUCER-from-orquestador', function (msg) {
        console.log("Productor conectado desde Orquestador!");
        console.log("Message: " + msg.details + " Topic: " + msg.topic);
        // aca escribir en Queue segun topic
        writePromise(msg).then((queueMode) => {
            console.log("Mensaje escrito en Topic " + msg.topic);
            console.log(topics);
            if (queueMode == 'PubSub') {

               return deliverMessagesPubSubPromise(msg.topic);
            }

        }).then(() => {

              console.log("Mensajes enviados a Consumidores!");
        }).catch((err) => {

            console.log(err);
        });



    },




        socket.on('SUBSCRIBER', (topic) => {

            console.log("Topic: " + topic);
            // aca registrar al socket del Consumidor con el topic

            subscribePromise(topic, socket).then((resp) => {
                console.log("Consumidor subscripto a Topic " + topic);
                console.log(topics);

            }).catch((err) => {


                console.log(err);
            })

        }),

    socket.on('CREATE-QUEUE', (request) => {

        console.log("Pedido de creacion de cola recibido, con Topic: " + request.topic+" y modo: "+ request.mode);
        // aca registrar al socket del Consumidor con el topic

        createQueuePromise(request.topic, request.mode).then((resp) => {
            console.log("Creada cola con topic " + resp.topic+" y modo: "+resp.mode);
            console.log(topics);

        }).then(() => {
                sendMessagePromise({reason: "cola creada en nodo de datos: "+node_name}, 'RELOAD', socket);
                console.log("Enviado pedido de recarga a orquestador por crear una cola");
        }

        ).catch((err) => {


            console.log(err);
        })

    }));



});



function writePromise(msg) {

    return new Promise((resolve, reject) => {
        var topic = topics.get(msg.topic);
        if (topic != null) {
            topic.queue.push(msg.details);
            resolve(topic.mode);
        } else {

            reject("El Topic no existe");
        }



    });
}


function subscribePromise(topic, consumer_socket) {

    return new Promise((resolve, reject) => {
        var subs = topics.get(topic).subscribers;
        if (subs != null) {
            subs.push(consumer_socket);
            resolve("Done");
        } else {

            reject("El Topic no existe");
        }



    });
}

function deliverMessagesPubSubPromise(topic) {

    return new Promise((resolve, reject) => {

        var msgQueue = topics.get(topic).queue;
        var subscribers = topics.get(topic).subscribers;

        msgQueue.forEach(msg => {
          subscribers.forEach(sub => {

            sendMessagePromise(msg, "QUEUE_MESSAGE" ,sub).then(resp => {
                console.log("Mensaje enviado en modo PubSub a Consumidor!");
                resolve();


            });

          });

        });
        

    });




}

function sendMessagePromise(msg, messageId, socket) {

    return new Promise((resolve, reject) => {
        msgSender.send(msg, messageId, socket);
        resolve("send promise done");


    });


}

function createQueuePromise(topic, mode) {

    return new Promise((resolve, reject) => {
        var topicExist = topics.get(topic);
        if (topicExist == null) {
            topics.set(topic, {
                "queue": [],
                "mode": mode,
                "subscribers": []
            });
            const newtopic = {
                topic: topic,
                mode: mode
            };
            //ahora se edita el json en disco
            const fullTopics = file.get(node_name+".topics");//obtengo el array de topics actuales
            var stringFullTopics = JSON.stringify(fullTopics).slice(0, -1);//elimino el ] del final del string
            stringFullTopics = stringFullTopics + ","+JSON.stringify(newtopic)+"]"; //agrego el nuevo topic como string y agrego el } del final
            file.set(node_name+".topics",JSON.parse(stringFullTopics)); //guardo el nuevo array de topics en disco
            file.save(); //ejecuto la grabacion en disco
            resolve(newtopic);
        } else {

            reject("El Topic ya existe existe");
        }
    });
}


function initTopics() {

    var topics = new Map();
    getDataNodeTopics(node_name).forEach(queue => {


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

function getDataNodePort(dataNodeName){
    return JSON.stringify(
        file.get(dataNodeName+".port")
    );
}

function getDataNodeTopics(dataNodeName){
    return file.get(dataNodeName+".topics");
}

