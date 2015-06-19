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
        }, 1000);
    };
    return Lobby;
})();
exports.Lobby = Lobby;
//# sourceMappingURL=Lobby.js.map