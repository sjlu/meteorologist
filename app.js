var request = require('request');
var parser = require('xml2js').parseString;
var moment = require('moment');
var fs = require('fs');
var _ = require('lodash');
var cities = require('cities');

var NDFD = (function() 
{
   var Time = (function() 
   {

      function Time(time)
      {
         this.time = time;
      }

      Time.prototype.getDay = function()
      {
         return parseInt(this.time.substring(0, 4) + this.time.substring(5, 7) + this.time.substring(8, 10));
      }

      Time.prototype.getHour = function()
      {
         // return this.time.substring(11, 13) + this.time.substring(14, 16);
         return parseInt(this.time.substring(11, 13));
      }

      Time.prototype.getFrame = function()
      {
         var hour = this.getHour();
         return Math.floor(hour/3)*3;
      }

      return Time;

   })();

   function NDFD(xmlobj) 
   {
      this.data = xmlobj['dwml']['data'][0];
   }

   NDFD.prototype.getTimeLayout = function(key)
   {
      return this.getTimeLayouts()[key];
   }

   NDFD.prototype.getTimeLayouts = function()
   {
      if (this.timeLayouts != null)
         return this.timeLayouts;

      var timeLayouts = {};
      var results = this.data['time-layout'];
      for (var i in results)
      {
         var intervals = [];
         for (var j = 0; j < results[i]['start-valid-time'].length; j++)
         {
            // create the interval time.
            var interval = results[i]['start-valid-time'][j];
            intervals.push(interval);
         }

         timeLayouts[results[i]['layout-key'][0]] = intervals;
      }

      this.timeLayouts = timeLayouts;
      return timeLayouts;
   };

   NDFD.prototype.getPredictions = function()
   {
      if (this.predictions != null)
         return this.predictions;

      var predictions = {};
      var results = this.data['parameters'][0]['weather'][0];
      // console.log(JSON.stringify(results));

      var timeLayout = this.getTimeLayout(results['$']['time-layout']);

      for (var j in results['weather-conditions'])
      {
         var time = new Time(timeLayout[j]);
         var day = time.getDay();
         var hour = time.getHour();

         if (results['weather-conditions'][j]['$'] != null)
         {
            predictions[day] = {
               attributes: {
                  prediction: results['weather-conditions'][j]['$']['weather-summary']
               }
            };
         }
         else if (results['weather-conditions'][j]['value'] != null)
         {
            var value = results['weather-conditions'][j]['value'];
            var string = '';
            for (var k in value)
            {
               var condition = value[k]['$'];
               string = condition.coverage + ' of ' + condition.intensity + ' ' + condition['weather-type'];
               if (condition.qualifier != 'none') string = string + ' ' + qualifier + ' ';
            }

            if (predictions[day] == null)
               predictions[day] = {};

            if (predictions[day]['hours'] == null)
               predictions[day]['hours'] = {};

            predictions[day]['hours'][hour] = string;
         }
         else
         {
            if (predictions[day] == null)
               predictions[day] = {};

            if (predictions[day]['hours'] == null)
               predictions[day]['hours'] = {};

            predictions[day]['hours'][hour] = 'clear';
         }
      }

      return predictions;
   }

   NDFD.prototype.getTemps = function()
   {
      if (this.temps != null)
         return this.temps;

      var temps = {};
      var results = this.data['parameters'][0]['temperature'];
      var types = [];

      for (var i in results)
      {
         // gotta figure out what time layout we're using.
         var timeLayout = this.getTimeLayout(results[i]['$']['time-layout']);
         
         var type = results[i]['$'].type;
         if (type == 'hourly')
            type = 'actual';

         types.push(type);

         // so each value is directly correlated to our
         // values of time layouts. we'll walk through each
         // and see the temperature for the day.
         for (var j in results[i].value)
         {
            if (typeof results[i].value[j] === "object")
               continue;

            var time = new Time(timeLayout[j]);
            var day = time.getDay();
            var hour = time.getHour();

            if (temps[day] == null)
               temps[day] = {};

            if (temps[day]['hours'] == null)
               temps[day]['hours'] = {};

            if (temps[day]['hours'][hour] == null)
               temps[day]['hours'][hour] = {}

            temps[day]['hours'][hour][type] = results[i].value[j];
         }
      }

      for (var k in temps)
      {
         if (temps[k]['attributes'] == null)
            temps[k]['attributes'] = {
               temperatures: {
                  min: {},
                  max: {}
               }
            };

         for (var z in types)
         {
            temps[k]['attributes']['temperatures']['min'][types[z]] = _.min(temps[k]['hours'], function(a) { return a[types[z]]; })[types[z]];
            temps[k]['attributes']['temperatures']['max'][types[z]] = _.max(temps[k]['hours'], function(a) { return a[types[z]]; })[types[z]];
         }
      }

      this.temps = temps;
      return temps;
   };

   return NDFD;

})();

var urls = { 
   summary: 'http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdBrowserClientByDay.php?format=24+hourly&numDays=7',
   hourly: 'http://graphical.weather.gov/xml/SOAP_server/ndfdXMLclient.php?whichClient=NDFDgenMultiZipCode&product=time-series&Unit=e&temp=temp&qpf=qpf&pop12=pop12&snow=snow&wspd=wspd&sky=sky&wx=wx&rh=rh&appt=appt&Submit=Submit'
};

exports.retrieve = function(url, type, evtHandler)
{
   request(url, function (error, response, body) 
   {
      if (error || response.statusCode != 200) 
         return evtHandler({error:'Invalid response.'});

      parser(body, function (err, result)
      {
         if (err || typeof result['dwml']['data'][0] === undefined || result.error)
            return evtHandler({error: 'Unrecognized format.'});

         return evtHandler(new NDFD(result), type);
      });
   });
};

exports.execute = function(zipcode, evtHandler)
{
   var location = cities.zip_lookup(zipcode);
   if (!location)
      return evtHandler({error: 'Location invalid.'});

   var results = {};

   var responseHandler = function(result, type)
   {
      if (result.error)
         return evtHandler(result);

      results[type] = result;

      if (_.keys(urls).length != _.keys(results).length)
         return;
      
      results.location = location;
      return evtHandler(results);
   };

   for (var type in urls)
      exports.retrieve(urls[type] + '&zipCodeList=' + zipcode, type, responseHandler);
};

exports.forecast = function(zipcode, evtHandler)
{
   if (typeof evtHandler != 'function')
      return;

   var responseHandler = function(results)
   {
      if (results.error)
         return evtHandler(results);

      var output = {
         location: results.location,
         weather: []
      };

      // var data = {
      //    forecast: results.summary.getPredictions(),
      //    temperatures: results.hourly.getTemps()
      // };

      var data = _.merge(results.summary.getPredictions(), results.hourly.getTemps());

      for (var day in data)
      {
         output.weather.push({
            day: {
               numeric: day,
               readable: moment(day, 'YYYYMMDD').format('dddd, MMMM D, YYYY')
            },
            forecast: data[day].attributes
         });
      }

      evtHandler(output);
   };

   exports.execute(zipcode, responseHandler);
};

// exports.forecast('07946', function(e) { console.log(JSON.stringify(e)); });