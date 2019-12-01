
var method = ClientManager.prototype;
const io_client = require('socket.io-client');

    function ClientManager(url, port){
        this._socket = io_client.connect(url+':'+port, {reconnect: true});
        this._url = url;
        this._port = port;
    }

method.get_client_socket = function(){
        return this._socket;
};

module.exports = ClientManager;