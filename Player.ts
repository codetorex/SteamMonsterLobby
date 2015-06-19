

import pollen = require('./Pollen');
import lobby = require("./Lobby");
import state = require("./State");

export class Player {
    public steamName: string;
    public steamId: string;

    public lastHeartBeat: number;

    public playerSocket: pollen.PollenSocket;
    public playerLobby: lobby.Lobby = null; // each player can only have one lobby

    public currentPlayerGameId;
    
    public leaveLobby() {
        if (this.playerLobby != null) {
            this.playerLobby.leavePlayer(this);
        }
    }

    public joinGame(gameId) {
        this.playerSocket.emit("joinGame", { id: gameId });
    }

    public sendHello() {


        if (this.playerSocket == null) return;

        var inLobby = this.playerLobby != null;

        var helloData:any = {};
        helloData.alreadyInLobby = inLobby;

        if (inLobby) {
            var lobby = this.playerLobby;
            var lobbyData = { id: lobby.id, name: lobby.name, limit: lobby.limit, count: lobby.players.length };
            for (var k in lobbyData) helloData[k] = lobbyData[k];
        }
        else {
            var lobbyData2 = state.globalState.lobbyData;
            helloData.lobbies = state.globalState.lobbyData;
            //for (var k in lobbyData2) helloData[k] = lobbyData2[k];
        }

        this.playerSocket.emit("hello", helloData);
        
    }

    public playerMadeIntoGame(gameid) {
        this.currentPlayerGameId = gameid;
    }
}