/// <reference path="typings/validator/validator.d.ts" />
var log = require("./Log");
var state = require("./State");
var validator = require('validator');
(function (LobbyState) {
    LobbyState[LobbyState["WaitingPlayers"] = 0] = "WaitingPlayers";
    LobbyState[LobbyState["JoiningGame"] = 1] = "JoiningGame";
    LobbyState[LobbyState["GameInProgress"] = 2] = "GameInProgress";
})(exports.LobbyState || (exports.LobbyState = {}));
var LobbyState = exports.LobbyState;
var Lobby = (function () {
    function Lobby() {
        this.players = [];
        this.currentLobby = null;
        this.updateTimer = null;
        this.lobbyStatus = 0 /* WaitingPlayers */;
        this.wormholeCount = 0;
        this.likenewCount = 0;
        this.lastTimeCount = 0;
    }
    Lobby.prototype.joinPlayer = function (p) {
        if (p.playerLobby != null && p.playerLobby != this) {
            p.leaveLobby();
        }
        if (this.players.indexOf(p) > -1) {
            return;
        }
        this.players.push(p);
        p.playerLobby = this;
        state.globalState.updateLobbyDataObject();
    };
    Lobby.prototype.countItems = function () {
        var curTime = new Date().getTime();
        ;
        if (curTime - this.lastTimeCount < 5000) {
            return;
        }
        var wormholes = 0;
        var likenews = 0;
        for (var i = 0; i < this.players.length; i++) {
            var curPlayer = this.players[i];
            if (curPlayer.playerSocket == null)
                continue;
            wormholes += curPlayer.wormholeCount;
            likenews += curPlayer.likenewCount;
        }
        this.lastTimeCount = curTime;
        this.wormholeCount = wormholes;
        this.likenewCount = likenews;
    };
    Lobby.prototype.broadcastChatMessage = function (p, message) {
        if (message.length > 160) {
            message = message.substring(0, 160);
        }
        var escapedName = validator.escape(p.steamName);
        var escapedMessage = validator.escape(message);
        var msg = { user: escapedName, message: escapedMessage };
        for (var i = 0; i < this.players.length; i++) {
            var curPlayer = this.players[i];
            if (curPlayer.playerSocket == null)
                continue;
            curPlayer.playerSocket.emit('chat', msg);
        }
    };
    Lobby.prototype.leavePlayer = function (p) {
        log.info("Player " + p.steamName + " leaved lobby " + this.name);
        var i = this.players.indexOf(p);
        if (i != -1) {
            this.players.splice(i, 1);
        }
        p.playerLobby = null;
        state.globalState.updateLobbyDataObject();
    };
    Lobby.prototype.joinGame = function (gameid) {
        if (this.lobbyStatus != 0 /* WaitingPlayers */) {
            return;
        }
        this.gameId = gameid;
        this.lobbyStatus = 1 /* JoiningGame */;
        state.globalState.updateLobbyDataObject();
        for (var i = 0; i < this.players.length; i++) {
            var curPlayer = this.players[i];
            if (curPlayer.playerSocket == null)
                continue;
            curPlayer.joinGame(gameid);
        }
        var me = this;
        setTimeout(function () {
            me.lobbyStatus = 2 /* GameInProgress */;
        }, 30000);
    };
    return Lobby;
})();
exports.Lobby = Lobby;
//# sourceMappingURL=Lobby.js.map