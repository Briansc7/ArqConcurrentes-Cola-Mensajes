var net = require('net');
const HANDSHAKE_REQUEST = "CONSUMER_HANDSHAKE_REQUEST";
const HANDSHAKE_RESPONSE = "CONSUMER_HANDSHAKE_RESPONSE";
var MESSAGE = {

    details: "message details",
    timestamp: new Date(),

}

var client = new net.Socket();
client.connect(2222, '127.0.0.1', function () {
    console.log('Client: connection established with server');

    console.log('---------client details -----------------');
    var address = client.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Client is listening at port' + port);
    console.log('Client ip :' + ipaddr);
    console.log('Client is IP4/IP6 : ' + family);


    // writing data to server
    client.write(HANDSHAKE_REQUEST);


});

client.on('data', function (data) {
    console.log('Received: ' + data);
    if (data == HANDSHAKE_RESPONSE) {

        console.log("Handshake with server OK!");

    } else {

        console.log("Queue message received!");
        console.log(data);
    }

});

client.on('close', function () {
    console.log('Connection closed');
});

client.on('error', function () {
    console.log('Connection closed');
    client.end();
});





