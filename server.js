var meteorologist = require('./app');
var cities = require('cities');
var express = require('express');
var redis = require('redis');
var app = express();

// option to caching with redis
var client = null;
if (process.env.REDIS_HOST)
{
	client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
	if (typeof process.env.REDIS_PASSWORD)
		client.auth(process.env.REDIS_PASSWORD);
}

var respond = function(zipcode, res)
{	
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Cache-Control', 'max-age=21600');

	var handler = function(response)
	{
		if (response.error)
			return res.end(JSON.stringify(response));

		response = JSON.stringify(response);

		if (client)
			client.setex(zipcode, 21600, response);
		
		return res.end(response);
	};

	if (client)
	{
		client.get(zipcode, function (err, result) {
			if (err || !result)
				meteorologist.forecast(zipcode, handler);
			else
				res.end(result);
		});

		return;
	}

	meteorologist.forecast(zipcode, handler);
};

app.get('/', function (req, res)
{
	res.setHeader('Content-Type', 'application/json');
	var response = {
      "error": "Expecting input. (/zip/:zipcode) (/gps/:lat/:lng)"
   };
   response = JSON.stringify(response);

   res.end(response);
});

app.get('/zip/:zip', function (req, res)
{
   var zip = req.params.zip;
   respond(zip, res);
});

app.get('/gps/:lat/:lng', function (req, res)
{
	var lat = req.params.lat;
	var lng = req.params.lng;

	// do a location lookup first.
	var lookup = cities.gps_lookup(lat, lng);

	respond(lookup.zipcode, res);
});

app.listen(4000);
console.log('http://localhost:4000');
