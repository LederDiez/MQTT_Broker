const dotenv = require('dotenv').config();

module.exports = {
	PORT_ENB : process.env.PORT_ENB 					|| 1883,
	PORT_WEB : process.env.PORT_WEB 					|| 1884,
	NODE_ENV : process.env.NODE_ENV 	|| 'development',
	MONGO_URL : process.env.MONGO_URL || 'MONGO_URL'
}