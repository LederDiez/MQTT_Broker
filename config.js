const dotenv = require('dotenv').config();

module.exports = {
	PORT : process.env.PORT 					|| 1883,
	NODE_ENV : process.env.NODE_ENV 	|| 'development',
	MONGO_URL : process.env.MONGO_URL || 'MONGO_URL'
}