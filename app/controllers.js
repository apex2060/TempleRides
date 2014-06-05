var MainCtrl = app.controller('MainCtrl', function($rootScope, $scope, $routeParams, $location, $http, config, userService, geoService){
	$rootScope.action = $routeParams.action;
	$rootScope.view = $routeParams.view;
	$rootScope.id = $routeParams.id;
	$rootScope.email = $routeParams.email;
	$rootScope.config = config;

	function setup(){
		$scope.$on('$viewContentLoaded', function(event) {
			ga('send', 'pageview', $location.path());
		});
	}

	var tools = {
		user: userService,
		setGeo:function(geo){
			if(!$rootScope.temp.user)
				$rootScope.temp.user = {};
			$rootScope.temp.user.geo = geoService.parsePoint(geo);
		},
		url:function(){
			if($rootScope.user || $routeParams.view == 'about' || $routeParams.view == 'signup')
				return 'views/'+$routeParams.view+'.html';
			else
				return 'views/restricted.html';
		},

		side:{
			set:function(side,url){
				$rootScope.side[side]=url;
				if(!$('#aside_'+side).hasClass('show'))
					$('#aside_'+side).removeClass('hide').addClass('show');
			},
			get:function(side){
				return $rootScope.side[side]
			},
			hide:function(side){
				$('#aside_'+side).removeClass('show').addClass('hide');
			},
			show:function(side){
				$('#aside_'+side).removeClass('hide').addClass('show');
			}
		},
		setup:function(){
			userService.init();
			setup();
			$rootScope.data=	{};
			$rootScope.resource={};
			$rootScope.temp=	{};
			$rootScope.side=	{};
			$rootScope.mode=	'normal';
			// tools.side.set('left','partials/shoeboxlist/sidebar.html')
			// tools.side.set('right','partials/sidebar.html')
		},
		signup:function(user){
			user.token=$routeParams.id;
			if($routeParams.email)
			user.email=$routeParams.email;
			tools.user.signup(user)
		},
		accountInit: function(){
			$rootScope.temp.user = angular.fromJson(angular.toJson($rootScope.user))
		},
		settings:function(user){
			var us = {}
				us.emailNotifications = user.emailNotifications
				us.phoneNotifications = user.phoneNotifications
			if(user.phone)
				us.phone = user.phone
			if(user.address)
				us.address = user.address
			if(user.email)
				us.email = user.email
			if(user.geo){
				us.geo = user.geo
				$rootScope.$broadcast('geoChange', user.geo);
			}

			$http.put(config.parseRoot+'users/'+$rootScope.user.objectId, us).success(function(data){
				$rootScope.error = null;
				$rootScope.success = data;
			}).error(function(error){
				$rootScope.error = error;
			})
		},
		invite: function(invitation){
			invitation.status = 'sending';
			$http.post(config.parseRoot+'classes/invitations', invitation)
				.success(function(response){
					console.log('invitation success: ', response);
					invitation.status='active';
				})
				.error(function(response){
					console.log('invitation error: ', response);
				})
		},
		clearInvite:function(){
			$rootScope.temp.invitation = {};
		}
	}
	$scope.tools = tools;
	$rootScope.mainTools = tools;

	if(!$rootScope.data){
		tools.setup();
	}
	it.MainCtrl=$scope;
});










