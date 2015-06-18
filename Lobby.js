var log = require("./Log");
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
        this.players.push(p);
        p.playerLobby = this;
        this.queueLobbyUpdate();
    };
    Lobby.prototype.leavePlayer = function (p) {
        log.info("Player " + p.steamName + " leaved lobby " + this.name);
        var i = this.players.indexOf(p);
        if (i != -1) {
            this.players.splice(i, 1);
        }
        p.playerLobby = null;
        this.queueLobbyUpdate();
    };
    // waits 1 second so quickly joining and leaving lobbies will not lag people
    Lobby.prototype.queueLobbyUpdate = function () {
        if (this.updateTimer != null) {
            return;
        }
        var me = this;
        this.updateTimer = setTimeout(function () {
            me.updateLobbyInfo();
        }, 1000);
    };
    // sends current player counts to players
    Lobby.prototype.updateLobbyInfo = function () {
        for (var i = 0; i < this.players.length; i++) {
            var curPlayer = this.players[i];
            if (curPlayer.playerSocket == null)
                continue;
            curPlayer.playerSocket.emit("updateCurrentLobby", { count: this.players.length, limit: this.limit });
        }
    };
    Lobby.prototype.joinGame = function (gameid) {
        if (this.lobbyStatus != 0 /* WaitingPlayers */) {
            return;
        }
        this.gameId = gameid;
        this.lobbyStatus = 1 /* JoiningGame */;
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