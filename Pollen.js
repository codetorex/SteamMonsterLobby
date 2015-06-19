var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
//// SIMPLE POLLING PACKET SERVER
var PollenSocket = (function () {
    function PollenSocket() {
        this.packets = [];
        this.internalEvents = new events.EventEmitter();
    }
    PollenSocket.prototype.emit = function (event, data) {
        this.packets.push({ event: event, data: data });
    };
    PollenSocket.prototype.receivedData = function (packets) {
        for (var i = 0; i < packets.length; i++) {
            var s = packets[i];
            var eventName = s.event;
            var eventData = s.data;
            this.internalEvents.emit(eventName, eventData);
        }
    };
    PollenSocket.prototype.on = function (event, callback) {
        this.internalEvents.on(event, callback);
    };
    return PollenSocket;
})();
exports.PollenSocket = PollenSocket;
var PollenServer = (function (_super) {
    __extends(PollenServer, _super);
    function PollenServer(appobj) {
        _super.call(this);
        this.sockets = [];
        this.app = appobj;
    }
    PollenServer.prototype.getSocket = function (id) {
        return this.sockets[id];
    };
    PollenServer.prototype.start = function () {
        var self = this;
        this.app.post('/pollen/:socket', function (req, res) {
            var id = req.params.socket;
            var body = req.body;
            var sck = self.getSocket(id);
            if (typeof sck === 'undefined') {
                sck = new PollenSocket();
                sck.socketId = id;
                sck.on('connect', function (data) {
                    sck.emit('connect', { resuming: true });
                });
                sck.emit('connect', { resuming: false });
                self.sockets[id] = sck;
                self.emit('connection', sck);
            }
            sck.receivedData(body);
            sck.lastRequest = new Date().getTime();
            if (sck.packets.length > 0) {
                res.json(sck.packets);
                sck.packets = []; // we sent the packets
                return;
            }
            res.json([]);
        });
        setInterval(function () {
            var purgeList = [];
            var curDate = new Date().getTime();
            for (var s in self.sockets) {
                var sck = self.sockets[s];
                if (curDate - sck.lastRequest > 8000) {
                    purgeList.push(sck.socketId);
                }
            }
            for (var i = 0; i < purgeList.length; i++) {
                var s2 = purgeList[i];
                self.sockets[s2].internalEvents.emit('disconnect', {});
                delete self.sockets[s2];
            }
        }, 3000);
    };
    return PollenServer;
})(events.EventEmitter);
exports.PollenServer = PollenServer;
//# sourceMappingURL=Pollen.js.map