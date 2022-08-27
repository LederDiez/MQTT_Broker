const colors = require('colors')
const ws = require('websocket-stream')
const http = require('http')
const aedes = require('aedes')({ id: 'BROKER' })
const mongoose = require('mongoose')

// models
const models = require('./models')

// Config
const configs = require('./config')

function AunthClient(client, username, password) {
  
  return new Promise(resolve => {
    client.clientData = {}
    if (username == 'user') {
  
      const filter = {
        uuid: password.toString()
      }
  
      const update = {
        uuid: '',
        authTime: 0
      }
  
      models.users().findOneAndUpdate(filter, update, function (err, result) {
        if (err != null || result == null) {
          client.close(() => {
            console.log('Error accepting connection from a user!'.bgRed)
          })
          resolve(null)
        } else if (result.authTime + 10000 > Date.now()) {
          client.clientData = result
          client.clientData.AunthType = 'user'
          console.log('Client authenticated successfully'.bgBlue)
          resolve(result)
        } else {
          
          client.close(() => {
            console.log('Authentication error, timeout!'.bgRed);
          })
          resolve(null)
        }
      })
      
    } else if (username == 'device') {
  
      const filter = {
        autenticador: password.toString()
      }
  
      models.devices().findOne(filter, function (err, result) {
        if (err != null || result == null) {
          client.close(() => {
            console.log('Error accepting connection from a device!'.bgRed)
          })
          resolve(null)
        } else {
          client.clientData = result
          client.clientData.AunthType = 'device'
          console.log('Device authenticated successfully'.bgBlue)
          resolve(result)
        }
      })
  
    } else {
      console.log('Authentication error, ID refused!'.bgRed)
      resolve(null)
      return
    }
  });
}

aedes.authenticate = async function (client, username, password, callback) {
  const result = await AunthClient(client, username, password)

  if (result == null) {
    callback(null, false)
  } else {
    callback(null, true)
  }
}

aedes.authorizePublish = function (client, packet, callback) {
  if (packet.topic.startsWith('$SYS/')) {
    return callback(new Error('$SYS/ topic is reserved'))
  }

  const data = client.clientData

  if (data.AunthType == 'user') {

    const deviceSerial = data.device.serialNumber;
    if (deviceSerial+ '-B' == packet.topic) {
      return callback(null)
    } else {
      return callback(new Error('wrong topic'))
    }
  
  } else if (data.AunthType == 'device') {

    const deviceSerial = data.serialNumber;
    if (deviceSerial+ '-A' == packet.topic) {
      return callback(null)
    } else {
      return callback(new Error('wrong topic'))
    }
  
  } else {
    return callback(new Error('wrong topic'))
  }
}

// fired when a client connects
aedes.on('client', function (client) {
  const message = 'Client Connected: ' + client.id
  console.log(message.bgYellow)
})

// fired when a client disconnects
aedes.on('clientDisconnect', function (client) {
  const message = 'Client Disconnected: ' + client.id
  console.log(message.bgRed)
})

// fired when a message is published
aedes.on('publish', function (packet, client) {
  if (client) {
    const data = client.clientData

    if (data.AunthType == 'user') {
      //
    } else if (data.AunthType == 'device') {

      const deviceSerial = data.serialNumber;

      // Guardado de informacion en la base de datos
      models.devicesDatas(deviceSerial, packet.payload.toString()).save(function (err) {
        if (err) {
          console.log('Error save data!')
          return
        } 
        console.log('Data saved!')
      })
    }
    console.log('Client \x1b[31m' + client.id + '\x1b[0m has published', packet.payload.toString(), 'on', packet.topic)
  }
})

const httpServer = http.createServer()
ws.createServer({ server: httpServer }, aedes.handle)

function broker() {
  httpServer.listen(configs.PORT, function () {
    console.log('Aedes listening on port:', configs.PORT)
  })
}
models.init(broker)
