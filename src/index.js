const colors = require('colors')
const ws = require('websocket-stream')
const http = require('http')
const net = require('net')
const aedes = require('aedes')({ id: 'BROKER' })
const mongoose = require('mongoose')

// models
const models = require('./models')

// Config
const configs = require('./config')

// Función de autenticación
function AunthClient(client, username, password) {
  return new Promise(resolve => {
    client.clientData = {}
    if (username == 'user') {
      const filter = { uuid: password.toString() }
      const update = { uuid: '', authTime: 0 }
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
            console.log('Authentication error, timeout!'.bgRed)
          })
          resolve(null)
        }
      })
    } else if (username == 'device') {
      const filter = { autenticador: password.toString() }
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
  })
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

  console.log('Publishing: ' + packet.topic)

  const data = client.clientData

  if (data.AunthType == 'user') {
    const deviceSerial = data.device.serialNumber;
    if (deviceSerial + '-B' == packet.topic) {
      return callback(null)
    } else {
      return callback(new Error('wrong topic'))
    }
  } else if (data.AunthType == 'device') {
    const deviceSerial = data.serialNumber;
    if (deviceSerial + '-A' == packet.topic) {
      return callback(null)
    } else {
      return callback(new Error('wrong topic'))
    }
  } else {
    return callback(new Error('wrong topic'))
  }
}

aedes.on('client', function (client) {
  console.log(('Client Connected: ' + client.id).bgYellow)
})

aedes.on('clientDisconnect', function (client) {
  console.log(('Client Disconnected: ' + client.id).bgRed)
})

aedes.on('publish', function (packet, client) {
  if (client) {
    const data = client.clientData
    if (data.AunthType == 'user') {
      console.log(data)
    }
    if (data.AunthType == 'device') {
      const deviceSerial = data.serialNumber;
      let jsonData;
      try {
        const payload = packet.payload.toString();
        console.log(payload)
        jsonData = JSON.parse(payload);
      } catch (err) {
        console.log('Error parsing JSON', err);
        return;
      }
      models.saveDeviceData(deviceSerial, jsonData).save(function (err) {
        if (err) {
          console.log('Error saving data!')
          return
        } 
        console.log('Data saved!')
      })
    }
    console.log(`Client ${client.id} has published ${packet.payload.toString()} on ${packet.topic}`)
  }
})

const httpServer = http.createServer()
ws.createServer({ server: httpServer }, aedes.handle)

// Ahora un único servidor TCP que se encarga de conexiones MQTT puro y con WebSocket
const server = net.createServer((socket) => {
  socket.once('data', (buffer) => {
    // Detecta si la conexión es HTTP o no
    const isHttp = buffer.toString().startsWith('GET') || buffer.toString().startsWith('POST')
    // Volvemos a inyectar el buffer al stream
    socket.pause()
    socket.unshift(buffer)
    if (isHttp) {
      // Delega la conexión al servidor HTTP para el upgrade a WebSocket
      httpServer.emit('connection', socket)
    } else {
      // En el caso de conexión MQTT "puro": se pasa directamente a Aedes
      aedes.handle(socket)
    }
    socket.resume()
  })
})

models.init(() => {
  console.log('Database connected!')
})

server.listen(configs.PORT, function () {
  console.log('Aedes listening on port:', configs.PORT)
})
