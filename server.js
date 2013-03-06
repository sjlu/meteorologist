var express = require('express');
var app = express();

app.get('/', function (req, res)
{
   res.send(cities.zip_lookup(07946));
});

app.listen(4000);
console.log('http://localhost:4000');
