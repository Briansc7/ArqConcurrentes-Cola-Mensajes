
var method = ClientManager.prototype;
const io_client = require('socket.io-client');

    function ClientManager(url_port){
        this._socket = io_client.connect(url_port, {reconnect: true});
    }

method.get_client_socket = function(){
        return this._socket;
};

module.exports = ClientManager;