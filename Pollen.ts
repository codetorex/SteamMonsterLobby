﻿import express = require("express");
import events = require('events');

//// SIMPLE POLLING PACKET SERVER
//// BY CODETOREX

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

    public sockets:PollenSocket[] = [];

    public getSocket(id) {
        return this.sockets[id];
    }


    public start() {
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
