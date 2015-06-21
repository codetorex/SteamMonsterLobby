var state = require("./State");
var game = require("./Game");
var validator = require("validator");
(function (PlayerState) {
    PlayerState[PlayerState["Waiting"] = 0] = "Waiting";
    PlayerState[PlayerState["Selected"] = 1] = "Selected";
    PlayerState[PlayerState["Joining"] = 2] = "Joining";
    PlayerState[PlayerState["Loading"] = 3] = "Loading";
    PlayerState[PlayerState["InCorrectGame"] = 4] = "InCorrectGame";
    PlayerState[PlayerState["InWrongGame"] = 5] = "InWrongGame";
})(exports.PlayerState || (exports.PlayerState = {}));
var PlayerState = exports.PlayerState;
var Player = (function () {
    function Player() {
        this.state = 0 /* Waiting */;
        this.likenewCount = 0;
        this.wormholeCount = 0;
        this.playerGame = null;
        this.playerMustGame = null;
        this.ugly = false;
        this.joinTimeout = 150000; // time out as milliseconds
        this.loadingTimeout = 10000;
    }
    // timeout in seconds
    Player.prototype.joinGame = function (gameId, timeout) {
        this.playerMustGame = state.globalState.getOrCreateGame(gameId);
        this.state = 2 /* Joining */;
        this.joinTimeout = timeout * 1000;
        this.joinIssueStamp = new Date().getTime();
        this.playerSocket.emit("joinGame", { id: gameId });
    };
    Player.prototype.leaveGame = function (timeout) {
        this.playerSocket.emit('leaveGame', {});
    };
    Player.prototype.playerLeavedGame = function () {
        if (this.playerGame != null) {
            this.playerGame = null;
            this.state = 0 /* Waiting */;
        }
    };
    Player.prototype.announce = function (usr, msg) {
        var data = { user: validator.escape(usr), message: validator.escape(msg) };
        if (this.playerSocket != null) {
            this.playerSocket.emit('announce', data);
        }
    };
    Player.prototype.sendHello = function () {
        if (this.playerSocket == null)
            return;
        var helloData = {};
        helloData['state'] = this.state;
        if (this.playerMustGame != null) {
            helloData['gameid'] = this.playerMustGame.roomId;
        }
        if (this.playerGame != null) {
            helloData['wormholes'] = this.playerGame.wormholeCount;
            helloData['likenews'] = this.playerGame.likenewCount;
            helloData['brothers'] = this.playerGame.estimatedKnown;
        }
        if (this.state == 2 /* Joining */) {
            var curTime = new Date().getTime();
            if (curTime - this.joinIssueStamp > this.joinTimeout) {
                this.state = 3 /* Loading */;
            }
        }
        helloData['playerCount'] = state.globalState.estimatedActives;
        helloData['playersInGame'] = state.globalState.estimatedInGames;
        this.playerSocket.emit("hello", helloData); // what do we need to update anyway?
    };
    Player.prototype.playerMadeIntoGame = function (gameid) {
        if (this.playerGame == null) {
            var g = state.globalState.getOrCreateGame(gameid);
            if (g.gameType == 1 /* Offical */) {
                this.playerMustGame = g;
                this.playerGame = g;
                this.state = 4 /* InCorrectGame */;
                return;
            }
        }
        if (this.playerMustGame != null && gameid == this.playerMustGame.roomId) {
            this.state = 4 /* InCorrectGame */;
        }
        else {
            this.state = 5 /* InWrongGame */;
        }
        if (this.playerGame != null && this.playerGame.roomId == gameid)
            return;
        var g = state.globalState.getOrCreateGame(gameid);
        this.playerGame = g;
    };
    return Player;
})();
exports.Player = Player;
//# sourceMappingURL=Player.js.map