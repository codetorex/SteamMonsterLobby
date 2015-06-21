import express = require("express");
import events = require('events');

//// SIMPLE POLLING PACKET SERVER

export class PollenSocket {
    public socketId: string;
    public lastRequest: number;

    public packets: Object[] = [];

    public internalEvents: events.EventEmitter = new events.EventEmitter();

    public emit(event:string, data: any) {
        this.packets.push({ event: event, data: data });
    }

    public receivedData(packets: any[]) {
        for (var i = 0; i < packets.length; i++) {
            var s = packets[i];
            var eventName = s.event;
            var eventData = s.data;
            this.internalEvents.emit(eventName, eventData);
        }
    }

    public on(event: string, callback: Function) {
        this.internalEvents.on(event, callback);
    }
}

export class PollenServer extends events.EventEmitter {
    public app: express.Express;

    public sockets: PollenSocket[] = [];
    public maxRequestsPerSecond: number = 500; // adjust delay with this

    public avgResponseTime: number = 0;
    public clientInterval: number = 1500;

    public requestCounter: number = 0;
    public lastRequestCheck: number = 0;

    public requestSpeed: number = 0;
    public loadFactor: number = 0;
    public lastIntervalChange: number = 0;

    public getSocket(id) {
        return this.sockets[id];
    }


    public start() {
        var self = this;
        
        this.app.post('/pollen/:socket', function (req, res) {
            res.header("Connection", "close");

            self.requestCounter++;

            var id = req.params.socket;

            var body = req.body;

            var sck = self.getSocket(id);
            if (typeof sck === 'undefined') {
                sck = new PollenSocket();
                sck.socketId = id;
                sck.on('connect', function (data) {
                    sck.emit('connect', { resuming: true, delay: self.clientInterval });
                });

                //sck.emit('connect', { resuming: false , delay: self.clientInterval});
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

        // calculate server load
        setInterval(function () {
            self.requestSpeed = self.requestCounter - self.lastRequestCheck;
            self.lastRequestCheck = self.requestCounter;
            self.loadFactor = Math.ceil((self.requestSpeed / self.maxRequestsPerSecond) * 100);
            console.log("ReqPsec: " + self.requestSpeed + " LoadF: " + self.loadFactor + " Reqs: " + self.requestCounter + ' CI:' + self.clientInterval);

            var curTime = new Date().getTime();

            // change speed every 5 second
            if (curTime - self.lastRequestCheck < 5000) {
                return;
            }

            if (self.loadFactor > 160) {

                // slow down in half
                self.clientInterval = Math.ceil(self.clientInterval * 1.25);

                console.log('Slowing down client intervals to: ' + self.clientInterval);
                self.lastIntervalChange = curTime;
                // slow people down
                for (var s in self.sockets) {
                    var sck = self.sockets[s];
                    sck.emit('reinterval', {delay: self.clientInterval});
                }
            }
            if (self.loadFactor < 50) {
                // slow down in %30
                var newInterval = Math.ceil(self.clientInterval / 1.25);
                

                if (newInterval > 500) {
                    self.clientInterval = newInterval;
                    console.log('Speeding up client intervals to: ' + self.clientInterval);
                    self.lastIntervalChange = curTime;

                    // slow people down
                    for (var s in self.sockets) {
                        var sck = self.sockets[s];
                        sck.emit('reinterval', { delay: self.clientInterval });
                    }
                }
            }
        }, 1000);

        // purge dead sockets
        setInterval(function () {

            var purgeList = [];
            var curDate = new Date().getTime();

            for (var s in self.sockets) {
                var sck = self.sockets[s];
                if (curDate - sck.lastRequest > 10000) {
                    purgeList.push(s);
                }
            }

            for (var i = 0; i < purgeList.length; i++){
                var s2 = purgeList[i];
                self.sockets[s2].internalEvents.emit('disconnect', {});
                delete self.sockets[s2];
            }

        }, 3000);
    }

    public constructor(appobj: express.Express) {
        super();
        this.app = appobj;
    }
}

