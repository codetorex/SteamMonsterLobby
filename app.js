/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/body-parser/body-parser.d.ts" />
/// <reference path="typings/express/express.d.ts" />
var log = require('./Log');
var express = require("express");
var app = express();
var port = 3700;
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var config = require('./lobby_config');
app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
var lobby = require("./Lobby");
var stateManager = require("./State");
var state = stateManager.globalState;
var sessions = {};
/*var state = {
    lobbies: [],
    players:[]
}*/
function randomStr(length) {
    var data = "0123456789abcdefghijklmnoprstqvxyz";
    var result = "";
    for (var i = 0; i < length; i++) {
        result += data.charAt(Math.round(Math.random() * data.length));
    }
    return result;
}
app.get("/", needLogin, function (req, res) {
    res.render("admin", state);
});
app.get("/client", function (req, res) {
    res.render("client");
});
app.post("/api/createLobby", needLogin, function (req, res) {
    var l = new lobby.Lobby();
    l.name = req.body.name;
    l.limit = req.body.limit;
    l.id = randomStr(8);
    state.lobbyCreated(l);
    res.redirect("/");
});
app.post("/api/joinGame", needLogin, function (req, res) {
    var l = state.getLobbyById(req.body.lobbyid);
    var gameid = req.body.gameid;
    log.info("Lobby " + l.name + " joining to game " + gameid);
    l.joinGame(gameid);
    res.redirect("/");
});
// display logs
app.get("/api/logs/:count", needLogin, function (req, res) {
    var count = req.params.count;
    var length = log.logs.length;
    var start = length - count;
    if (start < 0) {
        start = 0;
    }
    var end = start + count;
    if (end > log.logs.length) {
        end = log.logs.length;
    }
    var result = [];
    result.push("req:" + count + "start:" + start + "end:" + end);
    for (var i = end - 1; i >= start; i--) {
        result.push(i + log.logs[i]);
    }
    res.send(result.join("\n"));
});
app.post("/api/login", function (req, res) {
    if (req.body.password == config.adminPassword) {
        var sessionStr = randomStr(16);
        res.cookie("session", sessionStr);
        sessions[sessionStr] = { login: true, ip: req.ip };
        res.redirect("/");
        return;
    }
    res.redirect("/?failed=1");
});
app.get("/admin/:page", needLogin, function (req, res) {
    res.render(req.params.page);
});
function needLogin(req, res, next) {
    if (!checkLogin(req)) {
        var args = { loginFailed: false };
        if (req.query.failed == "1") {
            args["loginFailed"] = true;
        }
        res.render("login", args);
        return;
    }
    next();
}
function getSessionData(req) {
    if (typeof req.cookies == "undefined") {
        return false;
    }
    if (typeof req.cookies.session == 'undefined') {
        return false;
    }
    var sessionId = req.cookies.session;
    return sessions[sessionId];
}
function checkLogin(req) {
    var sessionData = getSessionData(req);
    if (sessionData == null) {
        return false;
    }
    if (typeof sessionData.ip !== "undefined") {
        if (sessionData.ip != req.ip) {
            return false;
        }
    }
    if (typeof sessionData.login !== "undefined") {
        return sessionData.login;
    }
    return false;
}
var pollen = require('./Pollen');
var appServer = app.listen(port);
var server = new pollen.PollenServer(app);
//var server = io.listen(37005, { pingInterval: 5000, allowUpgrades: false, transports: ['polling'] });
server.on('connection', function (socket) {
    socket.on('hello', function (data) {
        var p = state.getOrCreatePlayer(data.id);
        p.steamName = data.name;
        p.playerSocket = socket;
        socket["player"] = p;
        state.playerJoined(p);
        p.sendHello();
    });
    socket.on('updateLobbies', function (data) {
        var p = socket["player"];
        if (p != null) {
            state.sendLobbiesToPlayer(p);
        }
    });
    socket.on('joinLobby', function (data) {
        var p = socket["player"];
        var lobbyId = data.id;
        var lobby = state.getLobbyById(lobbyId);
        var isJoined = state.joinPlayerToLobby(p, lobby);
        if (isJoined) {
            socket.emit('joinedLobby', { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length });
        }
        else {
            socket.emit('lobbyFull', { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length });
        }
    });
    socket.on('ingame', function (data) {
        var p = state.getSteamPlayer(data.id);
        if (p != null) {
            p.playerMadeIntoGame(data.gameid);
        }
        else {
        }
    });
    socket.on('leaveLobby', function (data) {
        var p = socket["player"];
        if (p != null) {
            p.leaveLobby();
            // send lobbies back to user
            state.sendLobbiesToPlayer(p);
        }
        ;
    });
    socket.on('chat', function (data) {
        var p = socket["player"];
        if (p != null) {
            if (p.playerLobby != null) {
                p.playerLobby.broadcastChatMessage(p, data.message);
            }
        }
    });
    socket.on('heartbeat', function (data) {
        var p = socket["player"];
        if (p != null) {
            var cur = new Date();
            p.lastHeartBeat = cur.getTime();
            p.sendHello();
        }
    });
    socket.on('error', function (reason) {
        console.log(reason);
    });
    socket.on('disconnect', function () {
        var p = socket["player"];
        if (p != null) {
            state.playerConnectionLost(p, socket);
        }
    });
});
server.start();
log.info("Server started on port " + port);
//# sourceMappingURL=app.js.map