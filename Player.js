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
        if (this.playerSocket == null)
            return;
        var inLobby = this.playerLobby != null;
        var helloData = {};
        helloData.alreadyInLobby = inLobby;
        if (inLobby) {
            var lobby = this.playerLobby;
            var lobbyData = { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length, state: lobby.lobbyStatus, gameid: lobby.gameId };
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