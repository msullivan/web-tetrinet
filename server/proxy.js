'use strict';
// npm install net ws carrier connect serve-static yargs

const args = require('yargs').argv;

// connection info
var port = args['tetrinet-port'] || 31457;
var host = args['tetrinet-host'] || 'localhost';
// local info
var listenPort = args['websocket-port'] || 8081;
var httpListenPort = args['http-port'] || 8080;
var httpServer = args['http-server'] === undefined ? true : args['http-server'];

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: listenPort });
var net = require('net');
var carrier = require('carrier');

if (httpServer) {
  var connect = require('connect');
  var serveStatic = require('serve-static');
  connect().use(serveStatic(__dirname + '/..')).listen(httpListenPort);
}

wss.on('connection', function (ws) {
  var client;
  ws.on('message', function (msg) {
    if (!client) {
      client = net.createConnection(port, host, function () {
        ws.send("Success!");
      });
      // carrier makes it line oriented
      function process(data) {
        if (ws.readyState === ws.OPEN) {
          ws.send(data, { binary: false });
        }
      }
      carrier.carry(client, process, 'latin1', /\xff|\n/);
      //client.on('data', process);
      client.on('error', function(err) {
        ws.close();
      });
      client.on('end', function () {
        ws.close();
      });
    } else {
      client.write(msg + '\n');
    }
  });
  function wsclose() {
    if (client) {
      client.end();
    }
  }
  ws.on('close', wsclose);
  ws.on('error', wsclose);
});

console.log('Listening on', listenPort);
