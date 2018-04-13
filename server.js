const express = require('express');
const app = express();
const bodyParser= require('body-parser');
var nunjucksRender = require('gulp-nunjucks-render');
require('nunjucks');

const MongoClient = require('mongodb').MongoClient
MongoClient.connect('mongodb://muyoungko:83174584@ds243059.mlab.com:43059/sketch-loader', (err, database) => {
	if (err) return console.log(err)
	console.log('MongoClient connected');
	db = database.db('sketch-loader')

	app.use(bodyParser.urlencoded({extended: true}))
	app.set('view engine', 'ejs')

	app.listen(3000, function(){
		console.log('listening on 3000');
	});

	app.get('/', (req, res) => {
		// res.sendFile(__dirname + '/index.html')
		var cursor = db.collection('quotes').find();
		db.collection('quotes').find().toArray(function(err, results) {
		  console.log(results);
			res.render('index.ejs', {quotes: results})
		})
	})

	app.post('/quotes', (req, res) => {

		db.collection('quotes').save(req.body, (err, result) => {
	    if (err) return console.log(err)

	    console.log('saved to database')
	    res.redirect('/')
	  })
	})
});
