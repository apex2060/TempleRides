app.factory('config', function ($rootScope, $http) {
	var config = {
		gasRoot: 			'http://api.mygasfeed.com/',
		gasKey: 			'95ew4xcw7d',
		fireRoot: 			'https://templerides.firebaseio.com/',
		fireRef: 			new Firebase('https://templerides.firebaseio.com/'),
		parseRoot: 			'https://api.parse.com/1/',
	 	parseAppId: 		'VIwWYPh1DQoLbJdu6ETFL1MgaZcO9zvpaJ9legsc',
	 	parseJsKey: 		'NFgpQBYDdx8wYnzPvmAm2HroVNIGoz7nnXgc2FRC',
	 	parseRestApiKey: 	'PvINlULcuLpXBNPghG3JB2OazOlLAqCC3rYBvEpo',
	 	googleApiKey: 		'AIzaSyD4O7s4iclMErDpCyKZ__VtjfNd-LcYKhg',
	 	roles: 				['Admin','Moderator','Editor','ValidUser','BlockedUser'],

	 	dataLink: {
	 		app: 				"Member Datalink",
			parseAppId: 		"EidNJX27qA8pK7ONhftKzmPKIZ3HnhG1GEflmThN",
			parseRestApiKey: 	"SgbhNWFjKrTp6g9H5C7fg8WJKNRMPC8GGs9SyeEF",
			sessionToken: 		""
	 	}
	};
	
	config.parse = function(c){
		return config.parseRoot+'classes/'+c;
	}

	Parse.initialize(config.parseAppId, config.parseJsKey);
	$http.defaults.headers.common['X-Parse-Application-Id'] = config.parseAppId;
	$http.defaults.headers.common['X-Parse-REST-API-Key'] = config.parseRestApiKey;
	$http.defaults.headers.common['Content-Type'] = 'application/json';

	return config;
});



app.factory('settings', function ($rootScope) {
	var settings = {
		colors: {
			background: {
				driver: 	'#10663F',	//Green
				passenger: 	'#FFEDD6',	//Blue
				other: 		'#AAA'		//Grey
			},
			font: {
				driver: 	'#FFF',
				passenger: 	'#FFF',
				other: 		'#333'
			}
		}
	};
	return settings;
});