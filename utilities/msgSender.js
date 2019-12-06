var method = MsgSender.prototype;

function MsgSender(){

}

method.send = function(message, socket) {
    socket.emit('MESSAGE', message);
    console.log("Message sent to server");

};

module.exports = MsgSender;

