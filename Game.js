/// <reference path="typings/request/request.d.ts" />
/// <reference path="typings/form-data/form-data.d.ts" />
var request = require('request');
(function (GameType) {
    GameType[GameType["Unoffical"] = 0] = "Unoffical";
    GameType[GameType["Offical"] = 1] = "Offical";
})(exports.GameType || (exports.GameType = {}));
var GameType = exports.GameType;
var GameData = (function () {
    function GameData() {
    }
    return GameData;
})();
exports.GameData = GameData;
function api(url, onsuccess) {
    //http://steamapi-a.akamaihd.net/ITowerAttackMiniGameService/GetPlayerNames/v0001/?gameid=48915
}
var Game = (function () {
    function Game() {
        this.gameType = 0 /* Unoffical */;
        this.name = "UNKNOWN";
        this.level = 0;
        this.totalPlayerCount = 0;
        this.estimatedKnown = '';
        this.knownPlayerCount = 0;
        this.likenewCount = 0;
        this.wormholeCount = 0;
    }
    return Game;
})();
exports.Game = Game;
function fetchOfficialPlayerList(gm, callback) {
    var query = "http://steamapi-a.akamaihd.net/ITowerAttackMiniGameService/GetPlayerNames/v0001/?gameid=";
    var finalUrl = query + this.roomId;
    var self = gm;
    request(finalUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
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
exports.fetchOfficialPlayerList = fetchOfficialPlayerList;
function fetchGameDetails(gm, callback) {
    var query = "http://steamapi-a.akamaihd.net/ITowerAttackMiniGameService/GetGameData/v0001/?gameid=";
    var finalUrl = query + this.roomId + "&include_stats=1&format=json";
    var self = gm;
    request(finalUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
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
exports.fetchGameDetails = fetchGameDetails;
//# sourceMappingURL=Game.js.map