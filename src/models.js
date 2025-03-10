const mongoose = require('mongoose')
const colors = require('colors')

colors.enable()

// Config
const configs = require('./config')

async function main () {
  await mongoose.connect(configs.MONGO, { ssl: true })
}

const DeviceDataModelSchema = new mongoose.Schema({
  deviceSerial: { type: String, required: true },
  updated: { type: Date, default: Date.now },
  data: { type: mongoose.Schema.Types.Mixed }
});

const UserSchema = new mongoose.Schema({
  uuid: { type: String, maxlength: 100 },
  authTime: { type: Number, maxlength: 15, lowercase: false },
  device: {}
})

const DeviceSchema = new mongoose.Schema({
  serialNumber: { type: String, maxlength: 15, required: true, index: true, lowercase: false, unique: true }, // Definido por admin
  autenticador: { type: String, maxlength: 100, required: true, index: true }
})

module.exports.init = (callback) => {
  main().then(function () {
    console.log('Success to establish connection with mongodb'.bgGreen)

    callback();

  }).catch(function (err) {
    console.log('Failed to establish connection with mongodb'.bgRed)
    console.log('SERVER DOWN!!!'.bgRed)    
    console.log(err.message)
  })
}

module.exports.users = () => {
  const model = mongoose.model(configs.USER_COLECTION, UserSchema)
  return model
}

module.exports.devices = () => {
  const model = mongoose.model(configs.DEVICE_COLECTION, DeviceSchema)
  return model
}

const DeviceData = mongoose.model('DeviceData', DeviceDataModelSchema);

module.exports.saveDeviceData = (deviceSerial, data) => {
  return new DeviceData({ deviceSerial, data });
}