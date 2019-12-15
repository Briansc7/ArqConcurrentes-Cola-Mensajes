'use strict'
//requiriendo dependencias 

var ClientManager = require('./utilities/clientManager.js');
var ServerManager = require('./utilities/serverManager.js');
var config = require('./config/config.json');
const process = require('process');
var node_name = process.argv[2];

const editJsonFile = require("edit-json-file");
let file = editJsonFile('./config/config.json');

var serverManager = new ServerManager(getDatanodePort(node_name));
const io = serverManager.get_io();
const PORT = serverManager.get_port();
const server = serverManager.get_server();

var serverManagerReceiveReplica = new ServerManager(getDatanodeReceiveReplicaPort(node_name));
const ioReceiveReplica = serverManagerReceiveReplica.get_io();
const PORTReceiveReplica = serverManagerReceiveReplica.get_port();
const serverReceiveReplica = serverManagerReceiveReplica.get_server();

var endpoint_send_replica = getDatanodeReplicaEndpoint(node_name);

var clientManagerSendReplica = new ClientManager(endpoint_send_replica);
var socket_send_replica = clientManagerSendReplica.get_client_socket();

var MsgSender = require('./utilities/msgSender.js');
var msgSender = new MsgSender();

var socket_consumer;
var topics = initTopics(node_name);
var node_name_replica = getReplicaName(node_name);
console.log(`Topics de replica:`);
var topicsReplica = initTopics(node_name_replica);
var consumerCount = 0;

//corriendo el servidor
server.listen(PORT, () => {
    console.log(`Server running in http://localhost:${PORT}`)
});

serverReceiveReplica.listen(PORTReceiveReplica, () => {
    console.log(`Esperando conexion del nodo de datos con cola redundante en  http://localhost:${PORTReceiveReplica}`)
});


io.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');

    socket.on('PRODUCER-from-orquestador', function (msg) {
        console.log("Productor conectado desde Orquestador!");
        console.log("Message: " + msg.details + " Topic: " + msg.topic);
        // aca escribir en Queue segun topic
        writePromise(msg).then((queueMode) => {
            console.log("Mensaje escrito en Topic " + msg.topic);
            showTopicsAndReplicas();
            sendProductorReplica(msg);//se envia la replica al otro nodo de datos
            if (queueMode == 'PubSub') {

                return deliverMessagesPubSubPromise(msg.topic);
            } else if (queueMode == 'RR') {

                return deliverMessagesRoundRobinPromise(msg.topic);
            } else {

                console.log("Modo de trabajo de cola incorrecto");
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
                showTopicsAndReplicas();

            }).catch((err) => {


                console.log(err);
            });

        }),

    socket.on('CREATE-QUEUE', (request) => {

        console.log("Pedido de creacion de cola recibido, con Topic: " + request.topic+", modo: "+ request.mode + " y maxzise: " + request.maxSize);
        // aca registrar al socket del Consumidor con el topic

        createQueuePromise(request.topic, request.mode, request.maxSize).then((resp) => {
            console.log("Creada cola con topic " + resp.topic+" y modo: "+resp.mode);
            showTopicsAndReplicas();

        }).then(() => {
                sendMessagePromise({reason: "cola creada en nodo de datos: "+node_name}, 'RELOAD', socket);
                console.log("Enviado pedido de recarga a orquestador por crear una cola");
        }

        ).catch((err) => {


            console.log(err);
        });

    }));



});

ioReceiveReplica.on('connection', function (socket) {
    console.log('Client ' + socket.id + ' connected!');
    console.log('Preparado para recibir replicas de las colas del nodo de datos '+getReplicaName(node_name));

    socket.on('TEST', (msg) => {
        console.log("Recibido: "+msg.test);
        var reply = {
            test: "respuesta de mensaje de prueba"
        };
        sendMessagePromise(reply, 'TEST',socket);
    });

    socket.on('PRODUCTOR-REPLICA', (msg) => {
        console.log("Recibida replica, Mensaje: " + msg.details + " Topic: " + msg.topic);

        writeReplicaPromise(msg).then(() => {
            console.log("Mensaje de replica escrito en Topic " + msg.topic);
            showTopicsAndReplicas();
        }).catch((err) => {

            console.log(err);
        });

    });



});

socket_send_replica.on('connect', function (socket) {
    console.log('Preparado para enviar replicas de las colas al nodo de datos '+getReplicaName(node_name));

    /*var msg = {
        test: "mensaje de prueba"
    };
    sendMessagePromise(msg, 'TEST',socket_send_replica);*/

});

