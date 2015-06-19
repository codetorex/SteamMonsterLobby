var player = require("./Player");
var log = require('./Log');
var StateManager = (function () {
    function StateManager() {
        this.lobbies = [];
        this.players = [];
        this.lobbyData = null;
        // steam id to player dictionary
        this.steamPlayer = {};
    }
    StateManager.prototype.playerJoined = function (p) {
        if (this.players.indexOf(p) > -1) {
            return;
        }
        this.players.push(p);
        log.info("Player connected: " + p.steamName + " SteamId:" + p.steamId);
    };
    StateManager.prototype.lobbyCreated = function (l) {
        this.lobbies.push(l);
        this.updateLobbyDataObject();
        log.info("Lobby created: " + l.name);
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
    StateManager.prototype.getLobbyById = function (id) {
        for (var i = 0; i < this.lobbies.length; i++) {
            var curLobby = this.lobbies[i];
            if (curLobby.id === id) {
                return curLobby;
            }
        }
        return null;
    };
    StateManager.prototype.getSteamPlayer = function (steamid) {
        return this.steamPlayer[steamid];
    };
    StateManager.prototype.joinPlayerToLobby = function (p, l) {
        if (l.players.length >= l.limit) {
            return false;
        }
        if (p.playerLobby != null && p.playerLobby != l) {
            p.leaveLobby(); // leave current lobby if any
        }
        l.joinPlayer(p); // join player to new lobby
        log.info("Player " + p.steamName + " joined to " + l.name);
        return true;
    };
    StateManager.prototype.updateLobbyDataObject = function () {
        var lobbyList = [];
        for (var i = 0; i < this.lobbies.length; i++) {
            var curLobby = this.lobbies[i];
            lobbyList.push({
                id: curLobby.id,
                name: curLobby.name,
                limit: curLobby.limit,
                count: curLobby.players.length,
                state: curLobby.lobbyStatus,
            });
        }
        this.lobbyData = lobbyList;
    };
    StateManager.prototype.sendLobbiesToPlayer = function (p) {
        if (p.playerSocket != null) {
            p.playerSocket.emit('updateLobbies', { lobbies: this.lobbyData });
        }
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
        p.leaveLobby();
        /*var i = this.players.indexOf(p);
        if (i != -1) {
            this.players.splice(i, 1);
        }*/
        log.info("Player disconnected: " + p.steamName);
    };
    return StateManager;
})();
exports.StateManager = StateManager;
exports.globalState = new StateManager();
//# sourceMappingURL=State.js.map