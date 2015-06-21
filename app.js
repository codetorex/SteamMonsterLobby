/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/body-parser/body-parser.d.ts" />
/// <reference path="typings/express/express.d.ts" />
/// <reference path="typings/validator/validator.d.ts" />
var log = require('./Log');
var ipfilter = require('./ipfilter');
var express = require("express");
var app = express();
var port = 3900;
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
global['config'] = require('./lobby_config');
var config = global['config'];
var allowedIps = config.adminIp;
var filterMod = ipfilter(allowedIps, { mode: 'allow' });
app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
//app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
var player = require("./Player");
var stateManager = require("./State");
var game = require("./Game");
var state = stateManager.globalState;
var tools = require('./Tools');
var sessions = {};
var debug = typeof v8debug === 'object';
app.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "origin, content-type");
    next();
});
app.get("/", filterMod, needLogin, function (req, res) {
    res.render("admin", state);
});
var systemplayer = new player.Player();
systemplayer.steamName = "SYSTEM";
if (debug) {
    console.log("DEBUG MODE, ENABLING DEBUG SCRIPT HOST");
    app.get('/script', function (req, res) {
        res.sendFile('public/MonsterLobby.user.js', { root: __dirname });
    });
}
app.post("/api/announcement", filterMod, needLogin, function (req, res) {
    state.announce(req.body.usr, req.body.msg);
    res.json({ status: 'ok' });
});
app.post('/api/abandonGame', filterMod, needLogin, function (req, res) {
    var gameId = parseInt(req.body.gameid);
    var retryTime = parseInt(req.body.retry);
    for (var i = 0; i < state.players.length; i++) {
        var p = state.players[i];
        if (p.playerSocket != null) {
            if (!p.ugly) {
                p.leaveGame(retryTime);
                p.announce("SYSTEM", "Abandoning this room.");
            }
        }
    }
    // soft abandon (let the players know they are in wrong game)
    var g = state.getGame(gameId);
    if (g) {
        g.gameType = 0 /* Unoffical */;
    }
    res.redirect("/");
});
app.post("/api/joinGame", filterMod, needLogin, function (req, res) {
    var joinList = [];
    var playerCount = req.body.count;
    var gameName = req.body.name;
    var gameId = req.body.gameid;
    var retryTime = req.body.retry;
    for (var i = 0; i < state.players.length; i++) {
        if (joinList.length >= playerCount)
            break;
        var p = state.players[i];
        if (p.playerSocket != null && p.state == 0 /* Waiting */ && !p.ugly) {
            p.state = 1 /* Selected */;
            joinList.push(p);
        }
    }
    state.announce('SYSTEM', 'Randomly selected ' + joinList.length + ' players.');
    var room = state.getOrCreateGame(gameId);
    room.name = gameName;
    room.gameType = 1 /* Offical */;
    state.saveGames();
    state.announce('SYSTEM', 'Commencing join to room.');
    for (var i = 0; i < joinList.length; i++) {
        var p2 = joinList[i];
        p2.joinGame(gameId, retryTime);
    }
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
app.post("/api/login", filterMod, function (req, res) {
    if (req.body.password == config.adminPassword) {
        var sessionStr = tools.randomStr(16);
        res.cookie("session", sessionStr);
        sessions[sessionStr] = { login: true, ip: req.ip };
        res.redirect("/");
        return;
    }
    res.redirect("/?failed=1");
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
    socket.on('heartbeat', function (data) {
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
                    }
                }
                if (data.gameid !== "undefined") {
                    if (validator.isInt(data.gameid)) {
                        if (data.gameid == 0) {
                            p.playerLeavedGame();
                        }
                        else {
                            p.playerMadeIntoGame(parseInt(data.gameid));
                        }
                    }
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