var fs = require('fs');
var hl7 = require('simple-hl7');
var path = require('path');
var XlsxTemplate = require('xlsx-template');

var app = hl7.tcp();

const templateFilename = 'HEMOGRAMA FELINO.xlsx';

function strToFloat(s) {
	return parseFloat(s.replace(',', '.'));
}

function generateExcel(filename, values) {
	fs.readFile(path.join(__dirname, templateFilename), function(err, data) {
		const template = new XlsxTemplate(data);
		const sheetNumber = 1;
		var outputValues = {};
		values['Resultados'].forEach(resultado => {
			outputValues[resultado['Parametro']] = strToFloat(resultado['Resultado']);
		});
		outputValues['PLT'] *= 1000;
		template.substitute(sheetNumber, outputValues);
		const outputData = template.generate();
		const outputFilename = filename + '.xlsx';
		fs.writeFileSync(path.join(__dirname, outputFilename), outputData, 'binary');
	});
}

app.use(function(req, res, next) {
	console.log('***** MENSAJE RECIBIDO *****')
	var ret = {};
	ret['Resultados'] = [];
	var msg = req.msg;
	var segments = msg.segments;
	segments.forEach(segment => {
		var name = segment.name;
		var fields = segment.fields;
		if (name == 'PID') {
			ret['Propietario'] = fields[4].value.join();
			ret['Genero'] = fields[7].value.join();
			ret['Paciente'] = fields[8].value.join();
			ret['Especie'] = fields[9].value.join();
		} else if (name == 'OBR') {
			ret['ID'] = fields[2].value.join();
			ret['Fecha'] = fields[6].value.join();
			ret['Veterinario'] = fields[9].value.join();
		} else if (name == 'OBX') {
			var result = {};
			result['Parametro'] = fields[2].value[0][1].value.join();
			result['Resultado'] = fields[4].value[0][0].value.join();
			result['Unidad'] = fields[5].value[0][0].value.join();
			result['Rango'] = fields[6].value[0][0].value.join();
			ret['Resultados'].push(result);
		}
	});
	console.log(ret);
	var output = [
		['Propietario', ret['Propietario']],
		['Genero', ret['Genero']],
		['Paciente', ret['Paciente']],
		['Especie', ret['Especie']],
		['ID', ret['ID']],
		['Fecha', ret['Fecha']],
		['Veterinario', ret['Veterinario']],
		['Parametro', 'Resultado', 'Unidad', 'Rango']
	];
	ret['Resultados'].forEach((r) => {
		output.push([
			r['Parametro'],
			r['Resultado'],
			r['Unidad'],
			r['Rango']
		]);
	});
	var lines = [];
	output.forEach((line) => {
		lines.push(line.join('|'));
	});
	var outputStr = lines.join('\n');
	console.log(outputStr);
	var filename = './' +
		ret['ID'] + '-' +
		ret['Paciente'] + '-' +
		ret['Propietario'];
	fs.writeFileSync(filename + '.csv', outputStr);
	generateExcel(filename, ret);
})

app.use(function(err, req, res, next) {
	console.error('***** ERROR *****')
	console.error(err);
	process.exit(1);
});

app.start(7777);

var client = hl7.Server.createTcpClient('localhost', 7777);
