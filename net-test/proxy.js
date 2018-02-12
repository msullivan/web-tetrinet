'use strict';
// npm install net ws carrier

// connection info
var port = 2083;
var host = 'localhost';
// local info
var listenPort = 8081;


var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: listenPort });
var net = require('net');
var carrier = require('carrier');


wss.on('connection', function (ws) {
    var client;
    ws.on('message', function (msg) {
        if (!client) {
            client = net.createConnection(port, host, function () {
                ws.send("Success!");
            });
            // carrier makes it line oriented
            carrier.carry(client, function (data) {
                if (ws.readyState === ws.OPEN) {
                    ws.send(data, { binary: false });
                }
            }, 'latin1', /\xff|\n/);
            client.on('error', function(err) {
                ws.close();
            });
            client.on('end', function () {
                ws.close();
            });
        } else {
            client.write(msg);
        }
    });
    ws.on('close', function () {
        if (client) {
            client.end();
        }
    });
});

console.log('Listening on', listenPort);
