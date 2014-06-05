var it = {};

var app = angular.module('TempleRides', ['firebase','pascalprecht.translate','ngAnimate','ngResource','ngRoute','ngTouch','ui.calendar'])
.config(function($routeProvider,$translateProvider) {
	$routeProvider

	.when('/signup/:id/:email', {
		templateUrl: 'views/signup.html',
		controller: 'MainCtrl'
	})
	.when('/:view', {
		templateUrl: 'views/main.html',
		controller: 'MainCtrl'
	})
	.when('/:view/:id', {
		templateUrl: 'views/main.html',
		controller: 'MainCtrl'
	})
	.when('/:module/:view/:id', {
		templateUrl: 'views/main.html',
		controller: 'MainCtrl'
	})
	.otherwise({
		redirectTo: '/home'
	});

	$translateProvider.useStaticFilesLoader({
		prefix: 'assets/languages/',
		suffix: '.json'
	});
	$translateProvider.uses('en');
});


angular.element(document).ready(function() {
	angular.bootstrap(document, ['TempleRides']);
});