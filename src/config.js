const dotenv = require('dotenv')

dotenv.config()

const configs = {
  USER_COLECTION: process.env.USER_COLECTION || 'USER_COLECTION',
  DEVICE_COLECTION: process.env.DEVICE_COLECTION || 'DEVICE_COLECTION',
  PORT: process.env.PORT || 80,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO: process.env.MONGO || 'MONGO_URL'
}

module.exports = configs
