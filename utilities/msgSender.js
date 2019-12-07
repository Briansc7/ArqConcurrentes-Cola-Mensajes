var method = MsgSender.prototype;

function MsgSender(){

}

method.send = function(message, messageId, socket) {
    socket.emit(messageId, message);
    console.log("Message sent to server");

};

module.exports = MsgSender;
