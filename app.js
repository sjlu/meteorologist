var request = require('request');
var parser = require('xml2js').parseString;
var moment = require('moment');
var fs = require('fs');
var _ = require('lodash');
var cities = require('cities');

// This function is a general overhead on
// parsing and extracting NDFD data from
// the NOAA.
var NDFD = (function() 
{
   // The Time function helps with extracting UTC
   // time encodes. We do this because we don't
   // want the Date() function to change what time
   // zone we are in. In this case, we're just doing
   // a bunch of substrings so keep timezone.
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

      // getFrame will be used to normalize data
      // for hour to hour, which will help limit
      // the number of data points we have.
      Time.prototype.getFrame = function()
      {
         var hour = this.getHour();
         return Math.floor(hour/3)*3;
      }

      return Time;

   })();

   // create a new object, must place a parsed
   // XML file into the NDFD.
   function NDFD(xmlobj) 
   {
      this.data = xmlobj['dwml']['data'][0];
   }

   // get a singular NDFD timeLayout based
   // on the keyvalue. see getTimeLayouts
   NDFD.prototype.getTimeLayout = function(key)
   {
      return this.getTimeLayouts()[key];
   }

   // parse all the timeLayouts that the
   // NOAA uses for this NDFD response.
   NDFD.prototype.getTimeLayouts = function()
   {
      if (this.timeLayouts != null)
         return this.timeLayouts;

      var timeLayouts = {}; // this is what we're returning
      var results = this.data['time-layout']; // this is the XML response
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

   // We need to get a series of predictions that
   // the NOAA provides us. There's multiple types
   // so follow along.
   NDFD.prototype.getPredictions = function()
   {
      if (this.predictions != null)
         return this.predictions;

      var predictions = {}; // what we will return
      var results = this.data['parameters'][0]['weather'][0]; // what they give us.
      // console.log(JSON.stringify(results));

      var timeLayout = this.getTimeLayout(results['$']['time-layout']); // what time format we need to use to parse out the data

      // this loops through all the time interations
      // that the result set has according to the
      // timeLayout
      for (var j in results['weather-conditions'])
      {
         // don't worry, the number of results should
         // always equal the number of layout times we have.
         var time = new Time(timeLayout[j]);
         var day = time.getDay();
         var hour = time.getHour();

         // if this condition has something, we assume that
         // it contains summary information. or in this case
         // day by day forcasts.
         if (results['weather-conditions'][j]['$'] != null)
         {
            predictions[day] = {
               attributes: { // attributes is used to describe the day
                  prediction: results['weather-conditions'][j]['$']['weather-summary']
               }
            };
         }
         // it's either one or the other, this one assumes
         // that we contain hour by hour data (or something close).
         else if (results['weather-conditions'][j]['value'] != null)
         {
            var value = results['weather-conditions'][j]['value'];
            var string = '';

            // when we get here, unfortunately there could be
            // multiple conditions that the result set has.
            // for example: "likely to moderately rain and likely to snow"
            for (var k in value)
            {
               var condition = value[k]['$'];
               // TODO: depending on the word of "coverage", we need to place it accordingly
               // read http://graphical.weather.gov/docs/grib_design.html
               string = condition.coverage + ' of ' + condition.intensity + ' ' + condition['weather-type'];
               if (condition.qualifier != 'none') string = string + ' ' + qualifier + ' ';
            }

            // ignore these statements, 
            // they are just to build out the array.
            if (predictions[day] == null)
               predictions[day] = {};

            if (predictions[day]['hours'] == null)
               predictions[day]['hours'] = {};

            predictions[day]['hours'][hour] = string;
         }
         // if we absoutely come upon nothing
         // I guess the weather is clear?
         // we really gotta figure this one out.
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

   // This will generate temperatures for us.
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
         
         // hourly sounds bad, switching this to acutal.
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

            // don't worry about this, its just
            // building out our array.
            if (temps[day] == null)
               temps[day] = {};

            if (temps[day]['hours'] == null)
               temps[day]['hours'] = {};

            if (temps[day]['hours'][hour] == null)
               temps[day]['hours'][hour] = {}

            temps[day]['hours'][hour][type] = results[i].value[j];
         }
      }

      // this part adds in the day temperature
      // attributes. We want to find min and max.
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
            // ugly, but this finds our min and max for us for each type
            // of temperature we have.
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

// generic execution function to call
// and retrieve data. Once it finishes
// parsing it will call the vent handler
// with its results.
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

// execute just tells us to go grab data.
exports.execute = function(zipcode, evtHandler)
{
   var location = cities.zip_lookup(zipcode);
   if (!location)
      return evtHandler({error: 'Location invalid.'});

   var results = {};

   // since we have multiple URLs to hit, this is
   // here to make sure we got data for everything,
   // then we send it out to the evtHandler.
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

// this is an actual function generates a day
// to day forecast.
exports.forecast = function(zipcode, evtHandler)
{
   if (typeof evtHandler != 'function')
      return;

   // new NDFD objects are passed through here
   // and given to us. We want to then use 
   // these NDFD objects to generate our 
   // weather prediction outputs.
   var responseHandler = function(results)
   {
      if (results.error)
         return evtHandler(results);

      var output = {
         location: results.location,
         weather: []
      };

      var data = _.merge(results.summary.getPredictions(), results.hourly.getTemps());

      // formatting related.
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