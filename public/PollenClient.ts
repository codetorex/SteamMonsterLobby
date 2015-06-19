

function Emitter(obj) {
    if (obj) return mixin(obj);
};

function mixin(obj) {
    for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
    }
    return obj;
}

Emitter.prototype.on =
Emitter.prototype.addEventListener = function (event, fn) {
    this._callbacks = this._callbacks || {};
    (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
    return this;
};

Emitter.prototype.once = function (event, fn: Function) {
    function on() {
        this.off(event, on);
        fn.apply(this, arguments);
    }

    on['fn'] = fn;
    this.on(event, on);
    return this;
};

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function (event, fn) {
    this._callbacks = this._callbacks || {};

    // all
    if (0 == arguments.length) {
        this._callbacks = {};
        return this;
    }

    // specific event
    var callbacks = this._callbacks['$' + event];
    if (!callbacks) return this;

    // remove all handlers
    if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
    }

    // remove specific handler
    var cb;
    for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
            callbacks.splice(i, 1);
            break;
        }
    }
    return this;
};

Emitter.prototype.emit = function (event) {
    this._callbacks = this._callbacks || {};
    var args = [].slice.call(arguments, 1)
        , callbacks = this._callbacks['$' + event];

    if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
            callbacks[i].apply(this, args);
        }
    }

    return this;
};

Emitter.prototype.listeners = function (event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks['$' + event] || [];
};

Emitter.prototype.hasListeners = function (event) {
    return !!this.listeners(event).length;
};

interface PollenRequester {
    request(url: string, data: string, callback: Function);
}

declare var GM_xmlhttpRequest: any;

class GreaseMonkeyRequester implements PollenRequester {
    public request(url: string, data: string, callback: Function) {
        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            data: data,
            headers: {
                "Content-Type": "application/json"
            },
            onload: function (response) {
                callback(response.responseText);
            }
        });
    }
}


class PollenClient {
    public url: string;
    public interval: any;
    public packets: Object[] = [];
    public domain: string = '/pollen/';
    public socketId: string;

    public internalEvents: any = {};
    public requester: PollenRequester;


    public emit(event: string, data?: any) {
        this.packets.push({ event: event, data: data });
    }

    public on(event: string, callback: Function) {
        this.internalEvents.on(event, callback);
    }

    public received(body: string) {
        var packets = JSON.parse(body);

        for (var i = 0; i < packets.length; i++) {
            var s = packets[i];
            var eventName = s.event;
            var eventData = s.data;
            this.internalEvents.emit(eventName, eventData);
        }
    }

    public randomStr(length: number): string {
        var data = "0123456789abcdefghijklmnoprstqvxyz";
        var result = "";
        for (var i = 0; i < length; i++) {
            result += data.charAt(Math.round(Math.random() * data.length));
        }
        return result;
    }

    public request() {
        var url = this.url;
        var body = JSON.stringify(this.packets);
        this.packets = [];
        var self = this;

        this.requester.request(this.url + this.domain + this.socketId, body , function (data) {
            self.received(data);
        }); 
    }

    public connect(url: string, interval: number = 700) {
        this.url = url;

        var self = this;

        self.emit('connect');

        this.request();
        this.interval = setInterval(function () {
            self.request();
        }, interval);
    }


    public constructor(requester:PollenRequester) {
        Emitter(this.internalEvents);
        this.requester = requester;
        this.socketId = this.randomStr(16);
    }
}

var socket: PollenClient = new PollenClient(new GreaseMonkeyRequester());
