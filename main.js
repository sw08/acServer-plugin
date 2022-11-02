const udp = require('dgram');
const buffer = require('buffer');
const tool = require('./tool.js');
const { readFileSync } = require('fs');
const ini = require('ini');

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
var cars = {};

db.init(track);

client.on('message', (msg, info) => {
    console.log('d');
    br.reset(msg);
    var packet_id = br.readbyte();
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
            cars[car_id] = {guid: user_guid, model: car_model, user: user_name};
            break;
        case pids.CONNECTION_CLOSED:
            br.readstringw();
            console.log('\nCONNECTION CLOSED');
            user_guid = br.readstringw()
            console.log(`User GUID: ${user_guid}`);
            car_id = br.readbyte();
            console.log(`Car Model: ${br.readstring()}\n\n`);
            delete cars[car_id];
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
                    console.log(cars)
                    car = cars[car_id]
                    db.set_bestlap(car.model, car.guid, lap, car.user);
                    text = `${car.user} made the best lap: ${lap / 100}`
                    buf = Buffer.from([pids.BROADCAST_CHAT, text.length])
                    buf.write(text)
                    client.send(buf, 0, buf.length);
                    console.log(text);
                }
            }
        case pids.SESSION_INFO:
            br.position += 4
            br.position += br.readbyte() * 4
    }
});
client.bind(12001);