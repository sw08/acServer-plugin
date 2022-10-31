const udp = require('dgram');
const buffer = require('buffer');
const tool = require('./tool.js');
const pids = tool.pids;
const br = new tool.byteReader();

const client = udp.createSocket('udp4');

client.on('message', (msg, info) => {
    console.log(typeof msg);
    console.log(msg);
    br.reset(msg);
    var packet_id = br.readbyte();
    switch (packet_id) {
        case pids.NEW_SESSION:
            console.log('NEW SESSION INITIALIZED');
            break;
        case pids.NEW_CONNECTION:
            console.log('NEW CONNECTION INITIALIZED');
            br.readbytes();
            console.log(`User GUID: ${br.readstrings()}`);
            console.log(`Car ID: ${br.readbyte()}, Car Model: ${br.readstrings()}`);
            break;
        case pids.CONNECTION_CLOSED:
            br.readbytes();
            console.log('CONNECTION CLOSED');
            console.log(`User GUID: ${br.readstrings()}`);
            br.readbyte();
            console.log(`Car Model: ${br.readstrings()}`);
            break;
        case pids.LAP_COMPLETED:
            console.log('LAP COMPLETED');
            console.log(`Car ID: ${br.readbyte()}`);
            console.log(`Laptime: ${br.byte.readUInt32LE()}`);
            br.position += 4
            console.log(`Cuts: ${br.readbyte()}`);
    }
});
client.bind();
