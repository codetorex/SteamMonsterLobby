﻿/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/socket.io/socket.io.d.ts" />
/// <reference path="typings/express/express.d.ts" />

import net = require('net');
import fs = require('fs');
import log = require('./Log');

import express = require("express");
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
app.use(cookieParser());


import lobby = require("./Lobby");
import player = require("./Player");
import stateManager = require("./State");

var state = stateManager.globalState;

var sessions = {}

/*var state = {
    lobbies: [],
    players:[]
}*/

function randomStr(length:number): string {
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

    for (var i = end-1; i >= 0; i--) {
        result.push(log.logs[i]);
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
        var args = { loginFailed: false }
        if (req.query.failed == "1") {
            args["loginFailed"] = true;
        }
        res.render("login", args);
        return;
    }

    next();
}

function getSessionData(req: express.Request) {
    if (typeof req.cookies == "undefined") {
        return false;
    }

    if (typeof req.cookies.session == 'undefined') {
        return false;
    }

    var sessionId = req.cookies.session;
    return sessions[sessionId];
}

function checkLogin(req: express.Request): boolean {
    var sessionData = getSessionData(req);
    if (sessionData == null) {
        return false;
    }

    if (typeof sessionData.ip !== "undefined")
    {
        if (sessionData.ip != req.ip) {
            return false;
        }
    }

    if (typeof sessionData.login !== "undefined") {
        return sessionData.login;
    }

    return false;
}

import io = require('socket.io');

var server = io.listen(app.listen(port));

server.sockets.on('connection', function (socket) {

    log.info("Socket connected " + socket.id);

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
        state.joinPlayerToLobby(p, lobby);

        socket.emit('joinedLobby', { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length });
    });

    socket.on('ingame', function (data) {
        var p = state.getSteamPlayer(data.id);
        if (p != null) {
            p.playerMadeIntoGame(data.gameid);
        }
        else {
            // previously unknown player joined to a game?
            // who cares? or we should log it? hmm
        }
    });

    socket.on('leaveLobby', function (data) {
        var p: player.Player = socket["player"];

        if (p != null) {
            p.leaveLobby();

            // send lobbies back to user
            state.sendLobbiesToPlayer(p);
        };
    });

    socket.on('chat', function (data) {

    });

    socket.on('heartbeat', function (data) {
        
        var p: player.Player = socket["player"];
        if (p != null) {

            console.log("Heartbeat received from : " + p.steamName);

            var cur = new Date();
            p.lastHeartBeat = cur.getTime();
        }

        if (p.playerLobby != null) {
            p.sendHello();
        }
    });

    socket.on('disconnect', function () {
        var p = socket["player"];
        if (p != null) {
            state.playerConnectionLost(p);
        }
    });

});

log.info("Server started on port " + port);

