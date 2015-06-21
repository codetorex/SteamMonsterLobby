/// <reference path="typings/request/request.d.ts" />
/// <reference path="typings/form-data/form-data.d.ts" />

import state = require("./State");

import http = require('http');

import request = require('request');

export enum GameType {
    Unoffical,
    Offical,
}

export class GameData {

}

function api(url, onsuccess) {
    //http://steamapi-a.akamaihd.net/ITowerAttackMiniGameService/GetPlayerNames/v0001/?gameid=48915

}

export class Game {

    public gameType: GameType = GameType.Unoffical;

    public roomId: number;
    public name: string = "UNKNOWN";

    public level: number = 0;

    public totalPlayerCount: number = 0;

    public estimatedKnown: string = '';
    public knownPlayerCount: number = 0;

    public likenewCount: number = 0;
    public wormholeCount: number = 0;


}


export function fetchOfficialPlayerList(gm: Game,callback?: Function) {
    var query = "http://steamapi-a.akamaihd.net/ITowerAttackMiniGameService/GetPlayerNames/v0001/?gameid=";
    var finalUrl = query + this.roomId;

    var self = gm;

    request(finalUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try
            {
                var data = JSON.parse(body);
                if (callback) {
                    callback(data);
                }
            }
            catch (e) {
                console.log(e);
            }
        }
    });
}

export function fetchGameDetails(gm: Game,callback?: Function) {
    var query = "http://steamapi-a.akamaihd.net/ITowerAttackMiniGameService/GetGameData/v0001/?gameid=";
    var finalUrl = query + this.roomId + "&include_stats=1&format=json";

    var self = gm;

    request(finalUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try
            {
                var data = JSON.parse(body);

                if (data) {
                    if (data.response) {
                        if (data.response.game_data) {
                            self.level = data.response.game_data.level;
                        }
                        if (data.response.stats) {
                            self.totalPlayerCount = data.response.stats.num_players;
                        }
                    }
                }

                if (callback) {
                    callback(data);
                }
            }
            catch (e) {
                console.log(e);
            }
        }
    });
}