
export var logs: string[] = []

export function push(value: string) {
    logs.push(value);
    console.log(value);
}

export function info(value: string) {
    //push( "[INFO] " + value);
}