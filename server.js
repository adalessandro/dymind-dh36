var fs = require('fs');
var hl7 = require('simple-hl7');

var app = hl7.tcp();

var pretty = require('js-object-pretty-print').pretty;

app.use(function(req, res, next) {
	console.log('***** MENSAJE RECIBIDO *****')
	fs.writeFileSync('dump.json', JSON.stringify(req));
	console.log(pretty(req));
})

app.use(function(err, req, res, next) {
	console.error('***** ERROR *****')
	console.error(err);
	process.exit(1);
});

app.start(7777);

var client = hl7.Server.createTcpClient('localhost', 7777);
