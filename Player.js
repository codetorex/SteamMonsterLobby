/// <reference path="typings/socket.io/socket.io.d.ts" />
var state = require("./State");
var Player = (function () {
    function Player() {
        this.playerLobby = null; // each player can only have one lobby
    }
    Player.prototype.leaveLobby = function () {
        if (this.playerLobby != null) {
            this.playerLobby.leavePlayer(this);
        }
    };
    Player.prototype.joinGame = function (gameId) {
        this.playerSocket.emit("joinGame", { id: gameId });
    };
    Player.prototype.sendHello = function () {
        var inLobby = this.playerLobby != null;
        var helloData = {};
        helloData.alreadyInLobby = inLobby;
        if (inLobby) {
            var lobby = this.playerLobby;
            var lobbyData = { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length };
            for (var k in lobbyData)
                helloData[k] = lobbyData[k];
        }
        else {
            for (var k in lobbyData)
                state.globalState.lobbyData[k] = lobbyData[k];
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