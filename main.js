const udp = require('dgram');
const buffer = require('buffer');
const tool = require('./tool.js');
const { readFileSync } = require('fs');
const ini = require('ini');

const db = tool.DB();
const pids = tool.pids;
const br = new tool.byteReader();

const track = ini.parse(readFileSync('../Steam/steamapps/common/Assetto Corsa Dedicated Server/cfg/server_cfg.ini')).SERVER.TRACK;

const client = udp.createSocket('udp4');

var cars = {};

db.init(track);

var user_guid = '';
var user_name = '';
var car_id = '';
var car_model = '';
var cut = 1;
var lap = 0;
var buf = undefined;

client.on('message', (msg, info) => {
    console.log(msg);
    br.reset(msg);
    var packet_id = br.readbyte();
    switch (packet_id) {
        case pids.NEW_SESSION:
            console.log('NEW SESSION INITIALIZED');
            break;
        case pids.NEW_CONNECTION:
            console.log('NEW CONNECTION INITIALIZED');
            user_name = br.readstringw();
            user_guid = br.readstringw();
            car_id = br.readbyte();
            car_model = br.readstring();
            console.log(`User GUID: ${user_guid}`);
            console.log(`Car ID: ${car_id}, Car Model: ${car_model}`);
            cars[car_id] = {guid: user_guid, model: car_model, user: user_name};
            break;
        case pids.CONNECTION_CLOSED:
            br.readstringw();
            console.log('CONNECTION CLOSED');
            user_guid = br.readstringw()
            console.log(`User GUID: ${user_guid}`);
            car_id = br.readbyte();
            console.log(`Car Model: ${br.readstring()}`);
            cars.remove(car_id);
            break;
        case pids.LAP_COMPLETED:
            console.log('LAP COMPLETED');
            car_id = br.readbyte();
            console.log(`Car ID: ${car_id}`);
            lap = br.byte.readUInt32LE();
            console.log(`Laptime: ${lap}`);
            br.position += 4
            cut = br.readbyte();
            console.log(`Cuts: ${cut}`);
            if (cut === 0) {
                if (lap < db.bestlap) {
                    var car = cars[car_id]
                    db.set_bestlap(car.model, car.guid, lap, car.user);
                    text = `${car.user} made the best lap: ${lap / 100}`
                    buf = Buffer.from([pids.BROADCAST_CHAT, text.length])
                    buf.write(text)
                    client.send(buf, 0, buf.length, 12000, 'localhost')
                }
            }
        case pids.SESSION_INFO:
            br.position += 4
            br.position += br.readbyte() * 4
    }
});
client.bind();
