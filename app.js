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
            result = result.dwml.data[0];

            // we need to parse the time frames out,
            // so that way we can use it parse 
            // other data out
            var times = {};
            var resultTimes = result['time-layout'];
            for (var i in resultTimes)
            {
               var intervals = [];
               for (var j = 0; j < resultTimes[i]['start-valid-time'].length; j++)
               {
                  var interval = {
                     "start": moment(resultTimes[i]['start-valid-time'][j]).format('X'),
                  };

                  intervals.push(interval);
               }

               times[resultTimes[i]['layout-key'][0]] = intervals;
            }

            // building out temperature to days.
            var temps = {};
            var resultTemps = result['parameters'][0]['temperature'];
            for (var i in resultTemps)
            {
               var timeLayout = resultTemps[i]['$']['time-layout'];
               var type = resultTemps[i]['$'].type;
               if (type == 'maximum')
                  type = 'high';
               else
                  type = 'low';

               for (var j in resultTemps[i].value)
               {
                  var day = getDay(times[timeLayout][j].start);

                  if (typeof temps[day] === "undefined")
                     temps[day] = {};

                  temps[day][type] = resultTemps[i].value[j];
               }
            }

            // building out hour to hour forecasts to days.
            var predictions = {};
            var resultWeather = result['parameters'][0]['weather'][0];
            var timeLayout = resultWeather['$']['time-layout'];
            resultWeather = resultWeather['weather-conditions'];
            for (var i in resultWeather)
            {
               if (typeof resultWeather[i]['value'] === "undefined")
                  continue;

               var hour = times[timeLayout][i].start;
               var day = getDay(hour); 

               if (typeof predictions[day] === "undefined")
                  predictions[day] = {};

               predictions[day][hour] = resultWeather[i]['value'][0]['$'];
            }

            console.log(predictions);
         });
      }
   });
}

exports.forecast('08901');
