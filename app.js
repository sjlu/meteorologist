var request = require('request');
var parseXml = require('xml2js').parseString;
var moment = require('moment');
var fs = require('fs');

// var url = 'http://graphical.weather.gov/xml/SOAP_server/ndfdXMLclient.php?whichClient=NDFDgenMultiZipCode&Unit=e&wx=wx&Submit=Submit';
var url = 'http://graphical.weather.gov/xml/SOAP_server/ndfdXMLclient.php?whichClient=NDFDgenMultiZipCode&product=glanceUnit=e&maxt=maxt&mint=mint&wx=wx&Submit=Submit'

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
            // other data.
            var times = {};
            var resultTimes = result['time-layout'];
            for (var i in resultTimes)
            {
               var intervals = [];
               if (typeof resultTimes[i]['end-valid-time'] === "undefined")
               {
                  for (var j = 0; j < resultTimes[i]['start-valid-time'].length-1; j++)
                  {
                     var interval = {
                        "start": moment(resultTimes[i]['start-valid-time'][j]).format(),
                        "end": moment(resultTimes[i]['start-valid-time'][j+1]).format()
                     };

                     intervals.push(interval);
                  }
               }                  
               else
               {
                  for (var j = 0; j < resultTimes[i]['start-valid-time'].length; j++)
                  {
                     var interval = {
                        "start": moment(resultTimes[i]['start-valid-time'][j]).format(),
                        "end": moment(resultTimes[i]['end-valid-time'][j]).format()
                     };

                     intervals.push(interval);
                  }
               }

               times[resultTimes[i]['layout-key'][0]] = intervals;
            }

            console.log(times);
         });
      }
   });
}

exports.forecast('07946');
