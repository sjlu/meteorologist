var assert = require("assert");
var m = require("../app");

describe('forecast', function()
{
   it('the forecast object should be fully populated', function(done)
   {
      m.forecast('07946', function(e){
         assert.equal(typeof e.location, 'object');
         assert.equal('07946', e.location.zipcode);
         assert.equal(typeof e.weather, 'object');
         assert.equal(typeof e.weather[0], 'object');
         done();
      });
   });
});