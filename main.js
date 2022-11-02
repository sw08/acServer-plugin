const udp = require('dgram');
const buffer = require('buffer');
const tool = require('./tool.js');
const { readFileSync, writeFile } = require('fs');

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
    var a = '';
    // a += msg);
    br.reset(msg);
    var packet_id = br.readbyte();
    switch (packet_id) {
        case pids.NEW_SESSION:
            a += '\nNEW SESSION INITIALIZED\n\n';
            break;
        case pids.NEW_CONNECTION:
            a += '\nNEW CONNECTION INITIALIZED\n';
            user_name = br.readstringw();
            user_guid = br.readstringw();
            car_id = br.readbyte();
            car_model = br.readstring();
            a += `User GUID: ${user_guid}\n`;
            a += `Car ID: ${car_id}, Car Model: ${car_model}\n\n`;
            cars[car_id] = {guid: user_guid, model: car_model, user: user_name};
            break;
        case pids.CONNECTION_CLOSED:
            br.readstringw();
            a += '\nCONNECTION CLOSED\n';
            user_guid = br.readstringw()
            a += `User GUID: ${user_guid}\n`;
            car_id = br.readbyte();
            a += `Car Model: ${br.readstring()}\n\n`;
            cars.remove(car_id);
            break;
        case pids.LAP_COMPLETED:
            a += '\nLAP COMPLETED\n';
            car_id = br.readbyte();
            a += `Car ID: ${car_id}\n`;
            lap = br.byte.readUInt32LE();
            a += `Laptime: ${lap}\n`;
            br.position += 4
            cut = br.readbyte();
            a += `Cuts: ${cut}\n\n`;
            if (cut === '0') {
                if (lap < db.bestlap) {
                    car = cars[car_id]
                    db.set_bestlap(car.model, car.guid, lap, car.user);
                    text = `${car.user} made the best lap: ${lap / 100}`
                    buf = Buffer.from([pids.BROADCAST_CHAT, text.length])
                    buf.write(text)
                    client.send(buf, 0, buf.length);
                }
            }
        case pids.SESSION_INFO:
            br.position += 4
            br.position += br.readbyte() * 4
    }
    writeFile(`d/a.txt`, a);
});
client.bind(12001);
client.connect(port=12000, address='localhost');
