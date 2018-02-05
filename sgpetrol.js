//Dialogflow: SGPetrol
'use strict';

//SPC: https://www.spc.com.sg/wp-content/themes/spc-dev/webservice-pump-price.php
//Caltex: https://www.caltex.com/sg/motorists/products-and-services/fuel-prices.html
//Shell: https://www.shell.com.sg/motorists/shell-fuels/shell-station-price-board.html
//Esso: N/A 

const express = require('express');
const bodyParser = require('body-parser');
const exps = express();
const cheerio = require('cheerio');
const request = require('request');
const { DialogflowApp } = require('actions-on-google');

let arrayData = [];
let arrayData92 = [];
let arrayData95 = [];
let arrayData98 = [];
let arrayDataDiesel = [];

// API.AI actions
const ACTION_WELCOME = 'input.welcome';
const ACTION_PETROLPRICE = 'action.PetrolPrice';
const ACTION_INPUTUNKNOWN = 'input.unknown';

let SHELL_IMG_URL_PICTURE = 'http://duocompass.com/img_station/shell-image.png';
let CALTEX_IMG_URL_PICTURE = 'http://duocompass.com/img_station/caltex-image.png';
let SPC_IMG_URL_PICTURE = 'http://duocompass.com/img_station/spc-image.png';
let ESSO_IMG_URL_PICTURE = 'http://duocompass.com/img_station/esso-image.png';

let CALTEX_URL = 'https://www.caltex.com/sg/motorists/products-and-services/fuel-prices.html';
let SHELL_URL = 'https://www.shell.com.sg/motorists/shell-fuels/shell-station-price-board.html';
let SPC_URL = 'https://www.spc.com.sg/our-business/spc-service-station/latest-pump-price';
let ESSO_URL = 'https://www.esso.com.sg/fuels';

let askagain = ' Any other petrol prices that you would like to know ?';
let errormsg = 'Something error happened. Please say it again';

let words = [
    ['Caltex', ''],
    ['Shell', ''],
    ['SPC', ''],
    ['Esso', '']
];


function SPC(cb) {
	request({
		method: 'GET',
		url: 'https://www.spc.com.sg/wp-content/themes/spc-dev/webservice-pump-price.php'
	}, function(err, response, body) {
		if (err) {
			console.log('error: ' + err);
			cb('error');
		} else {
			let data = JSON.parse(body);
			for(let i=0; i < data.pump_list.length; i++) {
				arrayData.push({
					'id': 1,
					'provider' : 'SPC',
					'last_update': data.latest_update_date.trim() + ' ' + data.latest_update_time.trim() + 'hrs.',
					'pump_name': data.pump_list[i].pump_name.trim(),
					'pump_price': Number(data.pump_list[i].pump_price.trim()),
				});
			}
			cb(arrayData);
		}
	});
}

function Caltex(cb) {
	request({
		method: 'GET',
		url: 'https://www.caltex.com/sg/motorists/products-and-services/fuel-prices.html'
	}, function(err, response, body) {
		if (err) {
			console.log('error: ' + err);
			cb('error');
		} else {
			let lastupdate;
			const $ = cheerio.load(body);
			$('.info-text').each(function(idx, elm) {
					let $elm = $(elm);
					let str = $elm.find('p').text().toString();
					if(idx == 0) {
						lastupdate = str.substr(14, str.length); //Last updated:
						let month = lastupdate.trim().split(' ')[0].substring(0,3);
						lastupdate = lastupdate.trim().split(' ')[1].substring(0, lastupdate.trim().split(' ')[1].length-1) + ' ' + month + ' ' + lastupdate.trim().split(' ')[2] + ' ' + lastupdate.trim().split(' ')[3];
					}
			});
			$('.price-item').each(function(idx, elm) {
					let $elm = $(elm);
					let str = $elm.find('p').text().toString();

					arrayData.push({
						'id': 2,
						'provider' : 'Caltex',
						'last_update': lastupdate,
						'pump_name': str.split('SGD')[0].trim(),
						'pump_price': Number(str.split('SGD')[1].trim()),
					});
			});
			cb(arrayData);
		}
	});
}

function Shell(cb) {
	request({
		method: 'GET',
		url: 'https://www.shell.com.sg/motorists/shell-fuels/shell-station-price-board.html'
	}, function(err, response, body) {
		if (err) {
			console.log('error: ' + err);
			cb('error');
		} else {
			let lastupdate;
			const $ = cheerio.load(body);
			$('.text-image__text').each(function(idx, elm) {
					let $elm = $(elm);
					let str = $elm.find('p strong').text().toString();
					if(idx == 0)
						lastupdate = str;
			});

			$('tr').each(function(idx, elm) {
					let $elm = $(elm);
					let str = $elm.find('td').text().toString();
					if(str.split('$') != '') {
						
						let month = lastupdate.trim().split(' ')[1].toLowerCase();
						lastupdate = lastupdate.trim().split(' ')[0] + ' ' + capitalize(month) + ' ' + lastupdate.trim().split(' ')[2] + ' ' + lastupdate.trim().split(' ')[3];

						arrayData.push({
							'id': 3,
							'provider' : 'Shell',
							'last_update': lastupdate,
							'pump_name': str.split('$')[0].trim(),
							'pump_price': Number(str.split('$')[1].trim()),
						});
					}
			});
			cb(arrayData);
		}
	});
}

