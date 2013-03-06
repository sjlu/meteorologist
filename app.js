var request = require('request');
var parseXml = require('xml2js').parseString;
var moment = require('moment');
var fs = require('fs');

// var url = 'http://graphical.weather.gov/xml/SOAP_server/ndfdXMLclient.php?whichClient=NDFDgenMultiZipCode&Unit=e&wx=wx&Submit=Submit';
var url = 'http://graphical.weather.gov/xml/SOAP_server/ndfdXMLclient.php?whichClient=NDFDgenMultiZipCode&product=glanceUnit=e&maxt=maxt&mint=mint&wx=wx&Submit=Submit'

var getDay = function(time)
{
   return moment(moment.unix(time).format('MMDDYYYY'), 'MMDDYYYY').format('X');
}

exports.forecast = function(zipcode)
{
   request(url + '&zipCodeList=' + zipcode, function (error, response, body) {
      if (!error && response.statusCode == 200) {
         parseXml(body, function (err, result)
         {
            // just ignore some stuff we don't need.
            result = result['dwml']['data'][0];
            var results = {
               times: result['time-layout'],
               temps: result['parameters'][0]['temperature'],
               predictions: result['parameters'][0]['weather'][0]
            };
            var forecast = {};

            // we need to parse the time frames out,
            // so that way we can use it parse 
            // other data out
            var times = {};
            for (var i in results.times)
            {
               var intervals = [];
               for (var j = 0; j < results.times[i]['start-valid-time'].length; j++)
               {
                  // create the interval time.
                  var interval = moment(results.times[i]['start-valid-time'][j]).format('X');

                  // we need to start-up our response with days
                  // as that's how we're going to respond to people
                  var day = getDay(interval);
                  if (typeof forecast[day] === "undefined")
                     forecast[day] = {};

                  intervals.push(interval);
               }

               times[results.times[i]['layout-key'][0]] = intervals;
            }

            // building out temperature to days.
            // this for loop is for looking at min and max
            // will only ever run twice.
            for (var i in results.temps)
            {
               // gotta figure out waht itme layout we're using.
               var timeLayout = results.temps[i]['$']['time-layout'];
               
               // high and low makes more sense.
               var type = results.temps[i]['$'].type;
               if (type == 'maximum')
                  type = 'high';
               else
                  type = 'low';

               // so each value is directly correlated to our
               // values of time layouts. we'll walk through each
               // and see the temperature for the day.
               for (var j in results.temps[i].value)
               {
                  var day = getDay(times[timeLayout][j]);

                  // build it out into our array.
                  if (typeof forecast[day].temperatures === "undefined")
                     forecast[day].temperatures = {};

                  forecast[day].temperatures[type] = results.temps[i].value[j];
               }
            }

            // building out hour to hour forecasts to days.
            // it is always one to one, and only one result set.
            var timeLayout = results.predictions['$']['time-layout'];
            results.predictions = results.predictions['weather-conditions'];
            // looking at each prediction
            for (var i in results.predictions)
            {
               if (typeof results.predictions[i]['value'] === "undefined")
                  continue;

               // each interval is always on the hour
               // we just need to get the day.
               var hour = times[timeLayout][i];
               var day = getDay(hour); 

               if (typeof forecast[day].predictions === "undefined")
                  forecast[day].predictions = {};

               var prediction = results.predictions[i]['value'][0]['$'];
               // take the prediction and place it directly into the object.
               forecast[day].predictions[hour] = {
                  'prediction': prediction['coverage'],
                  'intensity': prediction['intensity'],
                  'weather': prediction['weather-type']
               };
            }

            console.log(JSON.stringify(forecast));
         });
      }
   });
}

exports.forecast('08901');
