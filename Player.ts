

import pollen = require('./Pollen');
import state = require("./State");
import game = require("./Game");

export enum PlayerState {
    Waiting,
    Selected,
    Joining,
    Loading,
    InCorrectGame,
    InWrongGame,
}

export class Player {
    public steamName: string;
    public steamId: string;

    public lastHeartBeat: number;

    public playerSocket: pollen.PollenSocket;

    public state: PlayerState = PlayerState.Waiting;

    public likenewCount: number = 0;
    public wormholeCount: number = 0;

    public playerGame: game.Game = null;
    public playerMustGame: game.Game = null;

    public lastMessageTime: number;
    public score: number;

    public joinIssueStamp: number;
    public joinTimeout: number = 150000; // time out as milliseconds

    public loadingTimeout: number = 10000;

    // timeout in seconds
    public joinGame(gameId, timeout: number) {

        this.playerMustGame = state.globalState.getOrCreateGame(gameId);
        this.state = PlayerState.Joining;

        this.joinTimeout = timeout * 1000;
        this.joinIssueStamp = new Date().getTime();

        this.playerSocket.emit("joinGame", { id: gameId });
    }

    public playerLeavedGame() {
        if (this.playerGame != null) {
            this.playerGame = null;
            this.state = PlayerState.Waiting;
        }
    }

    public sendHello() {
        if (this.playerSocket == null) return;

        var helloData = {}
        
        helloData['state'] = this.state;

        if (this.playerMustGame != null) {
            helloData['gameid'] = this.playerMustGame.roomId;
        }

        if (this.playerGame != null) {
            helloData['wormholes'] = this.playerGame.wormholeCount;
            helloData['likenews'] = this.playerGame.likenewCount;
            helloData['brothers'] = this.playerGame.knownPlayerCount;
        }
        
        if (this.state == PlayerState.Joining) {
            var curTime = new Date().getTime();
            if (curTime - this.joinIssueStamp > this.joinTimeout) {
                this.state = PlayerState.Loading;
            }
        }

        helloData['playerCount'] = state.globalState.totalActivePlayers;
        helloData['playersInGame'] = state.globalState.totalPlayersInGame;
        
        this.playerSocket.emit("hello", helloData); // what do we need to update anyway?
    }

    public playerMadeIntoGame(gameid: number) {
        if (this.playerGame == null) {
            var g: game.Game = state.globalState.getOrCreateGame(gameid);
            if (g.gameType == game.GameType.Offical) {
                this.playerMustGame = g;
                this.playerGame = g;
                this.state = PlayerState.InCorrectGame;
                return;
            }
        }

        if (this.playerMustGame != null && gameid == this.playerMustGame.roomId) {
            this.state = PlayerState.InCorrectGame;
        }
        else {
            this.state = PlayerState.InWrongGame;
        }

        if (this.playerGame != null && this.playerGame.roomId == gameid) return;

        var g: game.Game = state.globalState.getOrCreateGame(gameid);
        this.playerGame = g;
    }
}