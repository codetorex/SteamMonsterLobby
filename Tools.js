function randomStr(length) {
    var data = "0123456789abcdefghijklmnoprstqvxyz";
    var result = "";
    for (var i = 0; i < length; i++) {
        result += data.charAt(Math.round(Math.random() * data.length));
    }
    return result;
}
exports.randomStr = randomStr;
// obfuscate some numbers
function estimate(value, fold) {
    if (fold === void 0) { fold = 50; }
    var oddness = value % fold;
    var final = (value - oddness);
    return '+' + final;
}
exports.estimate = estimate;
//# sourceMappingURL=Tools.js.map