var RideCtrl = app.controller('RideCtrl', function($rootScope, $scope, $q, $sce, $http, config, settings, dataService, userService){
	console.log('RIDE CONTROLLER')
	$scope.moment = moment;
	$http.get('/assets/json/temples.json').success(function(data){
		$scope.templeList = data.temples;
	})

	$scope.formated = {
		driver: {
			color: settings.colors.background.driver,
			textColor: settings.colors.font.driver,
			events: []
		},
		passenger: {
			color: settings.colors.background.passenger,
			textColor: settings.colors.font.passenger,
			events: []
		},
		other: {
			color: settings.colors.background.other,
			textColor: settings.colors.font.other,
			events: []
		}
	}

	var allRides = $q.defer();
	userService.user().then(function(user){
		var liveId = $rootScope.user.geo.latitude.toString().split('.')[0]+$rootScope.user.geo.longitude.toString().split('.')[0];
		var timestamp = new Date().getTime();
		var rideResource = new dataService.resource(
			'rides', 
			'rideList/'+liveId, 
			true, 
			true, 
			config.parseRoot+'functions/rideList', 
			{timestamp: timestamp}
		);
			// ar.setQuery('');
		allRides.resolve(rideResource);
		rideResource.item.list().then(function(data){
			$scope.rides = data;
			$scope.formated.driver.events 		= tools.formatRides(data.results.driver, 'driver');
			$scope.formated.passenger.events 	= tools.formatRides(data.results.passenger, 'passenger');
			$scope.formated.other.events 		= tools.formatRides(data.results.other, 'other');
		})
		$rootScope.$on(rideResource.listenId, function(event, data){
			$scope.rides = data;
			if(data){
				$scope.formated.driver.events 		= tools.formatRides(data.results.driver, 'driver');
				$scope.formated.passenger.events 	= tools.formatRides(data.results.passenger, 'passenger');
				$scope.formated.other.events 		= tools.formatRides(data.results.other, 'other');
			}
		})
	});
	var allRidesPromise = allRides.promise;

	var tools = {
		formatRides: function(rides, type){
			var rideList = [];
			if(rides)
				for(var i=0; i<rides.length; i++){
					var tRide = angular.fromJson(angular.toJson(rides[i]))

					tRide.title 	= tRide.temple;
					tRide.type 		= type;
					tRide.start 	= new Date(tRide.date+' '+tRide.leaving);
					tRide.end 		= new Date(tRide.date+' '+tRide.returning);
					tRide.allDay 	= false;

					rideList.push(tRide);
				}
			return rideList;
		},
		ride:{
			ind: function(){
				allRidesPromise.then(function(rideResource){
					$rootScope.$on(rideResource.listenId, function(event, data){
						tools.ride.get($rootScope.id).then(function(ride){
							$scope.ride = ride;
							if(ride.type=='driver')
								tools.ride.passengerList(ride);
						})
					});
				});
			},
			get: function(rideId){
				var ride = $q.defer();
				allRidesPromise.then(function(rideResource){
					var rideTypes = ['driver','passenger','other']
					var rides = $scope.formated;
					for(var t=0; t<rideTypes.length; t++){
						var list = rides[rideTypes[t]].events;
						for(var i=0; i<list.length; i++){
							if(list[i].objectId == rideId){
								list[i].type = rideTypes[t];
								ride.resolve(list[i]);
							}
						}
					}
				})
				return ride.promise;
			},
			display: function(ride){
				if(ride.type=='driver'){
					var passengers = ride.seats-ride.seatsAvail;
					if(passengers == 0)
						return 'No one is going yet, but you have set up a ride for '+moment(ride.start).format('dddd MMMM Do [at] h:mm a');
					else if(passengers == 1)
						return 'You are giving a ride to one person '+moment(ride.start).format('dddd MMMM Do [at] h:mm a');
					else
						return 'You are giving a ride to '+(ride.seats-ride.seatsAvail)+' people '+moment(ride.start).format('dddd MMMM Do [at] h:mm a');
				}else if(ride.type=='passenger')
					return 'You will be picked up to go to the temple: '+moment(ride.start).format('dddd MMMM Do [at] h:mm a');
				else 
					return 'A ride to the '+ride.temple+' is available: '+moment(ride.start).format('dddd MMMM Do [at] h:mm a');
			},
			focus: function(ride){
				$scope.temp.reservationStatus = null;
				$rootScope.temp.focus = ride;
				$rootScope.mainTools.side.set('right','partials/side/'+ride.type+'.html');
				console.log(ride.type)
				if(ride.type=='driver')
					tools.ride.passengerList(ride);
			},
			add: function(ride){
				ride.timestamp = new Date(ride.date+' '+ride.leaving).getTime();
				ride.status = 'active';
				ride.temple = ride.temple.name;
				allRidesPromise.then(function(rideResource){
					rideResource.item.save(ride)
				})
				$scope.temp.ride = {};
			},
			remove: function(ride){
				var infoToSave = {
					objectId: ride.objectId,
					status: 'removed'
				}
				if(confirm('Are you sure you want to delete this ride?')){
					allRidesPromise.then(function(rideResource){
						rideResource.item.save(infoToSave)
					})
					$scope.temp.ride = {};
				}
			},
			reserve: function(ride){
				$scope.temp.reservationStatus = 'processing';
				$http.post(config.parseRoot+'functions/joinRide', {objectId: ride.objectId}).then(function(response){
					if(response.data.result && response.data.result.updatedAt){
						$scope.temp.reservationStatus = 'reserved';
						allRidesPromise.then(function(rideResource){
							rideResource.broadcast(response.data.result.updatedAt)
						})
					}else{
						$scope.temp.reservationStatus = 'error';
					}
				})
			},
			cancelReservation: function(ride){
				$scope.temp.reservationStatus = 'processing';
				$http.post(config.parseRoot+'functions/leaveRide', {objectId: ride.objectId}).then(function(response){
					if(response.data.result && response.data.result.updatedAt){
						$scope.temp.reservationStatus = 'canceled';
						allRidesPromise.then(function(rideResource){
							rideResource.broadcast(response.data.result.updatedAt)
						})
					}else{
						$scope.temp.reservationStatus = 'error';
					}
				})
			},
			list: function(){
				$http.post(config.parseRoot+'functions/rideList', {}).then(function(response){
					console.log('Ride List Response: ', response)
				})
			},
			passengerList: function(ride){
				$http.post(config.parseRoot+'functions/passengerList', {objectId: ride.objectId}).then(function(response){
					var passengers = response.data.result;
					$scope.temp.passengers = passengers;
					var details = '?'
								+ 'key=' + config.googleApiKey
								+ '&origin='+$rootScope.user.geo.latitude+','+$rootScope.user.geo.longitude
								+ '&destination='+ride.temple
					if(passengers.length>0){
						var waypoints = passengers[0].geo.latitude+','+passengers[0].geo.longitude;
						for(var i=1; i<passengers.length; i++)
							waypoints += '|' + passengers[i].geo.latitude+','+passengers[i].geo.longitude;
						details += '&waypoints='+waypoints;
					}
					var mapUrl 	= 'https://www.google.com/maps/embed/v1/directions'+details
					$rootScope.mapUrl = $sce.trustAsResourceUrl(mapUrl);
				})
			}
		},
		temple:{
			set:function(temple){
				var temple = $rootScope.temp.ride.temple;
				$rootScope.templeLink = $sce.trustAsResourceUrl(temple.link+'#primary-details');
				// $rootScope.templeLink = $sce.trustAsResourceUrl(temple.link+'#schedule-section');
				$rootScope.mainTools.side.set('right', 'partials/side/temple.html');
			}
		}
	}

	$scope.uiConfig = {
		calendar:{
			height: 450,
			editable: false,
			header:{
				left: 'title',
				center: '',
				right: 'today prev,next'
			},
			eventClick: function(obj, e){
				tools.ride.focus(obj)
			},
			eventDrop: $scope.alertOnDrop,
			eventResize: $scope.alertOnResize,
			viewRender: function(view, element) {
				console.log("View Changed: ", view.visStart, view.visEnd, view.start, view.end);
			}
		}
	};
	$scope.eventSources = [$scope.formated.driver, $scope.formated.passenger, $scope.formated.other];
	$scope.tools = tools;

	$rootScope.$on('geoChange', function(event, geo) {
		allRidesPromise.then(function(rideResource){
			rideResource.loadData();
		})
	});

	it.RideCtrl=$scope;
});


























