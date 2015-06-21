
import state = require("./State");

export enum GameType {
    Unoffical,
    Offical,
}

export class Game {

    public gameType: GameType = GameType.Unoffical;

    public roomId: number;
    public name: string = "UNKNOWN";

    public level: number = 0;

    // 
    public knownPlayerCount: number = 0;

    public likenewCount: number = 0;
    public wormholeCount: number = 0;

}