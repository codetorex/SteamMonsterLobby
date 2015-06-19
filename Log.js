exports.logs = [];
function push(value) {
    exports.logs.push(value);
    console.log(value);
}
exports.push = push;
function info(value) {
    //push( "[INFO] " + value);
}
exports.info = info;
//# sourceMappingURL=Log.js.map