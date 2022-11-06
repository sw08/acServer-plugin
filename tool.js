const buffer = require('smart-buffer').SmartBuffer;
const fs = require('fs');
const setting = require('./setting.js');

class byteReader {
    readString (buf, offset=0) {
        return buf.readString(buf.readUInt8() + offset);
    }
    readStringW (buf, offset=0) {
        return buf.readString(buf.readUInt8() * 4 + offset, 'UTF-16LE').replace(/\u0000/gi, '');
    }
    writeStringW (str) {
        str = ('' + str).slice(0, 255);
        const packet = buffer.fromSize((str.length * 4) + 1);
        packet.writeUInt8(str.length, 0);
        packet.writeString(str.split('').join('\u0000') + '\u0000', 1, 'UTF-16LE');
        return packet.toBuffer();
    }
}

const br = new byteReader();

function get (path) {
    var a = undefined;
    var b = a;
    fetch(`${setting.path}/${path}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': setting.authorization,
        }
    }).then((res) => {
        b = res.json();
    })
    return a;
}

function post (path, body) {
    var a = undefined;
    var b = a;
    fetch(`${setting.path}/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': setting.authorization,
        },
        body: JSON.stringify(body)
    }).then((res) => {
        b = res.json();
    })
    return a;
}

class DB {
    init() {
        this.track = undefined;
        this.cars = {};
        this.trackbest = undefined;
        this.car_model = undefined;
        this.personalbest = {};
    }
    fetch_trackbest() {
        this.trackbest = get(`get_trackbest/${this.track}/${this.car_model}`);
    }
    fetch_personalbest(guid) {
        return get(`get_personalbest/${this.track}/${this.car_model}/${guid}`).laptime;
    }
    around_me(guid) {
        var result = get(`around_me/${this.track}/${this.car_model.model}/${guid}`);
        return result;
    }
    set(key, value) {
        this[key] = value;
    }
    set_trackbest(user_guid, laptime, user) {
        const data = {user_guid: user_guid, laptime: laptime, model: this.car_model, track: this.track};
        post('set_trackbest', data);
        this.trackbest = data;
        this.set_personalbest(user_guid, laptime, user);
    }
    set_personalbest(user_guid, laptime, user) {
        const data = {user_guid: user_guid, laptime: laptime, model: this.car_model, track: this.track};
        post('set_personalbest', data);
        this.cars[user_guid].laptime = laptime;
    }
    set_username(guid, name) {
        post('set_username', {name: name, guid: guid});
    } 
    add_car(car_id, user_guid, user_name) {
        this.cars[car_id.toString()] = {guid: user_guid, car_id: car_id, user_name: user_name, laptime: this.fetch_personalbest(user_guid)}
    }
    remove_car(car_id) {
        delete this.cars[car_id.toString()];
    }
    get_car(car_id) {
        return this.cars[car_id.toString()];
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
    DB: DB,
    sendTracks: function () {
        const path = '/home/user/yswysw/Steam/steamapps/common/Assetto Corsa Dedicated Server/content/tracks';
        const files = fs.readdirSync(path);
        var tracks = {};
        for (const file of files) {
            tracks[file] = JSON.parse(fs.readFileSync(path + '/' + file + '/ui/ui_track.json', 'utf8')).name;
        }
        post('tracks', tracks);
    },
    sendChat: function(guid, text, client) {
        const temp = br.writeStringW(text);
        const packet = buffer.fromSize(temp.length + 2);
        packet.writeUInt8(pids.SEND_CHAT, 0);
        packet.writeUInt8(guid, 1);
        packet.writeBuffer(temp, 2);
        client.send(packet.toBuffer(), 12000, '127.0.0.1');
    },
    broadcastChat: function(text, client) {
        const temp = br.writeStringW(text);
        const packet = buffer.fromSize(temp.length + 1);
        packet.writeUInt8(pids.BROADCAST_CHAT, 0);
        packet.writeBuffer(temp, 1);
        client.send(packet.toBuffer(), 12000, '127.0.0.1');
    }
}