socket_send_replica.on('TEST', (msg) => {
    console.log("Recibido: "+msg.test);
});

function writePromise(msg) {

    return new Promise((resolve, reject) => {
        var topic = topics.get(msg.topic);
        if (topic != null) {
            if (topic.queue.length === topic.maxSize) {
                console.log(topics);
                reject("El Topic "+msg.topic+ " llego a la maxima cantidad de mensajes: "+topic.maxSize);
            } else {
                topic.queue.push(msg.details);
                resolve(topic.mode);

            }
           
        } else {

            reject("El Topic no existe");
        }



    });
}

function writeReplicaPromise(msg) {

    return new Promise((resolve, reject) => {
        var topic = topicsReplica.get(msg.topic);
        if (topic != null) {
            if (topic.queue.length === topic.maxSize) {
                console.log(topicsReplica);
                reject("El Topic "+msg.topic+ " llego a la maxima cantidad de mensajes: "+topic.maxSize);
            } else {
                topic.queue.push(msg.details);
                resolve(topic.mode);

            }

        } else {

            reject("El Topic no existe");
        }



    });
}

function sendProductorReplica(msg){
    sendMessagePromise(msg,'PRODUCTOR-REPLICA',socket_send_replica);
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

        if (subscribers.length > 0) {

            msgQueue.forEach(msg => {
                subscribers.forEach(sub => {

                    sendMessagePromise(msg, "QUEUE_MESSAGE", sub).then(resp => {
                        console.log("Mensaje enviado en modo PubSub a Consumidor!");




                    });

                });

            });

        topics.get(topic).queue = []; // borro mensajes una vez que se enviaron todos, siempre y cuando haya consumidores subscriptos, sino no hace nada
        resolve();
        } else {

            reject("No hay consumidores subscriptos a Topic " + topic);
        }



        


    });




}

function deliverMessagesRoundRobinPromise(topic) {

    return new Promise((resolve, reject) => {

        var msgQueue = topics.get(topic).queue;
        var subscribers = topics.get(topic).subscribers;

        if (subscribers.length > 0) {

            msgQueue.forEach(msg => {

                var sub = subscribers[consumerCount];

                sendMessagePromise(msg, "QUEUE_MESSAGE", sub).then(resp => {
                    console.log("Mensaje enviado en modo Round Robin a Consumidor!");

                });

                consumerCount++;
                if (consumerCount === subscribers.length) {
                    consumerCount = 0;
                }

             });

            topics.get(topic).queue = [];

        resolve();

        } else {

            reject("No hay consumidores subscriptos a Topic " + topic);
        }

});

}

function sendMessagePromise(msg, messageId, socket) {

    return new Promise((resolve, reject) => {
        msgSender.send(msg, messageId, socket);
        resolve("send promise done");


    });


}

function createQueuePromise(topic, mode, maxSize) {

    return new Promise((resolve, reject) => {
        var topicExist = topics.get(topic);
        if (topicExist == null) {
            topics.set(topic, {
                "queue": [],
                "mode": mode,
                "maxSize": maxSize,
                "subscribers": []
            });
            const newtopic = {
                topic: topic,
                mode: mode,
                maxSize: maxSize
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


function initTopics(nodeName) {

    var topics = new Map();
    getDataNodeTopics(nodeName).forEach(queue => {


        topics.set(queue.topic, {
            "queue": [],
            "mode": queue.mode,
            "maxSize": queue.maxSize,
            "subscribers": []
        });



    });


    console.log("Topics de "+ nodeName);
    console.log(topics);

    return topics;


}


function getDatanodePort(dataNodeName){

        return file.get(dataNodeName+".port");

}

function getJustDatanodeEndpoint(dataNodeName){

        return file.get(dataNodeName+".endpoint");

}

function getDatanodeReceiveReplicaPort(dataNodeName){

        return file.get(dataNodeName+".port_replica");

}

function getDataNodeTopics(dataNodeName){
    return file.get(dataNodeName+".topics");
}

function getReplicaName(dataNodeName) {

    return file.get(dataNodeName + ".nodo_replica");
}

function getDatanodeReplicaEndpoint(dataNodeName){
    const replicaName = getReplicaName(dataNodeName);

    const justReplicaEndpoint = getJustDatanodeEndpoint(replicaName);

    const replicaPort = getDatanodeReceiveReplicaPort(replicaName);

    return justReplicaEndpoint+replicaPort;

}

function showTopicsAndReplicas(){
    console.log("Colas Propias:");
    console.log(topics);
    console.log("Colas replicadas de "+node_name_replica+":");
    console.log(topicsReplica);
}
