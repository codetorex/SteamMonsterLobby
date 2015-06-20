/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/body-parser/body-parser.d.ts" />
/// <reference path="typings/express/express.d.ts" />
var log = require('./Log');
var ipfilter = require('./ipfilter');
var express = require("express");
var app = express();
var port = 3800;
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
global['config'] = require('./lobby_config');
var config = global['config'];
var allowedIps = config.adminIp;
var filterMod = ipfilter(allowedIps, { mode: 'allow' });
if (!('antispam' in config)) {
    config.antispam = 1000;
    console.log("ANTISPAM SET TO " + config.antispam);
}
if (!('antispamBantime' in config)) {
    config.antispamBantime = 1000;
    console.log("ANTISPAM BAN TIME SET TO " + config.antispamBantime);
}
app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
//app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
var lobby = require("./Lobby");
var player = require("./Player");
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
app.get("/", filterMod, needLogin, function (req, res) {
    res.render("admin", state);
});
/*
app.get("/emptyRoom", filterMod, needLogin, function (req, res) {
    
    res.header('Access-Control-Allow-Origin', "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");

    res.sendFile('public/empty_room_finder.html', { root: __dirname })
});

app.get("/client", function (req, res) {
    res.render("client");
});*/
app.post("/api/changeAntispam", filterMod, needLogin, function (req, res) {
    config.antispam = parseInt(req.body.antispam);
    console.log("ANTISPAM SET TO " + config.antispam);
    config.antispamBantime = parseInt(req.body.antispamBan);
    console.log("ANTISPAM BAN TIME SET TO " + config.antispamBantime);
    res.redirect("/");
});
app.post("/api/createLobby", filterMod, needLogin, function (req, res) {
    var l = new lobby.Lobby();
    l.name = req.body.name;
    l.limit = parseInt(req.body.limit);
    l.id = randomStr(8);
    state.lobbyCreated(l);
    res.redirect("/");
});
var systemplayer = new player.Player();
systemplayer.steamName = "SYSTEM";
app.post("/api/joinGame", filterMod, needLogin, function (req, res) {
    var l = state.getLobbyById(req.body.lobbyid);
    var gameid = req.body.gameid;
    log.info("Lobby " + l.name + " joining to game " + gameid);
    l.broadcastChatMessage(systemplayer, "JOINING INTO ROOM " + gameid + "! GOOD LUCK!");
    l.joinGame(gameid);
    res.redirect("/");
});
app.post("/api/changeLobbyState", filterMod, needLogin, function (req, res) {
    var l = state.getLobbyById(req.body.lobbyid);
    var gameid = req.body.gameid;
    log.info("Lobby " + l.name + " changing state " + gameid);
    l.broadcastChatMessage(systemplayer, "LOBBY ROOM SET TO " + gameid + "!");
    l.gameId = gameid;
    l.lobbyStatus = lobby.LobbyState.GameInProgress;
    state.updateLobbyDataObject();
    res.redirect("/");
});
// display logs
app.get("/api/logs/:count", filterMod, needLogin, function (req, res) {
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
app.get("/admin/:page", filterMod, needLogin, function (req, res) {
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
var validator = require("validator");
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
            //socket.emit('joinedLobby', { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length });
            p.sendHello();
        }
        else {
            socket.emit('lobbyFull', { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length });
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
        if (server.loadFactor > 125)
            return;
        var p = socket["player"];
        if (p != null) {
            if (p.playerLobby != null) {
                p.playerLobby.broadcastChatMessage(p, data.message);
            }
        }
    });
    socket.on('heartbeat', function (data) {
        if (server.loadFactor > 125)
            return;
        var p = socket["player"];
        if (p != null) {
            var cur = new Date();
            p.lastHeartBeat = cur.getTime();
            if (typeof data != "undefined" && data != null) {
                if ("likenews" in data && "wormholes" in data) {
                    if (!validator.isInt(data.likenews) || !validator.isInt(data.wormholes)) {
                        log.info("Troll detected: " + p.steamName);
                    }
                    else {
                        p.likenewCount = parseInt(data.likenews);
                        p.wormholeCount = parseInt(data.wormholes);
                        if (p.playerLobby) {
                            // it only fires every 5 sec dont worry
                            p.playerLobby.countItems();
                        }
                    }
                }
                if (typeof data.gameid !== "undefined") {
                    p.currentPlayerGameId = data.gameid;
                }
            }
            p.sendHello();
        }
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