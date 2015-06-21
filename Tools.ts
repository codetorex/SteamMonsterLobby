
export function randomStr(length: number): string {
    var data = "0123456789abcdefghijklmnoprstqvxyz";
    var result = "";
    for (var i = 0; i < length; i++) {
        result += data.charAt(Math.round(Math.random() * data.length));
    }
    return result;
} 


// obfuscate some numbers
export function estimate(value: number, fold: number = 50): string {
    var oddness = value % fold;
    var final = (value - oddness);
    return '+' + final;
}