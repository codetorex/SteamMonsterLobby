/// <reference path="typings/redis/redis.d.ts" />
var player = require("./Player");
var game = require("./Game");
var log = require('./Log');
var validator = require("validator");
var redis = require("redis");
var tools = require('./Tools');
exports.db = redis.createClient();
exports.db.on("error", function (err) {
    console.log("Error " + err);
});
var StateManager = (function () {
    function StateManager() {
        this.players = [];
        this.games = {};
        this.totalActivePlayers = 0;
        this.totalPlayersInGame = 0;
        this.estimatedActives = '';
        this.estimatedInGames = '';
        this.unofficalGames = 0;
        this.uglies = 0;
        // steam id to player dictionary
        this.steamPlayer = {};
        var self = this;
        exports.db.get("games", function (err, reply) {
            self.games = JSON.parse(reply);
            if (self.games == null) {
                self.games = {};
            }
            console.log("GAMES LOADED FROM DB");
        });
    }
    StateManager.prototype.saveGames = function () {
        exports.db.set("games", JSON.stringify(this.games));
        console.log("GAMES SAVED TO DB");
    };
    StateManager.prototype.playerJoined = function (p) {
        if (this.players.indexOf(p) > -1) {
            return;
        }
        this.players.push(p);
        log.info("Player connected: " + p.steamName + " SteamId:" + p.steamId);
    };
    StateManager.prototype.announce = function (usr, msg) {
        var data = { user: validator.escape(usr), message: validator.escape(msg) };
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            if (p.playerSocket != null) {
                p.playerSocket.emit('announce', data);
            }
        }
    };
    StateManager.prototype.recountEverything = function () {
        var actives = 0;
        var ingames = 0;
        this.uglies = 0;
        for (var key in this.games) {
            var g = this.games[key];
            g.likenewCount = 0;
            g.knownPlayerCount = 0;
            g.wormholeCount = 0;
        }
        var time = new Date().getTime();
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            if (p.playerSocket != null) {
                if (p.playerGame) {
                    p.playerGame.likenewCount += p.likenewCount;
                    p.playerGame.knownPlayerCount++;
                    p.playerGame.wormholeCount += p.wormholeCount;
                    ingames++;
                }
                if (p.ugly) {
                    this.uglies++;
                }
                if (p.state == player.PlayerState.Loading) {
                    var afterTime = p.joinIssueStamp + p.joinTimeout;
                    if (time - afterTime > p.loadingTimeout) {
                        p.state = player.PlayerState.Waiting;
                        p.playerMustGame = null;
                    }
                }
                actives++;
            }
        }
        this.unofficalGames = 0;
        var deleted = false;
        for (var key in this.games) {
            var g = this.games[key];
            g.estimatedKnown = tools.estimate(g.knownPlayerCount);
            if (g.gameType == game.GameType.Unoffical) {
                if (g.knownPlayerCount == 0) {
                    delete this.games[g.roomId];
                    deleted = true;
                }
                else {
                    this.unofficalGames++;
                }
            }
            else {
            }
        }
        this.saveGames();
        this.totalActivePlayers = actives;
        this.totalPlayersInGame = ingames;
        this.estimatedActives = tools.estimate(actives);
        this.estimatedInGames = tools.estimate(ingames);
    };
    StateManager.prototype.getGame = function (roomId) {
        var g = this.games[roomId];
        return g;
    };
    StateManager.prototype.getOrCreateGame = function (roomId) {
        var g = this.games[roomId];
        if (!g) {
            g = new game.Game();
            g.roomId = roomId;
            this.games[roomId] = g;
        }
        return g;
    };
    // security problem: we are not verifying if client is correctly sent his steamid
    StateManager.prototype.getOrCreatePlayer = function (steamid) {
        var k = this.getSteamPlayer(steamid);
        if (k == null) {
            var p = new player.Player();
            p.steamId = steamid;
            this.steamPlayer[steamid] = p;
            return p;
        }
        return k;
    };
    StateManager.prototype.getSteamPlayer = function (steamid) {
        return this.steamPlayer[steamid];
    };
    StateManager.prototype.queuePlayerDisconnected = function (p) {
        var curTime = new Date().getTime();
        if (curTime - p.lastHeartBeat > 8000) {
            this.playerDisconnected(p);
        }
    };
    StateManager.prototype.playerConnectionLost = function (p, socket) {
        if (p.playerSocket == socket) {
            p.playerSocket = null;
        }
        else {
            log.info("Player reconnected with different socket: " + p.steamName);
            return;
        }
        this.queuePlayerDisconnected(p);
        log.info("Player connection lost: " + p.steamName);
    };
    // this sometimes happens mistakenly so it would be good to have a timeout
    StateManager.prototype.playerDisconnected = function (p) {
        log.info("Player disconnected: " + p.steamName);
    };
    return StateManager;
})();
exports.StateManager = StateManager;
exports.globalState = new StateManager();
setInterval(function () {
    exports.globalState.recountEverything();
}, 5000);
//# sourceMappingURL=State.js.map