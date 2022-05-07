const dotenv = require('dotenv').config();

module.exports = {
	PORT1 : process.env.PORT 					|| 1883,
	PORT2 : process.env.PORT 					|| 1884,
	NODE_ENV : process.env.NODE_ENV 	|| 'development',
	MONGO_URL : process.env.MONGO_URL || 'MONGO_URL'
}