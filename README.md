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

    {
        "location": {
            "zipcode": "07946",
            "state_abbr": "NJ",
            "latitude": "40.672823",
            "longitude": "-74.52011",
            "city": "Millington",
            "state": "New Jersey"
        },
        "weather": [
            {
                "day": {
                    "numeric": "20130308",
                    "readable": "Friday, March 8, 2013"
                },
                "temperatures": {
                    "high": "39",
                    "low": "27"
                },
                "prediction": "Rain/Snow Likely"
            }
        ]
    }

## Notes

Some important things to note is that the functionality will stay true to the requested location's timezone. Though the timezone is not listed, it will always be in that locale.

It is also important to note that the NOAA service is horrible and sometimes doesn't respond. It is important to check for `.error` in any of the responses just in case we encounter bad data. 

## License

MIT.
