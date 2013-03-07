var meteorologist = require('./app');
var cities = require('cities');
var express = require('express');
var redis = require('redis');
var app = express();

// option to caching with redis
var client = null;
if (typeof process.env.REDIS_HOST === 'string')
{
	client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
	if (typeof process.env.REDIS_PASSWORD === 'string')
		client.auth(process.env.REDIS_PASSWORD);
}

var handler = function(response, res)
{
	if (client)
		client.setex(0, 21600, response);
	
	res.send(response);
};

var forecast = function(zipcode, res)
{
	if (client)
	{
		client.get(0, function (err, result) {
			if (err)
				meteorologist.forecast(zipcode, handler, res);
			else
				res.send(result);
		});
	}
};

app.get('/', function (req, res)
{
   res.send({
      "error": "Expecting input. (/zip/:zipcode) (/gps/:lat/:lng)"
   });
});

app.get('/zip/:zip', function (req, res)
{
   var zip = req.params.zip;
   forecast(zip, res);
});

app.get('/gps/:lat/:lng', function (req, res)
{
	var lat = req.params.lat;
	var lng = req.params.lng;

	// do a location lookup first.
	var lookup = cities.gps_lookup(lat, lng);

	forecast(lookup.zipcode, res);
});

app.listen(4000);
console.log('http://localhost:4000');