var AdminCtrl = app.controller('AdminCtrl', function($rootScope, $scope, $http, $q, config, initSetupService, roleService){
	var tools = {
		email:function(fun){
			$http.post(config.parseRoot+'functions/'+fun, {}).success(function(data){
				$scope.response = data;
			}).error(function(error, data){
				$scope.response = {error:error,data:data};
			});
		},
		setup:function(){
			roleService.detailedRoles().then(function(roles){
				$rootScope.data.roles = roles;
				roleService.unassigned().then(function(unassigned){
					$rootScope.data.unassigned = unassigned;
				})
			})
		},
		userRoles:roleService,
		user:{
			editRoles:function(user){
				$rootScope.temp.user = user;
				$('#adminUserModal').modal('show');
				// ga('send', 'event', 'admin', 'editRoles');
			}
		},
		roles:{
			setup:function(){	//This is a one time only thing - used to initiate the website roles.
				initSetupService.setup($rootScope.user,config.roles).then(function(results){
					$rootScope.data.roles = results;
				})
			}
		}
	}

	tools.setup();
	$scope.$on('authenticated', function() {
		tools.setup();
	})
	$rootScope.$on('role-reassigned', function(event,unassigned){
		$rootScope.data.unassigned = unassigned;
	})
	$scope.tools = tools;
	it.AdminCtrl=$scope;
});