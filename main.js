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
    console.log(msg)
    const buf = buffer.fromBuffer(msg);
    const packet_id = buf.readUInt8();
    switch (packet_id) {
        case pids.NEW_SESSION:
            console.log('\nNEW SESSION INITIALIZED\n\n');
            if (db.track !== undefined) break;
            buf.readUInt8();
            buf.readUInt8();
            buf.readUInt8();
            buf.readUInt8();
            br.readStringW(buf)
            const track = br.readString(buf)
            db.set_track(track);
            console.log(`${track} track`);
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
            lap = buf.readUInt32LE();
            console.log(`Laptime: ${lap}`);
            cut = buf.readUInt8();
            console.log(`Cuts: ${cut}\n\n`);
            if (cut == 0) {
                console.log('No cut');
                if (lap < db.bestlap) {
                    car = db.get_car(car_id.toString());
                    db.set_bestlap(car.model, car.guid, lap, car.user);
                    const text = `${car.user} has recorded the fastest lap with ${car.model} / ${lap}`;
                    const temp = br.writeStringW(text);
                    const packet = buffer.fromSize(temp.length + 1);
                    packet.writeUInt8(pids.BROADCAST_CHAT, 0);
                    packet.writeBuffer(temp, 1);
                    client.send(packet.toBuffer(), 12000, '127.0.0.1');
                }
            }
            break;
        case pids.CAR_INFO:
            car_id = buf.readUInt8();
            if (buf.readUInt8() == 0) break;
            car_model = br.readStringW(buf);
            br.readStringW(buf);
            user_name = br.readStringW(buf);
            br.readStringW(buf);
            user_guid = br.readStringW(buf);
            db.add_car(car_id, user_guid, car_model, user_name);
            break;
    }
});
client.bind(12001);

var packet;

for (var i = 0; i < 9; i++) {
    packet = buffer.fromSize(2)
    packet.writeUInt8(pids.GET_CAR_INFO);
    packet.writeUInt8(i);
    client.send(packet.toBuffer(), 12000, '127.0.0.1');
}