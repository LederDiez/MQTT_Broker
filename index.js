const {PORT_ENB, PORT_WEB, NODE_ENV, MONGO_URL}= require('./config');

const cluster = require('cluster');
const colors	 = require('colors');
const ws = require('websocket-stream');
const Socket_Server = require('http').createServer()


function startAedes () {
  
  const aedes = require('aedes')({
    id: 'BROKER_' + cluster.worker.id
  });

  ws.createServer({ server: Socket_Server }, aedes.handle);
  const TCP_Server = require('net').createServer(aedes.handle);

  TCP_Server.listen(PORT_ENB, function () {
    console.log('Aedes listening on port:', PORT_ENB)
    aedes.publish({ topic: 'aedes/hello', payload: "I'm broker " + aedes.id });
  })

  Socket_Server.listen(PORT_WEB, function () {
    console.log('Aedes listening on port:', PORT_WEB)
    aedes.publish({ topic: 'aedes/hello', payload: "I'm broker " + aedes.id });
  })

  aedes.authenticate = function (client, username, password, callback) {
    if (username == 'testuser' && password == 'testpass') {
      callback(null, true)
    } else {
      callback(null, false)
    }
  }

  aedes.authorizeSubscribe = function (client, sub, callback) {
    /*if (sub.topic === 'aaaa') {
      return callback(new Error('wrong topic'))
    }
    if (sub.topic === 'bbb') {
      // overwrites subscription
      sub.topic = 'foo'
      sub.qos = 1
    }*/
    callback(null, sub)
  }

  // fired when a client subscribe
  aedes.on('clientError', function (client, error) {
    //console.log(error);
  })

  // fired when a client subscribe
  aedes.on('subscribe', function (subscriptions, client) {
    console.log('Client \x1b[32m' + (client ? client.id : client) +
            '\x1b[0m subscribed to topics: ' + subscriptions.map(s => s.topic).join('\n'), 'from broker', aedes.id)
  })

  // fired when a client unsubscribe
  aedes.on('unsubscribe', function (subscriptions, client) {
    console.log('Client \x1b[32m' + (client ? client.id : client) +
            '\x1b[0m unsubscribed to topics: ' + subscriptions.join('\n'), 'from broker', aedes.id)
  })

  // fired when a client connects
  aedes.on('client', function (client) {
    console.log('Client Connected: \x1b[33m' + (client ? client.id : client) + '\x1b[0m', 'to broker', aedes.id)
  })

  // fired when a client disconnects
  aedes.on('clientDisconnect', function (client) {
    console.log('Client Disconnected: \x1b[31m' + (client ? client.id : client) + '\x1b[0m', 'to broker', aedes.id)
  })

  // fired when a message is published
  aedes.on('publish', async function (packet, client) {
    if (client) {
      console.log('Client \x1b[31m' + client.id + '\x1b[0m has published', packet.payload.toString(), 'on', packet.topic, 'to', aedes.id)
    }
  })
}

if (cluster.isMaster) {
  const numWorkers = require('os').cpus().length
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork()
  }

  cluster.on('online', function (worker) {
    console.log('Worker ' + worker.process.pid + ' is online')
  })

  cluster.on('exit', function (worker, code, signal) {
    console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal)
    console.log('Starting a new worker')
    cluster.fork()
  })
} else {
  startAedes()
}