var state = require("./State");
var Player = (function () {
    function Player() {
        this.playerLobby = null; // each player can only have one lobby
        this.likenewCount = 0;
        this.wormholeCount = 0;
        this.banned = false;
    }
    Player.prototype.banPlayer = function (duration) {
        this.banned = true;
        this.banTime = new Date().getTime();
        this.banDuration = duration;
        this.banExpiration = this.banTime + this.banDuration;
    };
    Player.prototype.checkBan = function () {
        if (!this.banned)
            return;
        var curTime = new Date().getTime();
        if (this.banExpiration < curTime) {
            this.banned = false;
        }
    };
    Player.prototype.leaveLobby = function () {
        if (this.playerLobby != null) {
            this.playerLobby.leavePlayer(this);
        }
    };
    Player.prototype.joinGame = function (gameId) {
        this.playerSocket.emit("joinGame", { id: gameId });
    };
    Player.prototype.sendHello = function () {
        if (this.playerSocket == null)
            return;
        var inLobby = this.playerLobby != null;
        var helloData = {};
        helloData.alreadyInLobby = inLobby;
        if (inLobby) {
            var lobby = this.playerLobby;
            var lobbyData = { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length, state: lobby.lobbyStatus, gameid: lobby.gameId, wormholes: lobby.wormholeCount, likenews: lobby.likenewCount };
            for (var k in lobbyData)
                helloData[k] = lobbyData[k];
        }
        else {
            var lobbyData2 = state.globalState.lobbyData;
            helloData.lobbies = state.globalState.lobbyData;
        }
        this.playerSocket.emit("hello", helloData);
    };
    Player.prototype.playerMadeIntoGame = function (gameid) {
        this.currentPlayerGameId = gameid;
    };
    return Player;
})();
exports.Player = Player;
//# sourceMappingURL=Player.js.map