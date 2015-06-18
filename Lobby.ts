
import player = require("./Player");
import lobby = require("./Lobby");
import log = require("./Log");

export enum LobbyState {
    WaitingPlayers,
    JoiningGame,
    GameInProgress
}

export class Lobby {
    public id: string;
    public name: string;

    public limit: number;
    public players: player.Player[] = [];
    
    public currentLobby: lobby.Lobby = null;

    public updateTimer: any = null;

    public lobbyStatus: LobbyState = LobbyState.WaitingPlayers;
    public gameId: any;

    public joinPlayer(p: player.Player) {
        if (p.playerLobby != null && p.playerLobby != this ) {
            p.leaveLobby();
        }
        

        this.players.push(p);
        p.playerLobby = this;

        this.queueLobbyUpdate();
    }

    public leavePlayer(p: player.Player) {
        log.info("Player " + p.steamName + " leaved lobby " + this.name);
        var i = this.players.indexOf(p);
        if (i != -1) {
            this.players.splice(i, 1);
        }

        p.playerLobby = null;

        this.queueLobbyUpdate();
    }


    // waits 1 second so quickly joining and leaving lobbies will not lag people
    public queueLobbyUpdate() {
        if (this.updateTimer != null) {
            return;
        }

        var me = this;

        this.updateTimer = setTimeout(function () {
            me.updateLobbyInfo();
        }, 1000);
    }

    // sends current player counts to players
    public updateLobbyInfo() {
        for (var i = 0; i < this.players.length; i++) {
            var curPlayer: player.Player = this.players[i];
            if (curPlayer.playerSocket == null) continue;
            curPlayer.playerSocket.emit("updateCurrentLobby", {count: this.players.length, limit: this.limit});
        }
    }

    public joinGame(gameid) {
        if (this.lobbyStatus != LobbyState.WaitingPlayers) {
            return;
        }

        this.gameId = gameid;
        this.lobbyStatus = LobbyState.JoiningGame;

        for (var i = 0; i < this.players.length; i++) {
            var curPlayer: player.Player = this.players[i];
            if (curPlayer.playerSocket == null) continue;
            curPlayer.joinGame(gameid);
        }

        var me = this;

        setTimeout(function () {
            me.lobbyStatus = LobbyState.GameInProgress;
        }, 1000);
    }

}