function Esso(callback) {
}

function FuelPriceByProvider(app, petrolprovider, returnValue) {
	let list = app.buildList(petrolprovider + ': ' + returnValue[0].last_update);
	for (let i = 0; i < returnValue.length; i++) {
		list.addItems(app.buildOptionItem(petrolprovider + '|' + i, petrolprovider + '|' + i)
		.setTitle(returnValue[i].pump_name)
		.setDescription('S$' + returnValue[i].pump_price)
		.setImage('http://duocompass.com/img_station/' + petrolprovider.toLowerCase() + '-image.png', 'image' + i))
	}

	let link;
	if(petrolprovider == 'Shell')
		link = SHELL_URL;
	if(petrolprovider == 'SPC')
		link = SPC_URL;
	if(petrolprovider == 'Caltex')
		link = CALTEX_URL;
	if(petrolprovider == 'Esso')
		link = ESSO_URL;

	app.askWithList(app.buildRichResponse()
		.addSuggestions(['SPC', 'Caltex', 'Shell', 'Esso'])
		.addSuggestionLink(petrolprovider + ' website', link)
		.addSimpleResponse('Here you go on ' + petrolprovider + ' petrol price list. ' + askagain), list);
}

function FuelPrice(option, cb) {
	arrayData = [];
	arrayData92 = [];
	arrayData95 = [];
	arrayData98 = [];
	arrayDataDiesel = [];

	Esso(function(returnValue) {
	});

	SPC(function(returnValue) {
		if(returnValue != 'error')
			Shell(function(returnValue) {
				if(returnValue != 'error')
					Caltex(function(returnValue) {
						if(returnValue != 'error') {

							//92-Octane
							if(option == '92') {
								for(let i=0; i < returnValue.length; i++) {
									if(returnValue[i].pump_name.toLowerCase().indexOf('92') != -1) {
										arrayData92.push({
											'id': returnValue[i].id,
											'provider': returnValue[i].provider,
											'lastupdate': returnValue[i].last_update,
											'pump_price': returnValue[i].pump_price
										});
									}
								}
								arrayData92.sort(function(obj1, obj2) {
									return obj1.pump_price - obj2.pump_price;
								});
								cb(arrayData92);
							}

							//95-Octane
							else if(option == '95') {
								for(let i=0; i < returnValue.length; i++) {
									if(returnValue[i].pump_name.toLowerCase().indexOf('95') != -1) {
										arrayData95.push({
											'id': returnValue[i].id,
											'provider': returnValue[i].provider,
											'lastupdate': returnValue[i].last_update,
											'pump_price': returnValue[i].pump_price
										});
									}
								}
								arrayData95.sort(function(obj1, obj2) {
									return obj1.pump_price - obj2.pump_price;
								});
								cb(arrayData95);
							}

							//98-Octane
							else if(option == '98') {
								for(let i=0; i < returnValue.length; i++) {
																		if(returnValue[i].pump_name.toLowerCase().indexOf('98') != -1 || returnValue[i].pump_name.toLowerCase().indexOf('nitro') != -1) {
										arrayData98.push({
											'id': returnValue[i].id,
											'provider': returnValue[i].provider,
											'lastupdate': returnValue[i].last_update,
											'pump_price': returnValue[i].pump_price
										});
									}
								}
								arrayData98.sort(function(obj1, obj2) {
									return obj1.pump_price - obj2.pump_price;
								});
								cb(arrayData98);
							}

							//Diesel
							else if(option == 'diesel') {
								for(let i=0; i < returnValue.length; i++) {
									if(returnValue[i].pump_name.toLowerCase().indexOf('diesel') != -1) {
										arrayDataDiesel.push({
											'id': returnValue[i].id,
											'provider': returnValue[i].provider,
											'lastupdate': returnValue[i].last_update,
											'pump_price': returnValue[i].pump_price
										});
									}
								}
								arrayDataDiesel.sort(function(obj1, obj2) {
									return obj1.pump_price - obj2.pump_price;
								});
								cb(arrayDataDiesel);
							}
							else if(option === 'show all') {
								cb(returnValue);
							}
						}
						else
							cb('error');
					})
				else
					cb('error');
			})
		else
			cb('error');
	});
}

function getproperAddr(str) {
    let res = '';
    let cnt = 1;
    str = str.split(' ');
    for (let d = 0; d < str.length; d++) {
        cnt = 1;
        for (let h = 0; h < words.length; h++) {
            if (str[d].toLowerCase() == words[h][0].toLowerCase()) {
                res += str[d].replace(str[d], words[h][1]) + ' ';
                cnt--;
            } else {
                if (cnt == words.length)
                    res += str[d] + ' ';
            }
            cnt++
        }
    }
    res = res.substring(0, res.length - 1);
    return (res.trim());
}

