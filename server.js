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
const cmd     = require('node-command-line');
const request = require('request');
const { exec } = require('child_process');

Promise = require('bluebird');

path = require('path');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(fileUpload());

app.set('views', [path.join(__dirname, '/views')]);
app.set('view engine', 'ejs');
app.use(express.static('.'));


const rules = [
	{
			type:'targetComponent',
			name:'sketch타겟',
			description:'필수 - 변환하고자 할 스캐치의 노드를 선택해주세요.',
			icon:'fa-superpowers',
			unique: true,
			elements:['node']
	},
	// {
	// 		type:'block',
	// 		name:'대응PUI블록',
	// 		description:'필수 - 어떤 PUI블록으로 변환시킬지 선택해주세요',
	// 		icon:'fa-cube',
	// 		unique: true,
	// 		elements:['block']
	// },
	{
			type:'mappingImage',
			name:'이미지매핑',
			description:'스캐치의 노드를 PUI블록의 데이터와 매핑합니다',
			icon:'fa-file-photo-o',
			unique: false,
			elements:['node','data']
	},
	{
			type:'mappingText',
			name:'텍스트매핑',
			description:'스캐치의 노드를 PUI블록의 텍스트와 매핑합니다',
			icon:'fa-file-excel-o',
			unique: false,
			elements:['node','data']
	},
	{
			type:'mappingClick',
			name:'클릭매핑',
			description:'스캐치의 노드에 클릭기능을 추가합니다',
			icon:'fa-external-link',
			unique: false,
			elements:['node','data']
	},
];


const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId;

