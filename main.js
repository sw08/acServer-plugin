const udp = require('dgram');
const { sendChat } = require('./tool.js');
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
var cut = undefined;
var lap = undefined;
var other_car_id = undefined;
var speed = undefined;

tool.sendTracks();

db.init();

client.on('message', (msg, info) => {
    const buf = buffer.fromBuffer(msg);
    const packet_id = buf.readUInt8();
    if (db.track === undefined && ![pids.SESSION_INFO, pids.CAR_INFO].includes(packet_id)) return;
    switch (packet_id) {
        case pids.NEW_SESSION:
            console.log('\nNEW SESSION INITIALIZED\n\n');
        case pids.SESSION_INFO:
            buf.readUInt8();
            buf.readUInt8();
            buf.readUInt8();
            buf.readUInt8();
            br.readStringW(buf);
            db.set('track', br.readString(buf));
            console.log(`${db.track} track`);
            break;
        case pids.NEW_CONNECTION:
            console.log('\nNEW CONNECTION INITIALIZED');
            user_name = br.readStringW(buf);
            user_guid = br.readStringW(buf);
            car_id = buf.readUInt8();
            br.readString(buf);
            console.log(`User GUID: ${user_guid}`);
            console.log(`Car ID: ${car_id}, Car Model: ${db.car_model}\n\n`);
            db.add_car(car_id, user_guid, user_name);
            tool.sendChat(user_guid, `Welcome!`, client);
            tool.sendChat(user_guid, `Your best laptime: ${db.cars[car_id].laptime}`, client);
            db.set_username(user_guid, user_name);
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
                if (lap < db.trackbest.laptime || db.trackbest.laptime === undefined) {
                    car = db.get_car(car_id.toString());
                    db.set_trackbest(car.guid, lap, car.user);
                    tool.broadcastChat(`${car.user} has recorded the fastest lap with ${db.car_model} / ${lap}`, client);
                } else if (lap < db.get_car(car_id).laptime || db.get_car(car_id).laptime === undefined) {
                    car = db.get_car(car_id.toString());
                    db.set_personalbest(car.guid, lap, car.user);
                    tool.sendChat(car.guid, `You've recorded your best laptime with ${db.car_model} / ${lap}`, client);
                }
            }
            break;
        case pids.CAR_INFO:
            car_id = buf.readUInt8();
            temp = buf.readUInt8();
            console.log(temp);
            if (temp == 0) {
                if (car_id == 0) {
                    db.fetch_trackbest();
                    db.set('car_model', br.readStringW(buf));
                }
                break;
            }
            br.readStringW(buf);
            br.readStringW(buf);
            user_name = br.readStringW(buf);
            br.readStringW(buf);
            user_guid = br.readStringW(buf);
            db.add_car(car_id, user_guid, user_name);
            console.log(user_name, user_guid, car_id);
            break;
        case pids.CLIENT_EVENT:
            ev_type = buf.readUInt8();
            if (ev_type === pids.CE_COLLISION_WITH_ENV) break;
            car_id = buf.readUInt8();
            other_car_id = buf.readUInt8();
            speed = buf.readFloatLE();
            var text = `${db.get_car(car_id).user_name} has crashed with you at the speed of ${Math.round(speed * 100) / 100}km/h.`;
            tool.sendChat(db.get_car(other_car_id).guid, text, client);
            text = `You've crashed with ${db.get_car(other_car_id).user_name} at the speed of ${Math.round(speed * 100) / 100}km/h.`;
            tool.sendChat(db.get_car(car_id).guid, text, client);
            break;
        case pids.CHAT:
            car_id = buf.readUInt8()
            const guid = db.get_car(car_id).user_guid;
            var cmd = br.readStringW(buf);
            console.log(cmd);
            if (!cmd.startsWith('!')) break;
            cmd = cmd.slice('!')[0];
            switch (cmd) {
                case 'mylaptime':
                case 'mylap':
                case 'ml':
                case 'laptime':
                    sendChat(user_guid, `Your Laptime: ${db.get_car(car_id).laptime}`, client);
                    break;
                case 'trackbest':
                case 'trackbestlap':
                case 'bestlap':
                case 'tbl':
                case 'best':
                case 'champion':
                case 'champ':
                    sendChat(user_guid, `Track Best Laptime: ${db.trackbest.laptime} by ${db.trackbest.user}`, client);
                    break;
                case 'aroundme':
                case 'competitor':
                case 'competitors':
                case 'compete':
                case 'am':
                    sendChat(user_guid, 'People Around Your Laptime:', client)
                    sendChat(user_guid, db.around_me(guid), client);
                    break;
            }
    }
});
client.bind(12001);

var packet;

packet = buffer.fromSize(3);
packet.writeUInt8(pids.GET_SESSION_INFO);
packet.writeInt16LE(-1, 1);
client.send(packet.toBuffer(), 12000, '127.0.0.1');

for (var i = 0; i < 9; i++) {
    packet = buffer.fromSize(2)
    packet.writeUInt8(pids.GET_CAR_INFO);
    packet.writeUInt8(i);
    client.send(packet.toBuffer(), 12000, '127.0.0.1');
}