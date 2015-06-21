(function (GameType) {
    GameType[GameType["Unoffical"] = 0] = "Unoffical";
    GameType[GameType["Offical"] = 1] = "Offical";
})(exports.GameType || (exports.GameType = {}));
var GameType = exports.GameType;
var Game = (function () {
    function Game() {
        this.gameType = 0 /* Unoffical */;
        this.name = "UNKNOWN";
        this.level = 0;
        // 
        this.knownPlayerCount = 0;
        this.likenewCount = 0;
        this.wormholeCount = 0;
    }
    return Game;
})();
exports.Game = Game;
//# sourceMappingURL=Game.js.map