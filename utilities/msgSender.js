var method = MsgSender.prototype;

function MsgSender(){

}

method.send = function(message, handshake, socket) {
    socket.emit('HANDSHAKE', handshake);
    socket.emit('MESSAGE', message);
    console.log("Message sent to server");

};

module.exports = MsgSender;

