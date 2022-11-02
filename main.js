const udp = require('dgram');
const Buffer = require('buffer').Buffer;
const tool = require('./tool.js');
const { readFileSync } = require('fs');
const ini = require('ini');
const iconv = new require('iconv').Iconv('UTF-8', 'UTF-32');

const db = new tool.DB();
const pids = tool.pids;
const br = new tool.byteReader();

const client = udp.createSocket('udp4');

var user_guid = undefined;
var user_name = undefined;
var car = undefined;
var car_id = undefined;
var car_model = undefined;
var cut = undefined;
var track = undefined;
var lap = undefined;
var buf = undefined;

db.init(track);

client.on('message', (msg, info) => {
    br.reset(msg);
    var packet_id = br.readbyte();
    console.log(db.cars);
    switch (packet_id) {
        case pids.NEW_SESSION:
            console.log('\nNEW SESSION INITIALIZED\n\n');
            break;
        case pids.NEW_CONNECTION:
            console.log('\nNEW CONNECTION INITIALIZED');
            user_name = br.readstringw();
            user_guid = br.readstringw();
            car_id = br.readbyte();
            car_model = br.readstring();
            console.log(`User GUID: ${user_guid}`);
            console.log(`Car ID: ${car_id}, Car Model: ${car_model}\n\n`);
            db.add_car(car_id, user_guid, car_model, user_name);
            break;
        case pids.CONNECTION_CLOSED:
            br.readstringw();
            console.log('\nCONNECTION CLOSED');
            user_guid = br.readstringw()
            console.log(`User GUID: ${user_guid}`);
            car_id = br.readbyte();
            console.log(`Car Model: ${br.readstring()}\n\n`);
            db.remove_car(car_id)
            break;
        case pids.LAP_COMPLETED:
            console.log('\nLAP COMPLETED');
            car_id = br.readbyte();
            console.log(`Car ID: ${car_id}`);
            lap = br.byte.readUInt32LE(1);
            console.log(`Laptime: ${lap}`);
            br.position += 4
            cut = br.readbyte();
            console.log(`Cuts: ${cut}\n\n`);
            if (cut == 0) {
                console.log('No cut')
                if (lap < db.bestlap) {
                    car = db.get_car(car_id.toString());
                    db.set_bestlap(car.model, car.guid, lap, car.user);
                    text = `${car.user} made the best lap: ${lap}`
                    buf = Buffer.from([pids.BROADCAST_CHAT])
                    buf.write(iconv.convert(text))
                    console.log(text);
                    client.send(buf);
                }
            }
        case pids.SESSION_INFO:
            br.position += 4
            br.position += br.readbyte() * 4
    }
});
client.bind(12001);