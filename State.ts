
import lobby = require("./Lobby");
import player = require("./Player");
import log = require('./Log');

export class StateManager {
    public lobbies: lobby.Lobby[] = [];
    public players: player.Player[] = [];

    public lobbyData: any = null;

    // steam id to player dictionary
    public steamPlayer = {};

    public playerJoined(p: player.Player) {
        if (this.players.indexOf(p) > -1) {
            return;
        }
        this.players.push(p);
        log.info("Player connected: " + p.steamName + " SteamId:" + p.steamId);
    }

    public lobbyCreated(l: lobby.Lobby) {
        this.lobbies.push(l);

        this.updateLobbyDataObject();
        
        log.info("Lobby created: " + l.name);
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

    public getLobbyById(id: string) {
        for (var i = 0; i < this.lobbies.length; i++) {
            var curLobby: lobby.Lobby = this.lobbies[i];
            if (curLobby.id === id) {
                return curLobby;
            }
        }

        return null;
    }

    public getSteamPlayer(steamid) {
        return this.steamPlayer[steamid];
    }

    public joinPlayerToLobby(p: player.Player, l: lobby.Lobby) {

        if (l.players.length >= l.limit) {
            return false;
        }

        if (p.playerLobby != null && p.playerLobby != l) {
            p.leaveLobby(); // leave current lobby if any
        }
        
        l.joinPlayer(p); // join player to new lobby
        log.info("Player " + p.steamName + " joined to " + l.name);

        return true;
    }

    public updateLobbyDataObject() {
        var lobbyList = [];
        for (var i = 0; i < this.lobbies.length; i++) {
            var curLobby: lobby.Lobby = this.lobbies[i];
            lobbyList.push({
                id: curLobby.id,
                name: curLobby.name,
                limit: curLobby.limit,
                count: curLobby.players.length,
                state: curLobby.lobbyStatus,
            });
        }

        this.lobbyData = lobbyList;
    }

    public sendLobbiesToPlayer(p: player.Player) {

        if (p.playerSocket != null) {
            p.playerSocket.emit('updateLobbies', { lobbies: this.lobbyData });
        }
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
        p.leaveLobby();

        /*var i = this.players.indexOf(p);
        if (i != -1) {
            this.players.splice(i, 1);
        }*/

        log.info("Player disconnected: " + p.steamName);
    }

}

export var globalState = new StateManager();