const udp = require('dgram');
const tool = require('./tool.js');
const buffer = require('smart-buffer').SmartBuffer;
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
var lap = undefined;

db.init();

client.on('message', (msg, info) => {
    const buf = buffer.fromBuffer(msg);
    const packet_id = buf.readUInt8();
    if (db.track == undefined && packet_id !== pids.SESSION_INFO) return;
    console.log(db.cars);
    switch (packet_id) {
        case pids.NEW_SESSION:
            console.log('\nNEW SESSION INITIALIZED\n\n');
            break;
        case pids.NEW_CONNECTION:
            console.log('\nNEW CONNECTION INITIALIZED');
            user_name = br.readStringW(buf);
            user_guid = br.readStringW(buf);
            car_id = buf.readUInt8();
            car_model = br.readString(buf);
            console.log(`User GUID: ${user_guid}`);
            console.log(`Car ID: ${car_id}, Car Model: ${car_model}\n\n`);
            db.add_car(car_id, user_guid, car_model, user_name);
            break;
        case pids.CONNECTION_CLOSED:
            br.readStringW(buf);
            console.log('\nCONNECTION CLOSED');
            user_guid = br.readStringW(buf);
            console.log(`User GUID: ${user_guid}`);
            car_id = buf.readUInt8();
            console.log(`Car Model: ${br.readString(buf)}\n\n`);
            db.remove_car(car_id);
            break;
        case pids.LAP_COMPLETED:
            console.log('\nLAP COMPLETED');
            car_id = buf.readUInt8();
            console.log(`Car ID: ${car_id}`);
            lap = buf.readUInt32LE(1);
            console.log(`Laptime: ${lap}`);
            br.position += 4;
            cut = buf.readUInt8();
            console.log(`Cuts: ${cut}\n\n`);
            if (cut == 0) {
                console.log('No cut');
                if (lap < db.bestlap) {
                    car = db.get_car(car_id.toString());
                    db.set_bestlap(car.model, car.guid, lap, car.user);
                    const text = `${car.user} recorded the fastest lap with ${car.model} / ${lap}`;
                    const temp = br.writeStringW(text);
                    const packet = buffer.fromSize(temp.length + 1);
                    packet.writeUInt8(pids.BROADCAST_CHAT, 0);
                    packet.writeBuffer(temp, 1);
                    client.send(packet.toBuffer(), 12000, '127.0.0.1');
                }
            }
            break;
        case pids.SESSION_INFO:
            const track = br.readString(buf.readUInt8(4) * 4);
            db.set_track(track);
            console.log(`${track} track`);
    }
});
client.bind(12001);

br = buffer.from([pids.GET_SESSION_INFO, 0xFF, 0xFF]);
client.send(br, 12000, '127.0.0.1');