MongoClient.connect('mongodb://muyoungko:83174584@ds243059.mlab.com:43059/sketch-loader', (err, database) => {
	if (err) return console.log(err)
	console.log('MongoClient connected');
	db = database.db('sketch-loader')

	app.listen(3000, function(){
		console.log('listening on 3000');
	});


	app.get('/main', (req, res) => {
		var revision = '10000';
		db.collection('entity').aggregate([
			{ $match: { "revision" : {$eq:revision} }},
			{
				 $lookup:
					 {
						 from: "entityRule",
						 localField: "key",
						 foreignField: "key",
						 as: "entityRule"
					 }
			},
			{ $project: { key:1, author:1, update:1, revision:1,entityRule:1}},
		]).map(function(doc){
			doc['entityRule'] = doc['entityRule'].filter(function(doc2){
				if(doc2['revision'] == revision){
					return true;
				}
				else{
					return false;
				}
			});
			return doc;
		}).toArray(function(err,results){
			res.render('template.ejs', {body_page:'main/main.ejs', list:results});
		});
	});

	app.get('/show', (req, res) => {
		var url = 'http://m.11st.co.kr/MW/CMS/PageDataAjax.tmall?pageId=MOHOMEDEAL';
		convertPuiToPlat(url, function(success, list){
			var findJson = [];
			var map = {};
			for(var i=0;i<list.length;i++)
			{
				var type = list[i]['groupName'];
				if(map[type] == undefined)
				{
					findJson[findJson.length] = {type:type};
					map[type] = '1';
				}
			}

			//console.log('findJson = ' + JSON.stringify(findJson));
			//var findJsonEntityRule = {type:'targetComponent'};
			//TODO 대상만 조회
			var findJsonEntityRule = {type:'targetComponent'};
			db.collection('entityRule').find(findJsonEntityRule).project({key:true,revision:true,value:true, type:true}).toArray((err, targetRuleInstance) => {


				var entityFindJson = [];
				var blockByKeyrevision = {};
				for(var i=0;i<targetRuleInstance.length;i++)
				{
					var rule = targetRuleInstance[i];
					var targetDataBlock = rule['value']['select2'];
					entityFindJson[entityFindJson.length] = {key:rule['key'], revision:rule['revision']};
					var keyrevision = rule['key']+ rule['revision'];
					blockByKeyrevision[keyrevision] = targetDataBlock;
				}

				db.collection('entityRule').find({$or: entityFindJson}).project({key:true,revision:true,value:true, type:true}).toArray((err, ruleInstance) => {
					db.collection('entity').find({$or: entityFindJson}).project({key:true,revision:true,cloudHtml:true}).toArray((err, entityList) => {
						//console.log(ruleInstance);

						var ruleInstanceByBlock = {};
						for(var i=0;i<ruleInstance.length;i++)
						{
								var rule = ruleInstance[i];
								var keyrevision = rule['key']+ rule['revision'];
								var block = blockByKeyrevision[keyrevision];

								if(ruleInstanceByBlock[block] == undefined)
									ruleInstanceByBlock[block] = [];
								var ruleInstanceByBlockList = ruleInstanceByBlock[block];
								ruleInstanceByBlockList[ruleInstanceByBlockList.length] = rule;
						}

						var cloudHtmlByBlock = {};
						for(var i=0;i<entityList.length;i++)
						{
								var entity = entityList[i];
								var keyrevision = entity['key']+ entity['revision'];
								var block = blockByKeyrevision[keyrevision];
								cloudHtmlByBlock[block] = entity['cloudHtml'];
								console.log('cloudHtmlByBlock add  = ' + block);
								// console.log(entity['cloudHtml']);
						}

						// console.log('cloudHtmlByBlock.length = ' + cloudHtmlByBlock.length);
						console.log('ruleInstanceByBlock = ' + JSON.stringify(ruleInstanceByBlock));

						var returnHtml = '';
						for(var i=0;i<list.length;i++)
						{
							var item = list[i];
							var block = item['groupName'];
							if(cloudHtmlByBlock[block] != null)
							{
								var div = '<li style="margin: 0 0 10px 0;">\n';
								returnHtml = returnHtml +'\n'
									+ div +'\n'
									+ wrapCloudHtml(cloudHtmlByBlock[block], ruleInstanceByBlock[block], item);
									+'\n</li>';
							}
							else
							{

								returnHtml = returnHtml + '<li style="margin: 0 0 10px 0;"><div style="background-color: coral;vertical-align: middle;text-align: center;top:0px;left:0px;width:360px;position:relative;height:100px;outline: 1px dashed red;">'
											+'<span style="vertical-align:middle;height:100px;display: inline-block;line-height: normal;">아직 스캐치가 없는 블록 - '+block+'</span></div></li>';
							}
						}
						// console.log(returnHtml);
						res.render('template.ejs', {body_page:'show/show.ejs', list:'1', returnHtml:returnHtml});
					});
				});
			});
		});
		// example
		// const query1 = MyModel.find({ name: /john/i }, null, { skip: 10 });
		// const result1 = await query1.exec();
		// const query2 = MyModel.find({ name: /john/i }, null, { skip: 100 });
		// const result2 = await query2.exec();

	});

	app.get('/blocks', (req, res) => {
		console.log("/blocks");
		db.collection('block').find({}).project({}).toArray(function(err, results) {
			console.log(results);
			res.json(results);
			//res.render('detail/block/selector.ejs', {blocks:results});
		})
	});

	app.get('/sampleData', (req, res) => {
		var json = {};
		json['key'] = req.query.key;
		json['revision'] = req.query.revision;
		var index = req.query.index;
		if(index == undefined)
			index = 0;
		db.collection('entityRule').find(json).project({}).toArray(function(err, results){
			var l = results.filter(function(obj){
				return obj['type']=='targetComponent';
			});

			var json2 = {type:l[0]['value']['select2']};
			db.collection('blockSample').find(json2).project({}).toArray(function(err2, results2) {
				var sampleLength = results2[0]['sampleData'].length;
				console.log(results2[0]['sampleData'][index%sampleLength]);
				res.json(results2[0]['sampleData'][index%sampleLength]);
			})
		});
	});


	app.get('/my', (req, res) => {
		var revision = '10000';
		db.collection('entity').aggregate([
			{ $match: { "revision" : {$eq:revision} }},
			{
				 $lookup:
					 {
						 from: "entityRule",
						 localField: "key",
						 foreignField: "key",
						 as: "entityRule"
					 }
			},
			{ $project: { key:1, author:1, update:1, revision:1,entityRule:1}},
		]).map(function(doc){
			doc['entityRule'] = doc['entityRule'].filter(function(doc2){
				if(doc2['revision'] == revision){
					return true;
				}
				else{
					return false;
				}
			});
			return doc;
		}).toArray(function(err,results){
			res.render('template.ejs', {body_page:'my/my.ejs', list:results});
		});
	});

	app.get('/downloadSketch', (req, res) => {
			var json = {};
			json['key'] = req.query.key;
			json['revision'] = req.query.revision;
			var previous = db.collection('entity').findOne(json,{raw:-1} ,function(err, results){
				var buffer = base64_decode(results['raw']);
				fileName = "a.sketch";
				res.writeHead(200, {
						"Content-Disposition": "attachment;filename=" + fileName,
						"Content-Type": "application/octet-stream",
						"Content-Lenght" : ""+buffer.length
				});
    		res.end(buffer)
			});
		});

	app.get('/detail', (req, res) => {
			var json = {};
			json['key'] = req.query.key;
			json['revision'] = req.query.revision;

			db.collection('entity').find(json).project({key:true,revision:true, cloudJson:true, cloudHtml:true}).toArray(function(err, results){
				if(results.length == 0)
				{
					res.send('wrong parameter');
					return;
				}

				var json = {};
				json['key'] = req.query.key;
				json['revision'] = req.query.revision;
				var type = req.query.type;
				var ruleId = req.query.ruleId;

				db.collection('entityRule').find(json).project({}).toArray(function(err, ruleInstance){
					res.render('template.ejs', {body_page:'detail/detail.ejs', entity:results[0], rules:rules, ruleInstance:ruleInstance});
				});
			});
		});

	app.get('/detail_rule_form', (req, res) => {
		var json = {};
		var type = req.query.type;
		var ruleId = req.query.ruleId;

		if(req.query.ruleId != 'null')
		{
			json['ruleId'] = req.query.ruleId;
			db.collection('entityRule').find(json).project({}).toArray(function(err, ruleInstance){
				var rule = getRuleMeta(rules, type);
				res.render('detail/rule/template.ejs', {rule_body:type+'.ejs'
					, key:req.query.key, revision:req.query.revision, rule:rule, type:type
					, ruleId:ruleId, ruleInstance:ruleInstance[0]
				});
			});
		}
		else {
			var rule = getRuleMeta(rules, type);
			res.render('detail/rule/template.ejs', {rule_body:type+'.ejs'
				, key:req.query.key, revision:req.query.revision, rule:rule, type:type
				, ruleId:ruleId, ruleInstance:{}
			});
		}


	});

	app.get('/detail_rule_delete', (req, res) => {
		var json = {};
		if(req.query.ruleId != 'null')
		{
			json['ruleId'] = req.query.ruleId;
			console.log('saveRdetail_rule_delete ' + req.query.ruleId);
		}


		db.collection('entityRule').remove(json, (err, result) => {
			if (err) {
				res.send(err);
				return console.log(err);
			}

			generateCloudJsonHtml(req.query.key, req.query.revision, function(success, err){
					if(success)
					{
						res.redirect('/detail?key='+req.query.key+'&revision='+req.query.revision);
					}
					else {
						console.log(err);
						return res.status(500).send(commandRes);
					}
				});
			});
	});
	app.get('/saveRule', (req, res) => {
		var json = {};
		var newvalue = {};
		if(isUniqueRule(rules, req.query.type))
		{
			json['key'] = req.query.key;
			json['revision'] = req.query.revision;
			json['type'] = req.query.type;
			console.log('saveRule - unique');
		}

		if(req.query.ruleId != 'null')
		{
			json['ruleId'] = req.query.ruleId;
			console.log('saveRule - update');
		}
		else {
			newvalue['ruleId'] = json['ruleId'] = String(Date.now());
			console.log('saveRule - new');
		}

		var type = req.query.type;
		newvalue['key'] = req.query.key;
		newvalue['revision'] = req.query.revision;
		newvalue['type'] = type;
		newvalue['update'] = String(Date.now());
		newvalue['value'] = {};
		newvalue['value']['select1'] = req.query.select1;
		newvalue['value']['select2'] = req.query.select2;
		newvalue['value']['select3'] = req.query.select3;
		newvalue['value']['select4'] = req.query.select4;
		newvalue['value']['select5'] = req.query.select5;
		db.collection('entityRule').update(json, { $set: newvalue }, { upsert: true }, (err, result) => {
			if (err) {
				res.send(err);
				return console.log(err);
			}

			generateCloudJsonHtml(req.query.key, req.query.revision, function(success, err){
					if(success)
					{
						res.redirect('/detail?key='+req.query.key+'&revision='+req.query.revision);
					}
					else {
						console.log(err);
						return res.status(500).send(commandRes);
					}
				});
			});
	});

	app.get('/detail_preview', (req, res) => {
		var json = {};
		json['key'] = req.query.key;
		json['revision'] = req.query.revision;
		var index = req.query.data_index;
		if(isEmpty(index))
			index = 0;
		db.collection('entity').find(json).project({key:true,revision:true,cloudHtml:true}).toArray(function(err, results){
			db.collection('entityRule').find(json).project({type:1,value:1}).toArray(function(err, ruleInstance){
				var targetBlock = getTargetFromRuleInstance(ruleInstance);
				var blockSampleJson = {type:targetBlock};
				db.collection('blockSample').find(blockSampleJson).project({}).toArray(function(err, blockSample){
					var cloudHtml = results[0]['cloudHtml'];
					var sampleLength = blockSample[0]['sampleData'].length;
					var sampleDataJson = blockSample[0]['sampleData'][index%sampleLength];
					//console.log(ruleInstance);
					var wrapedCloudHtml = wrapCloudHtml(cloudHtml, ruleInstance, sampleDataJson);
					res.render('detail/detail_preview.ejs', {cloudHtml:wrapedCloudHtml});
				});
			});

		});
	});

	app.get('/detail_json', (req, res) => {
		var json = {};
		json['key'] = req.query.key;
		json['revision'] = req.query.revision;
		db.collection('entity').find(json).project({key:true,revision:true,cloudJson:true}).toArray(function(err, results){
			res.json(results[0]['cloudJson']);
		});
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

					var json = {};
					json['key'] = key;
					json['revision'] = revision;

					//TODO 계정관리
					var newvalue = {'key': key, 'revision': revision ,'raw':b64,
						'author':'muyoungko',
						'update': String(Date.now())
					};
					db.collection('entity').update(json, { $set: newvalue }, { upsert: true }, (err, result) => {
						if (err) {
							func(false, err);
						}

						generateCloudJsonHtml(key, revision, function(success, err){
								if(success)
								{
									res.redirect('/detail?key='+key+'&revision='+revision);
									//res.send('finished');
								}
								else {
									console.log(err);
									return res.status(500).send(commandRes);
								}
						});


					})
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

function isUniqueRule(rules, type)
{
	for(var i=0;i<rules.length;i++)
		if(rules[i]['type'] == type && rules[i]['unique'])
			return true;
	return false;
}
function getRuleMeta(rules, type)
{
	for(var i=0;i<rules.length;i++)
		if(rules[i]['type'] == type)
			return rules[i];
	return null;
}

function convertPuiToPlat(url, func)
{
	var command1 = 'java -jar cloudlayoutconverter.jar puiconvert "'+url+'"';
	runSingleCommandWithWait(command1, function(res){
		console.log(res);
		func(true, JSON.parse(res));
	}, function(res){
		func(false, res);
	});
}
function generateCloudJsonHtml(key, revision, func)
{

	var json = {};
	json['key'] = key;
	json['revision'] = revision;
	db.collection('entityRule').find(json).project({type:1,value:1}).toArray(function(err, results){
		var jsonParam = JSON.stringify(results);
		jsonParam = jsonParam.replace(/\"/g,'\\\"');
		var command1 = 'java -jar cloudlayoutconverter.jar c "/Users/muyoungko/Documents/sketch-loader/file/'+key+'/'+revision+'" "'+jsonParam+'"';
		console.log("generateCloudJsonHtml = " + command1);
		runSingleCommandWithWait(command1, function(couldJsonRes){
			var command2 = 'java -jar cloudlayoutconverter.jar cw "/Users/muyoungko/Documents/sketch-loader/file/'+key+'/'+revision+'" "'+jsonParam+'"';
			runSingleCommandWithWait(command2, function(htmlJsonRes){

				var cloudJson = JSON.parse(couldJsonRes);
				var json = {};
				json['key'] = key;
				json['revision'] = revision;

				//TODO 계정관리
				var newvalue = {'key': key, 'revision': revision ,
					'author':'muyoungko',
					'update': String(Date.now())
				};
				newvalue['cloudJson'] = couldJsonRes;
				newvalue['cloudHtml'] = htmlJsonRes;
				db.collection('entity').update(json, { $set: newvalue }, { upsert: true }, (err, result) => {
					if (err) {
						func(false, err);
					}
					func(true);
				})
			}, function(commandRes){
				func(false, commandRes);
			});

		}, function(commandRes){
			func(false, commandRes);
		});

	});
}

function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}


function base64_decode(base64str) {
    // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
    var bitmap = new Buffer(base64str, 'base64');
		return bitmap;
    // write buffer to file
    //fs.writeFileSync(file, bitmap);
}

function isEmpty(str)
{
	if(str == undefined || str == null || str =='')
		return true;
	else
		return false;
}

//java -jar cloudlayoutconverter.jar c '/Users/muyoungko/Documents/sketch-loader/file/2D3DE24E-692C-4F98-B0A9-FEF2B759B513/10000' '{\"targetComponent\":\"ProductDeal_Shocking\"}
function runSingleCommandWithWait(command, success, failed) {
	exec(command, {maxBuffer: 1024 * 500}, function(error, stdout, stderr){
		success(stdout)
	});
	// Promise.coroutine(function *() {
	// 	var response = yield cmd.run(command);
	// 	if(response.success) {
	// 		success(response.message);
	// 		 // do something
	// 		 // if success get stdout info in message. like response.message
	// 	} else {
	// 		failed(response.message);
	// 		// do something
	// 		// if not success get error message and stdErr info as error and stdErr.
	// 		//like response.error and response.stdErr
	// 	}
	// })();
}

function getTargetFromRuleInstance(ruleInstance)
{
	var targetBlock = null;
	for(var i=0;i<ruleInstance.length;i++)
	{
		var type = ruleInstance[i]['type'];
		if(type == 'targetComponent')
		{
			targetBlock = ruleInstance[i]['value']['select2'];
			break;
		}
	}
	return targetBlock;
}
function wrapCloudHtml(cloudHtml, ruleInstance, sampleDataJson){
	var wrapedCloudHtml = cloudHtml;
	for(var i=0;i<ruleInstance.length;i++)
	{
		var type = ruleInstance[i]['type'];
		var select1 = ruleInstance[i]['value']['select1'];
		var select2 = ruleInstance[i]['value']['select2'];
		var select3 = ruleInstance[i]['value']['select3'];
		var select4 = ruleInstance[i]['value']['select4'];
		var select5 = ruleInstance[i]['value']['select5'];
		if(type == 'mappingText'){
			wrapedCloudHtml = wrapedCloudHtml.replace('{{'+select2+'}}', sampleDataJson[select2]);
		}else if(type == 'mappingImage'){
			wrapedCloudHtml = wrapedCloudHtml.replace('{{'+select2+'}}', sampleDataJson[select2]);
		}else if(type == 'mappingClick'){
			wrapedCloudHtml = wrapedCloudHtml.replace('{{'+select2+'}}', sampleDataJson[select2]);
		}
	}
	return wrapedCloudHtml;
}
