var method = MsgSender.prototype;

function MsgSender(){

}


method.send = function(message, messageId, socket) {
    socket.emit(messageId, message);
    console.log("Mensaje enviado al servidor");

};

module.exports = MsgSender;