function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
}

function init() {
	exps.use(bodyParser.json());
	exps.post('/hook', function(request, response) {
		const app = new DialogflowApp({request, response});

		function WelcomeIntent(app) {
        }

		function PetrolPriceIntent(app) {
			let petroltype = app.getArgument('PetrolType');
			let petrolprovider = app.getArgument('PetrolProvider');
			let gso = app.getSelectedOption();
			
			console.log('petroltype: ' + petroltype +', petrolprovider: ' + petrolprovider);
			console.log('gso: ' + gso);
			
			if(petroltype != null ) {
				let title;

				FuelPrice(petroltype, function(returnValue) {
					if(returnValue != 'error') {
						if(petroltype.toLowerCase() === 'show all') {
							let list = app.buildList('Petrol prices list');
							for (let i = 0; i < returnValue.length; i++) {
								title = getproperAddr(returnValue[i].pump_name);
								list.addItems(app.buildOptionItem(returnValue[i].id + '|' + i, [returnValue[i].id + '|' + i])
								.setTitle(title)
								.setDescription('S$' + returnValue[i].pump_price)
								.setImage('http://duocompass.com/img_station/' + returnValue[i].provider.toLowerCase() + '-image.png', 'image' + i))

							}
							if(petroltype == '92' || petroltype == '95' || petroltype == '98')
									petroltype = petroltype + '-Octane';

							app.askWithList(app.buildRichResponse()
							.addSuggestions(['92-Octane', '95-Octane', '98-Octane', 'Diesel', 'Show All'])
							.addSimpleResponse('Here you go for all petrol price.' + askagain), list);

						} else {
							if(petroltype == '92' || petroltype == '95' || petroltype == '98')
									petroltype = petroltype + '-Octane';

							let list = app.buildList(capitalize(petroltype));
							for (let i = 0; i < returnValue.length; i++) {
								list.addItems(app.buildOptionItem(returnValue[i].id + '|' + i, returnValue[i].id + '|' + i)
								.setTitle(i + 1 + '. S$' + returnValue[i].pump_price)
								.setDescription(null)
								.setImage('http://duocompass.com/img_station/' + returnValue[i].provider.toLowerCase() + '-image.png', 'image' + i))
							}

							app.askWithList(app.buildRichResponse()
							.addSuggestions(['92-Octane', '95-Octane', '98-Octane', 'Diesel', 'Show All'])
							.addSimpleResponse('Here you go for ' + petroltype + ' petrol price.' + askagain), list);
						}
					}
					else 
						app.ask(errormsg);
				})

			} 
			else if(petrolprovider != null) {
				arrayData = [];
				if(petrolprovider == 'SPC')
					SPC(function(returnValue) {
						if(returnValue != 'error') 
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});

				if(petrolprovider == 'Shell')
					Shell(function(returnValue) {
						if(returnValue != 'error') 
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});

				if(petrolprovider == 'Caltex') {
					Caltex(function(returnValue) {
						if(returnValue != 'error') 
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});
				}

				if(petrolprovider == 'Esso') {
					Esso(function(returnValue) {
						if(returnValue != 'error') 
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});
				}
			}
			else if(petroltype == null && petrolprovider == null && gso != null) {
				if(gso.split('|')[0] == 1 || gso.split('|')[0] == 'SPC')
					petrolprovider = 'SPC';

				if(gso.split('|')[0] == 2 || gso.split('|')[0] == 'Caltex')
					petrolprovider = 'Caltex';

				if(gso.split('|')[0] == 3 || gso.split('|')[0] == 'Shell')
					petrolprovider = 'Shell';

				if(gso.split('|')[0] == 4 || gso.split('|')[0] == 'Esso')
					petrolprovider = 'Esso';
				
				arrayData = [];
				if(petrolprovider == 'SPC')
					SPC(function(returnValue) {
						if(returnValue != 'error')
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});

				if(petrolprovider == 'Shell')
					Shell(function(returnValue) {
						if(returnValue != 'error')
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});

				if(petrolprovider == 'Caltex') 
					Caltex(function(returnValue) {
						if(returnValue != 'error')
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});

				if(petrolprovider == 'Esso') 
					Esso(function(returnValue) {
						if(returnValue != 'error')
							FuelPriceByProvider(app, petrolprovider, returnValue);
						else
							app.ask(errormsg);
					});
			} 
		}
		
		function InputUnkownIntent(app) {
            console.log('inputunknown');
        }

		const actionMap = new Map();
		actionMap.set(ACTION_WELCOME, WelcomeIntent);
		actionMap.set(ACTION_PETROLPRICE, PetrolPriceIntent);
		actionMap.set(ACTION_INPUTUNKNOWN, InputUnkownIntent);
		app.handleRequest(actionMap)
	});

	exps.listen((process.env.PORT || 8000), function() {
		console.log("SGPetrol: App up and running, listening.")
	});
}

init();

