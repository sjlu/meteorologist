var meteorologist = require('./app');
var cities = require('cities');
var express = require('express');
var app = express();

var handler = function(response, res)
{
	res.send(response);
}

var forecast = function(zipcode, res)
{
	meteorologist.forecast(zipcode, handler, res);
}

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