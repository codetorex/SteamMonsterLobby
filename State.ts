/// <reference path="typings/redis/redis.d.ts" />

import player = require("./Player");
import game = require("./Game");
import log = require('./Log');
import validator = require("validator");
import redis = require("redis");

export var db = redis.createClient();

db.on("error", function (err) {
    console.log("Error " + err);
});



export class StateManager {
    public players: player.Player[] = [];
    public games: { [roomid: string]: game.Game; } = {};

    public totalActivePlayers: number = 0;
    public totalPlayersInGame: number = 0;

    public unofficalGames: number = 0;

    // steam id to player dictionary
    public steamPlayer = {};

    public constructor() {
        var self = this;

        db.get("games", function (err,reply:any) {
            self.games = <{ [roomid: string]: game.Game; }> JSON.parse(reply);
            if (self.games == null) {
                self.games = {};
            }
            console.log("GAMES LOADED FROM DB");
        });
    }

    public saveGames() {
        db.set("games", JSON.stringify(this.games));
        console.log("GAMES SAVED TO DB");
    }

    public playerJoined(p: player.Player) {
        if (this.players.indexOf(p) > -1) {
            return;
        }
        this.players.push(p);
        log.info("Player connected: " + p.steamName + " SteamId:" + p.steamId);
    }

    public announce(usr: string, msg: string) {

        var data = { user: validator.escape(usr), message: validator.escape(msg)  };

        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            if (p.playerSocket != null) {
                p.playerSocket.emit('announce', data );
            }
        }
    }

    public recountEverything() {
       
        var actives = 0;
        var ingames = 0;

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
            if (g.gameType == game.GameType.Unoffical) {
                if (g.knownPlayerCount == 0) {
                    delete this.games[g.roomId];
                    deleted = true;
                }
                else {
                    this.unofficalGames++;
                }
            }
        }

        if (deleted) {
            this.saveGames();
        }

        this.totalActivePlayers = actives;
        this.totalPlayersInGame = ingames;
    }

    public getGame(roomId: number) {
        var g = this.games['roomId'];
        return g;
    }

    public getOrCreateGame(roomId: number) {
        var g = this.games[roomId];
        if (!g) {
            g = new game.Game();
            g.roomId = roomId;
            this.games[roomId] = g;
            this.saveGames();
        }

        return g;
    }

    // security problem: we are not verifying if client is correctly sent his steamid
    public getOrCreatePlayer(steamid) {
        var k = this.getSteamPlayer(steamid);

        if (k == null) {
            var p = new player.Player();
            p.steamId = steamid;
            this.steamPlayer[steamid] = p;
            return p;
        }

        return k;
    }


    public getSteamPlayer(steamid) {
        return this.steamPlayer[steamid];
    }

    public queuePlayerDisconnected(p: player.Player) {

        var curTime = new Date().getTime();

        if (curTime - p.lastHeartBeat > 8000) {
            this.playerDisconnected(p);
        }
    }

    public playerConnectionLost(p: player.Player, socket) {
        if (p.playerSocket == socket) {
            p.playerSocket = null;
        }
        else {
            log.info("Player reconnected with different socket: " + p.steamName);
            return;
        }

        this.queuePlayerDisconnected(p);
        log.info("Player connection lost: " + p.steamName);
    }

    // this sometimes happens mistakenly so it would be good to have a timeout
    public playerDisconnected(p: player.Player) {
        log.info("Player disconnected: " + p.steamName);
    }
}

export var globalState = new StateManager();

setInterval(function () {
    globalState.recountEverything();
}, 5000);