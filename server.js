const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const extract = require('extract-zip');
const JSON = require('JSON');
const mv = require('mv');
const rmdirSync = require('rmdir-sync');
const cmd     = require('node-command-line'),
Promise = require('bluebird');

path = require('path');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(fileUpload());

app.set('views', [path.join(__dirname, '/views')]);
app.set('view engine', 'ejs');
app.use(express.static('.'));

const MongoClient = require('mongodb').MongoClient
MongoClient.connect('mongodb://muyoungko:83174584@ds243059.mlab.com:43059/sketch-loader', (err, database) => {
	if (err) return console.log(err)
	console.log('MongoClient connected');
	db = database.db('sketch-loader')

	app.listen(3000, function(){
		console.log('listening on 3000');
	});

	app.get('/main', (req, res) => {
			db.collection('entity').find({}).project({revision: 1, author: 1, update:1}).toArray(function(err, results) {
				// console.log(results);
				res.render('template.ejs', {body_page:'main/main.ejs', list:results});
			})
		});

	app.get('/detail', (req, res) => {
			db.collection('quotes').find().toArray(function(err, results) {
				res.render('template.ejs', {body_page:'detail/detail.ejs'});
			})
		});

	app.post('/deploy', (req, res) => {

		if (!req.files)
    return res.status(400).send('No files were uploaded.');

	  let file = req.files.file;
		console.log(req.files.file.name);
    var zip = './file/'+fileTempKey+'.zip';
		var fileTempKey = String(Date.now());
	  file.mv(zip, function(err) {
	    if (err)
	      return res.status(500).send(err);
		  var outpath = path.join(__dirname, './file/', fileTempKey);
			var b64 = base64_encode(zip);
			extract(zip, {dir: outpath}, function (err) {
				console.log('extract finished - ' + err);

				var key = getSketchKey(outpath);
				var revision = '10000';
				var json = {};

				fs.unlinkSync(zip);
				if (!fs.existsSync(path.join(__dirname, 'file', key)))
				{
					fs.mkdirSync(path.join(__dirname, 'file', key));
				}

				var targetRevisionDir = path.join(__dirname, './file/', key, revision);
				if (fs.existsSync(targetRevisionDir))
				{
					rmdirSync(targetRevisionDir);
				}



				mv(outpath, path.join(__dirname, './file/', key, revision), function(err) {
					if (err) {
						res.send(err);
						return console.log(err);
					};

					var command = 'java -jar cloudlayoutconverter.jar c "/Users/muyoungko/Documents/sketch-loader/file/'+key+'/'+revision+'" "{\"targetComponent\":\"ProductDeal_Shocking\"}"'
					runSingleCommandWithWait(command, function(commandRes){

						var cloudJson = JSON.parse(commandRes);
						json['key'] = key;
						json['revision'] = revision;

						//TODO 계정관리

						var nn = {'key': key, 'revision': revision ,'raw':b64,
							'author':'muyoungko',
							'update': String(Date.now())
						};

						console.log('-------------------------------');
						var previous = db.collection('entity').findOne(json);
						console.log('-------------------------------');
						console.log(previous);


						nn['cloudJson'] = commandRes;
						var newvalues = { $set: nn };
						db.collection('entity').update(json, newvalues, { upsert: true }, (err, result) => {
							if (err) {
								res.send(err);
								return console.log(err);
							}
							console.log('saved to database');
							console.log(b64.length);
							//res.redirect('/detail?key='+key);
							res.send('finished');
						})
					}, function(commandRes){
						return res.status(500).send(commandRes);
					});


				});
		  });
		});

		//res.render('template.ejs', {body_page:'develop/deploy.ejs'});
	});



	app.get('/develop_deploy', (req, res) => {
			res.render('template.ejs', {body_page:'develop/deploy.ejs'});
		});
});

function getSketchKey(sketch_dir) {
	var items = fs.readdirSync(sketch_dir+"/pages");
	for (var i=0; i<items.length; i++) {
			var json = require(path.join(sketch_dir, 'pages', items[i]));
			if(json['name'] != 'Symbols')
			{
				return json['do_objectID'];
			}
	}
	throw error;
}

function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}


function base64_decode(base64str, file) {
    // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
    var bitmap = new Buffer(base64str, 'base64');
    // write buffer to file
    fs.writeFileSync(file, bitmap);
}



//java -jar cloudlayoutconverter.jar c '/Users/muyoungko/Documents/sketch-loader/file/2D3DE24E-692C-4F98-B0A9-FEF2B759B513/10000' '{\"targetComponent\":\"ProductDeal_Shocking\"}
function runSingleCommandWithWait(command, success, failed) {
	Promise.coroutine(function *() {
		var response = yield cmd.run(command);
		if(response.success) {
			success(response.message);
			 // do something
			 // if success get stdout info in message. like response.message
		} else {
			failed(response.message);
			// do something
			// if not success get error message and stdErr info as error and stdErr.
			//like response.error and response.stdErr
		}
	})();
}
