# Meteorologist

Meteorologist is a wrapper around NOAA's weather forecasts. Since NOAA response is crappy XML, this library wrapper gives you nice pretty JSON on the weather forecasts that NOAA provides. And because it's really slow, it introduces a way to cache forecasts so the response is snappy.

## Usage

### Webservice

You should clone this repository and run the following.

	npm install
	node server.js

You can then request on `http://localhost:4000` with the following endpoints.

#### Daily Forecasts

The following endpoints return daily forecats given on the location.

* `/forecast/gps/:lat/:lng`
* `/forecast/zip/:zipcode`

#### Hourly Predictions

These endpoints return you hour to hour predictions throughout the days.

* `/hourly/gps/:lat/:lng`
* `/hourly/zip/:zipcode`

### Module

You can also use this as a module, note that it is built asynchronously, you'll need to `npm install meteorologist`.

	var meteorologist = require('meteorologist');

#### Daily Forecasts

	meteorologist.forecast(:zipcode, function(res) // any 5 digit US zipcode
	{
		console.log(res);
	});

#### Hourly Predictions

   meteorologist.hourly(:zipcode, function(res)
   {
      console.log(res);
   });

## Samples

* [Daily Forecast](https://gist.github.com/sjlu/5126166#file-daily_forecast-json)
* [Hourly Predictions](https://gist.github.com/sjlu/5126166#file-hourly_predictions-json)

## Notes

Some important things to note is that the functionality will stay true to the requested location's timezone. Though the timezone is not listed, it will always be in that locale.

It is also important to note that the NOAA service is horrible and sometimes doesn't respond. It is important to check for `.error` in any of the responses just in case we encounter bad data. 

## License

MIT.
