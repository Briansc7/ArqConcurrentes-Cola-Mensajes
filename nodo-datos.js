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
var nodo_replica_conectado = null;

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
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
});

serverReceiveReplica.listen(PORTReceiveReplica, () => {
    console.log(`Esperando conexion del nodo de datos con cola redundante en  http://localhost:${PORTReceiveReplica}`)
});


io.on('connection', function (socket) {
    console.log('Cliente ' + socket.id + ' conectado!');

    socket.on('PRODUCER-from-orquestador', function (msg) {
        console.log("Productor conectado desde Orquestador!");
        console.log("Message: " + msg.details + " Topic: " + msg.topic);
        // aca escribir en Queue segun topic
        writePromise(msg).then((queueMode) => {
            console.log("Mensaje escrito en Topic " + msg.topic);
            showTopicsAndReplicas();
            sendProductorReplica(msg);//se envia la replica al otro nodo de datos
            if (queueMode === 'PubSub') {

                return deliverMessagesPubSubPromise(msg.topic);
            } else if (queueMode === 'RR') {

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

            subscribePromise(topic, socket).then((queueMode) => {
                console.log("Consumidor subscripto a Topic " + topic);
                showTopicsAndReplicas();
                if (queueMode === 'PubSub') {

                    return deliverMessagesPubSubPromise(topic);
                } else if (queueMode === 'RR') {
    
                    return deliverMessagesRoundRobinPromise(topic);
                } else {
    
                    console.log("Modo de trabajo de cola incorrecto");
                }


            }).catch((err) => {


                console.log(err);
            });

        }),

        socket.on('disconnect', function () {
            //puede ser que el cliente desconectado sea un consumidor suscripto.
            // Si es asi, hay que quitarlo de la lista de subscribers

            console.log('Cliente: '+socket.id +" desconectado");

            eliminarSiEsSubscriber(socket);

        }),

    socket.on('CREATE-QUEUE', (request) => {

        console.log("Pedido de creacion de cola recibido, con Topic: " + request.topic+", modo: "+ request.mode + " y maxzise: " + request.maxSize);
        // aca registrar al socket del Consumidor con el topic

        createQueuePromise(request.topic, request.mode, request.maxSize).then((resp) => {
            console.log("Creada cola con topic " + resp.topic+" y modo: "+resp.mode);
            showTopicsAndReplicas();
            sendCreateQueueReplica(request);

        }).then(() => {
                sendMessagePromise({reason: "cola creada en nodo de datos: "+node_name}, 'RELOAD', socket);
                console.log("Enviado pedido de recarga a orquestador por crear una cola");
        }

        ).catch((err) => {


            console.log(err);
        });

    }));
    
       socket.on('CONSUMER-ACK', function (msg) {
        // mensaje de ACK recibido de algun consumidor. Si el Topic esta en modo Transactional , entonces busco el mensaje y lo borro
        // consumidor envia el mensaje que consumio con el topic
         console.log("Mensaje de ACK recibido!");
         var topic = topics.get(msg.topic);
        
            if (topic.transactional) {
           // busco mensaje en Queue y lo borro
                 var index = topic.queue.indexOf(msg.message);
                 if (index != null) {
                    topic.queue.splice(index, 1);
                    console.log("Mensaje "+msg.message+ " eliminado de Topic "+msg.topic+ " en modo Transaccional!");
                 } else {
                   console.log("Error al consumir mensaje");
                 }
                
           

         }

    });



});

ioReceiveReplica.on('connection', function (socket) {
    console.log('Cliente ' + socket.id + ' conectado!');
    console.log('Preparado para recibir replicas de las colas del nodo de datos '+getReplicaName(node_name));


    socket.on('PRODUCTOR-REPLICA', (msg) => {
        console.log("Recibida replica, Mensaje: " + msg.details + " Topic: " + msg.topic);

        writeReplicaPromise(msg).then(() => {
            console.log("Mensaje de replica escrito en Topic " + msg.topic);
            showTopicsAndReplicas();
        }).catch((err) => {

            console.log(err);
        });

    });

    socket.on('CREATE-QUEUE-REPLICA', (request) => {
        console.log("Pedido de creacion de cola en replica, con Topic: " + request.topic+", modo: "+ request.mode + " y maxzise: " + request.maxSize);

        createQueueReplicaPromise(request.topic, request.mode, request.maxSize).then((resp) => {
            console.log("Creada cola en replica con topic " + resp.topic+" y modo: "+resp.mode);
            showTopicsAndReplicas();

        }).catch((err) => {
            console.log(err);
        });

    });

    socket.on('DISASTER-RECOVER', (msg) => {
        console.log("Recuperacion ante desastres: Se recibieron colas y replicas para recargarlas en memoria");

        DisasterRecoverPromise(msg.topics, msg.topicsReplica).then((resp) => {
            console.log("Se recargaron en memoria las colas y las replicas ");
            showTopicsAndReplicas();

        }).catch((err) => {
            console.log(err);
        });

    });

    socket.on('EMPTY-QUEUE', (msg) => {
        console.log("Recuperacion ante desastres: Se recibieron colas y replicas para recargarlas en memoria");

        ClearQueueReplicaPromise(msg.topic).then((resp) => {
            console.log("Se vacio la replica de la cola "+msg.topic+" por haber sido consumida en su totalidad");
            showTopicsAndReplicas();

        }).catch((err) => {
            console.log(err);
        });

    });



});

socket_send_replica.on('connect', function (socket) {
    console.log('Nodo de datos para enviar replicas conectado: '+getReplicaName(node_name));

    if(nodo_replica_conectado === null){
        nodo_replica_conectado = true;
    }
    else{
        //el nodo de datos de replica se acaba de reconectar, asi que hay que sincronizar tanto sus colas propias como las colas de replica
        //los topics de replica son los topics propios del otro nodo, y los topics propios son los que el otro tiene que almacenar como replica


        //los maps no se pueden encodear como json, por eso se lo transforma a array
        var topicsAEnviar = JSON.stringify(Array.from(topicsReplica));

        //borro los suscribers de los topics a enviar ya que no se pueden enviar sockets y ademas serian invalidos en caso de recuperacion ante desastres
        var copiatopics = topics;
        copiatopics.forEach((topic)=>{
            topic.subscribers = [];
        });

        var topicsReplicaAEnviar = JSON.stringify(Array.from(copiatopics));

        var msg = {
            topics: topicsAEnviar,
            topicsReplica: topicsReplicaAEnviar
        };

        sendTopicsAndReplica(msg);
    }

});

socket_send_replica.on('disconnect', function (socket) {
    console.log('Nodo de datos para enviar replicas desconectado: '+getReplicaName(node_name));
    nodo_replica_conectado = false;

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

function DisasterRecoverPromise(topicsReceived, topicsReplicaReceved) {

    return new Promise((resolve, reject) => {
                //Ya que no se puede encondear en json los maps, se los transformo en array y ahora hay que volver a transformarlo a map
                var topicsReceivedMap = new Map(JSON.parse(topicsReceived));

                //Solamente se actualizan los datos de las colas para no borrar los consumidores que se volvieron a suscribir
                var topicsNames = [];
        getDatanodeTopicsFromConfig(node_name).forEach(topic => {
            topicsNames.push(topic.topic);
        });

        topicsNames.forEach((topicName)=>{
                    topics.get(topicName).queue = topicsReceivedMap.get(topicName).queue;
                });


                topicsReplica = new Map(JSON.parse(topicsReplicaReceved));

                //se borran los subscribers recibidos porque al enviarlos en recuperacion de fallos, van a ser invalidos.
                topicsReplica.forEach((topic)=>{
                    topic.subscribers = [];
                });

                resolve("Success");

    });
}

function ClearQueueReplicaPromise(topic) {

    return new Promise((resolve, reject) => {
        topicsReplica.get(topic).queue = [];
        resolve("Success");

    });
}

function sendProductorReplica(msg){
    sendMessagePromise(msg,'PRODUCTOR-REPLICA',socket_send_replica).then(()=>{
        console.log("Se envio replica del dato agregado en la cola");
    }).catch((err) => {
        console.log(err);
    });

}

function sendCreateQueueReplica(msg){
    sendMessagePromise(msg,'CREATE-QUEUE-REPLICA',socket_send_replica).then(()=>{
        console.log("Se envio replica de la creacion de la cola");
    }).catch((err) => {
        console.log(err);
    });
}

function sendTopicsAndReplica(msg){
    sendMessagePromise(msg,'DISASTER-RECOVER',socket_send_replica).then(()=>{
        console.log("Se envio topics y replica para que el otro nodo de datos se recupere");
    }).catch((err) => {
        console.log(err);
    });
}

function replicarColaVacia(topic){
    const msg = {topic: topic};
    sendMessagePromise(msg,'EMPTY-QUEUE',socket_send_replica).then(()=>{
        console.log("Se envio topic, que tiene ahora vacia la cola, a la replica");
    }).catch((err) => {
        console.log(err);
    });
}


function subscribePromise(topic, consumer_socket) {

    return new Promise((resolve, reject) => {
        var subs = topics.get(topic).subscribers;
        if (subs != null) {
            subs.push(consumer_socket);
            resolve(topics.get(topic).mode);
        } else {

            reject("El Topic no existe");
        }



    });
}

function deliverMessagesPubSubPromise(topic) {

    return new Promise((resolve, reject) => {

        var msgQueue = topics.get(topic).queue;
        var subscribers = topics.get(topic).subscribers;
        var transactional = topics.get(topic).transactional;

        if (subscribers.length > 0) {

            msgQueue.forEach(msg => {
                subscribers.forEach(sub => {

                    sendMessagePromise(msg, "QUEUE_MESSAGE", sub).then(resp => {
                        console.log("Mensaje enviado en modo PubSub a Consumidor!");
                        showTopicsAndReplicas();




                    });

                });

            });

         if (!transactional) {
                topics.get(topic).queue = []; // borro mensajes una vez que se enviaron todos, siempre y cuando haya consumidores subscriptos, sino no hace nada
                console.log("Todos los mensajes fueron consumidos en modo No Transaccional!");
            }

        replicarColaVacia(topic);

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
        var transactional = topics.get(topic).transactional;

        if (subscribers.length > 0) {

            msgQueue.forEach(msg => {

                var sub = subscribers[consumerCount];

                sendMessagePromise(msg, "QUEUE_MESSAGE", sub).then(resp => {
                    console.log("Mensaje enviado en modo Round Robin a Consumidor!");
                    showTopicsAndReplicas();

                });

                consumerCount++;
                if (consumerCount === subscribers.length) {
                    consumerCount = 0;
                }

             });

               if (!transactional) {
                topics.get(topic).queue = [];
                console.log("Todos los mensajes fueron consumidos en modo No Transaccional!");
            }

            replicarColaVacia(topic);

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
            file = editJsonFile('./config/config.json'); //recargo el json antes de editarlo
            file.set(node_name+".topics",JSON.parse(stringFullTopics)); //guardo el nuevo array de topics en disco
            file.save(); //ejecuto la grabacion en disco
            resolve(newtopic);
        } else {

            reject("El Topic ya existe existe");
        }
    });
}

function createQueueReplicaPromise(topic, mode, maxSize) {

    return new Promise((resolve, reject) => {
        var topicExist = topicsReplica.get(topic);
        if (topicExist == null) {
            topicsReplica.set(topic, {
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

function getDatanodeTopicsFromConfig(datanodeName){
    //obtiene los topics de un datanode de disco
    return file.get(datanodeName+".topics");
}

function eliminarSiEsSubscriber(socket){

    topics.forEach((topic)=>{
        if(topic.subscribers.includes(socket)){
            topic.subscribers.splice( topic.subscribers.indexOf(socket), 1 );
            console.log("El cliente desconectado era un subscriptor, se lo quito de la lista de subscriptores");
            showTopicsAndReplicas();
        }
    });
}

