var program = require('commander');
var request = require('request');
var fs = require('fs');

program
    .version('0.1')
    .option('-i, --input [url]', 'Input json url or path')
    .option('-o, --output [url]', 'Output json url or path')
    .option('-I, --ID [id]', 'Graph id')
    .parse(process.argv);

var layout = require('./layout/index');

var inputFile = program.input;
var outputFile = program.output;
if (inputFile.indexOf('http://') >= 0 || inputFile.indexOf('https://') >= 0) {
    request(inputFile, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            layout(data);
            writeBack(data);
        }
    });
} else {
    var content = fs.readFileSync(inputFile, 'UTF-8');
    var data = JSON.parse(content);
    layout(data);
    writeBack(data);
}

function writeBack(data) {
    if (outputFile.indexOf('http://') >= 0 || outputFile.indexOf('https://') >= 0) {
        request.post(outputFile, {
            form: {
                id: program.ID,
                data: JSON.stringify(data)
            }
        }, function (args, response, body) {
            console.log(body);
        });
    } else {
        fs.writeFileSync(outputFile, JSON.stringify(data), 'UTF-8');
    }
};