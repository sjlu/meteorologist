# Meteorologist

Meteorologist is a wrapper around NOAA's weather forecasts. Since NOAA response is crappy XML, this library wrapper gives you nice pretty JSON on the weather forecasts that NOAA provides. And because it's really slow, it introduces a way to cache forecasts so the response is snappy.

## Usage

### Webservice

You should clone this repository and run the following.

	npm install
	node server.js

You can then request on `http://localhost:4000` with the endpoints `/gps/:lat/:lng` and `/zip/:zipcode`.

### Module

You can also use this as a module, note that it is built asynchronously, you'll need to `npm install meteorologist`.

	var meteorologist = require('meteorologist');
	meteorologist.forecast(:zipcode, function(res) // any 5 digit US zipcode
	{
		console.log(res);
	});

## Sample

	[
	    {
	        "day": {
	            "numeric": "20130307",
	            "readable": "Thursday, March 7, 2013"
	        },
	        "temperatures": {
	            "high": "42",
	            "low": "30"
	        },
	        "prediction": "Snow"
	    }
	]

## License

MIT.