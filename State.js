var player = require("./Player");
var log = require('./Log');
var StateManager = (function () {
    function StateManager() {
        this.lobbies = [];
        this.players = [];
        // steam id to player dictionary
        this.steamPlayer = {};
    }
    StateManager.prototype.playerJoined = function (p) {
        if (this.players.indexOf(p) > -1) {
            log.info("Player reconnected: " + p.steamName);
            return;
        }
        this.players.push(p);
        log.info("Player connected: " + p.steamName);
    };
    StateManager.prototype.lobbyCreated = function (l) {
        this.lobbies.push(l);
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
        p.leaveLobby(); // leave current lobby if any
        l.joinPlayer(p); // join player to new lobby
        log.info("Player " + p.steamName + " joined to " + l.name);
    };
    StateManager.prototype.sendLobbiesToPlayer = function (p) {
        var lobbyList = [];
        for (var i = 0; i < this.lobbies.length; i++) {
            var curLobby = this.lobbies[i];
            lobbyList.push({
                id: curLobby.id,
                name: curLobby.name,
                limit: curLobby.limit,
                count: curLobby.players.length,
            });
        }
        p.playerSocket.emit('updateLobbies', { lobbies: lobbyList });
    };
    StateManager.prototype.queuePlayerDisconnected = function (p) {
        if (p['timeout'] !== 'undefined') {
            clearTimeout(p['timeout']);
        }
        var me = this;
        p['timeout'] = setTimeout(function () {
            me.playerDisconnected(p);
        }, 60000);
    };
    StateManager.prototype.playerConnectionLost = function (p) {
        p.playerSocket = null;
        this.queuePlayerDisconnected(p);
        log.info("Player connection lost: " + p.steamName);
    };
    // this sometimes happens mistakenly so it would be good to have a timeout
    StateManager.prototype.playerDisconnected = function (p) {
        p.leaveLobby();
        var i = this.players.indexOf(p);
        if (i != -1) {
            this.players.splice(i, 1);
        }
        log.info("Player disconnected: " + p.steamName);
    };
    return StateManager;
})();
exports.StateManager = StateManager;
exports.globalState = new StateManager();
//# sourceMappingURL=State.js.map