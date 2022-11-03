const buffer = require('smart-buffer');

var byteReader = undefined;
byteReader.prototype = buffer.SmartBuffer;
byteReader.readString = function () {
    return this.readString(this.readUInt8());
}
byteReader.readStringW = function () {
    return this.readString(this.readUInt8() * 4, 'UTF-16LE').replace(/\u0000/gi, '')
}
byteReader.writeStringW = function (str) {
    str = ('' + str).slice(0, 255)
    const buf = buffer.fromSize((str.length * 4) + 1)
    buf.writeUInt8(str.length, 0)
    buf.writeString(str.split('').join('\u0000') + '\u0000', 1, 'utf-16le')
    return buf.toBuffer()
}


class DB {
    init() {
        // load the database;
        this.track = undefined;
        this.cars = {}
        this.bestlap = 2300000004570; // get the bestlap from the database;
    }
    set_bestlap(car_model, user_guid, laptime, user) {
        // refresh the best lap;
        this.bestlap = laptime;
    }
    add_car(car_id, user_guid, car_model, user_name) {
        this.cars[car_id] = {guid: user_guid, model: car_model, user: user_name}
    }
    remove_car(car_id) {
        delete this.cars[car_id];
    }
    get_car(car_id) {
        return this.cars[car_id];
    }
    set_track(track) {
        this.track = track;
    }
}

module.exports = {
    pids: {
        NEW_SESSION: 50,
        NEW_CONNECTION: 51,
        CONNECTION_CLOSED: 52,
        CAR_UPDATE: 53,
        CAR_INFO: 54, // Sent as response to GET_CAR_INFO command;
        END_SESSION: 55,
        LAP_COMPLETED: 73,
        VERSION: 56,
        CHAT: 57,
        CLIENT_LOADED: 58,
        SESSION_INFO: 59,
        ERROR: 60,
        // EVENTS;
        CLIENT_EVENT: 130,
        // EVENT TYPES;
        CE_COLLISION_WITH_CAR: 10,
        CE_COLLISION_WITH_ENV: 11,
        // COMMANDS;
        REALTIMEPOS_INTERVAL: 200,
        GET_CAR_INFO: 201,
        SEND_CHAT: 202, // Sends chat to one car;
        BROADCAST_CHAT: 203, // Sends chat to everybody;
        GET_SESSION_INFO: 204,
        SET_SESSION_INFO: 205,
        KICK_USER: 206,
        NEXT_SESSION: 207,
        RESTART_SESSION: 208,
        ADMIN_COMMAND: 209, // Send message plus a stringW with the command
    },
    byteReader: byteReader,
    DB: DB
}