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

var respond = function(type, zipcode, res)
{	
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Cache-Control', 'max-age=21600');
   res.setHeader("Access-Control-Allow-Origin", "*");

	if (type != 'forecast' && type != 'predictions')
		return res.end(JSON.stringify({'error': 'Improper request.'}));

	var handler = function(response)
	{
		if (response.error)
			return res.end(JSON.stringify(response));

		response = JSON.stringify(response);

		if (client)
			client.setex(type + "-" + zipcode, 21600, response);
		
		return res.end(response);
	};

	var call = function()
	{
		if (type == 'forecast')
			meteorologist.forecast(zipcode, handler);
		else if (type == 'predictions')
			meteorologist.predictions(zipcode, handler);
	}

	if (client)
	{
		client.get(type + "-" + zipcode, function (err, result) {
			if (err || !result)
				call();
			else
				res.end(result);
		});

		return;
	}

	call();
};

app.get('/', function (req, res)
{
	res.setHeader('Content-Type', 'application/json');
   res.setHeader("Access-Control-Allow-Origin", "*");

	var response = {
      "error": "Expecting input. (/[forecast,predictions]/zip/:zipcode) (/[forecast,predictions]/gps/:lat/:lng)"
   };
   response = JSON.stringify(response);

   res.end(response);
});

app.get('/:type/zip/:zip', function (req, res)
{
	var type = req.params.type;
   var zip = req.params.zip;
   respond(type, zip, res);
});

app.get('/:type/gps/:lat/:lng', function (req, res)
{
	var type = req.params.type;
	var lat = req.params.lat;
	var lng = req.params.lng;

	// do a location lookup first.
	var lookup = cities.gps_lookup(lat, lng);

	respond(type, lookup.zipcode, res);
});

app.listen(4000);
console.log('http://localhost:4000');
