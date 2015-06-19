/// <reference path="typings/validator/validator.d.ts" />

import player = require("./Player");
import lobby = require("./Lobby");
import log = require("./Log");
import state = require("./State");

import validator = require('validator');

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

    public wormholeCount: number = 0;
    public likenewCount: number = 0;

    public lastTimeCount: number = 0;

    public config = global['config'];

    public joinPlayer(p: player.Player) {
        if (p.playerLobby != null && p.playerLobby != this ) {
            p.leaveLobby();
        }

        if (this.players.indexOf(p) > -1) {
            return;
        }
       
        this.players.push(p);
        p.playerLobby = this;
        state.globalState.updateLobbyDataObject();
    }

    public countItems() {

        var curTime = new Date().getTime();;

        if (curTime - this.lastTimeCount < 5000) {
            return;
        }
        
        var wormholes = 0;
        var likenews = 0;

        for (var i = 0; i < this.players.length; i++) {
            var curPlayer: player.Player = this.players[i];
            if (curPlayer.playerSocket == null) continue;
            wormholes += curPlayer.wormholeCount;
            likenews += curPlayer.likenewCount;
        }

        this.lastTimeCount = curTime;
        this.wormholeCount = wormholes;
        this.likenewCount = likenews;
    }

    public broadcastChatMessage(p: player.Player, message: string) {
        if (p.banned) {
            p.checkBan();
            return;
        }

        var curtime = new Date().getTime();

        if (curtime - p.lastMessageTime < this.config.antispam) {
            var msg2 = { user: "SYSTEM", message: "ANTISPAM ENABLED FOR " + this.config.antispamBantime / 1000 + " SECOND" };
            p.playerSocket.emit('chat', msg2);
            p.banPlayer(this.config.antispamBantime); // ban for 1 second
            return;
        }

        p.lastMessageTime = curtime;

        if (message.length > 160) {
            message = message.substring(0, 160);
        }

        var escapedName = validator.escape(p.steamName);
        var escapedMessage = validator.escape(message);
        var msg = { user: escapedName, message: escapedMessage };

        for (var i = 0; i < this.players.length; i++) {
            var curPlayer: player.Player = this.players[i];
            if (curPlayer.playerSocket == null) continue;
            
            curPlayer.playerSocket.emit('chat',  msg);
        }
    }

    public leavePlayer(p: player.Player) {
        log.info("Player " + p.steamName + " leaved lobby " + this.name);
        var i = this.players.indexOf(p);
        if (i != -1) {
            this.players.splice(i, 1);
        }

        p.playerLobby = null;
        state.globalState.updateLobbyDataObject();
    }


    public joinGame(gameid) {
        if (this.lobbyStatus != LobbyState.WaitingPlayers) {
            return;
        }

        this.gameId = gameid;
        this.lobbyStatus = LobbyState.JoiningGame;

        state.globalState.updateLobbyDataObject();

        for (var i = 0; i < this.players.length; i++) {
            var curPlayer: player.Player = this.players[i];
            if (curPlayer.playerSocket == null) continue;
            curPlayer.joinGame(gameid);
        }

        var me = this;

        setTimeout(function () {
            me.lobbyStatus = LobbyState.GameInProgress;
        }, 30000);
    }

}
