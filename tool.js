class byteReader {
    reset(byte) {
        this.byte = byte;
        this.position = 0;
    }

    readbyte() {
        return this.byte[this.position++];
    }

    readstring() {
        const length = this.readbyte();
        this.position += length;
        return this.byte.slice(this.position - length, this.position).toString('utf-8');
    }

    readstringw() {
        const length = this.readbyte();
        this.position += length * 4;
        return this.byte.slice(this.position - length * 4, this.position).toString('utf-8');
    }

    fakeRs() {
        this.position += this.readbyte();
    }
    
    fakeRsw() {
        this.position += this.readbyte() * 4;
    }
}

class DB {
    init(track) {
        // load the database
        this.track = track
        this.bestlap = 234570; // ge the bestlap from the database
    }
    set_bestlap(car_model, user_guid, laptime, user) {
        // refresh the best lap
        this.bestlap = _.copyDeel(laptime);
    }
}


module.exports = {
    pids: {
        NEW_SESSION: 50,
        NEW_CONNECTION: 51,
        CONNECTION_CLOSED: 52,
        CAR_UPDATE: 53,
        CAR_INFO: 54, // Sent as response to GET_CAR_INFO command
        END_SESSION: 55,
        LAP_COMPLETED: 73,
        VERSION: 56,
        CHAT: 57,
        CLIENT_LOADED: 58,
        SESSION_INFO: 59,
        ERROR: 60,
    
        // EVENTS
        CLIENT_EVENT: 130,
    
        // EVENT TYPES
        CE_COLLISION_WITH_CAR: 10,
        CE_COLLISION_WITH_ENV: 11,
    
        // COMMANDS
        REALTIMEPOS_INTERVAL: 200,
        GET_CAR_INFO: 201,
        SEND_CHAT: 202, // Sends chat to one car
        BROADCAST_CHAT: 203, // Sends chat to everybody
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