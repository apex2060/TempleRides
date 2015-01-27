var MainCtrl = app.controller('MainCtrl', function($rootScope, $scope, $routeParams, $location, $http, config, userService, geoService){
	$rootScope.action = $routeParams.action;
	$rootScope.view = $routeParams.view;
	$rootScope.id = $routeParams.id;
	$rootScope.email = $routeParams.email;
	$rootScope.config = config;

	function setup(){
		$http.get('/assets/json/temples.json').success(function(data){
			$rootScope.templeList = data.temples;
		})
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
		alert:{
			add:function(type, message){
				if(type == 'error')
					type = 'danger';

				var alert = {
					type: 'alert-'+type,
					message: message
				}
				$rootScope.alerts.push(alert)
				return alert;
			},
			dismiss:function(alert){
				var alertIndex = $rootScope.alerts.indexOf(alert);
				if(alertIndex != -1)
					$rootScope.alerts.splice(alertIndex, 1);
			}
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
			$rootScope.temp=	{ride: {}};
			$rootScope.side=	{};
			$rootScope.alerts = [];
			$rootScope.mode=	'normal';
			// tools.side.set('left','partials/shoeboxlist/sidebar.html')
			// tools.side.set('right','partials/sidebar.html')
		},
		getInvite:function(){
			$routeParams.id
			$routeParams.email
			if($routeParams.id && $routeParams.email)
				$http.post(config.parseRoot+'functions/dataFromInvite', {token: $routeParams.id, email: $routeParams.email})
				.success(function(response){
					it.dataFromInvite = response;
					var u = response.result;
					$rootScope.temp.user = {
						emailNotifications: true,
						firstName: 	u.firstName,
						lastName: 	u.lastName,
						phone: 		u.phone,
						address: 	u.address,
						email:  	u.email
					};
					if(u.geo)
						$rootScope.temp.user.geo = {
							__type: 	"GeoPoint",
							latitude: 	u.geo.latitude,
							longitude: 	u.geo.longitude
						}
				}).error(function(response){
					console.log('dataFromInvite error: ', response)
				})
		},
		signup:function(user){
			user.token=$routeParams.id;
			if($routeParams.email)
				user.email=$routeParams.email;
			tools.user.signup(user)
		},
		accountInit: function(){
			$rootScope.temp.user = angular.fromJson(angular.toJson($rootScope.user))
			for(var i=0; i<$rootScope.templeList.length; i++)
				if($rootScope.templeList[i].link == $rootScope.temp.user.temple.link)
					$rootScope.temp.user.temple = $rootScope.templeList[i]
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
			if(user.temple)
				us.temple = user.temple
			if(user.geo)
				us.geo = user.geo
			$http.put(config.parseRoot+'users/'+$rootScope.user.objectId, us).success(function(data){
				$rootScope.alert('success', data)
			}).error(function(data){
				$rootScope.alert('error', data.error)
			})
		},
		invite: function(invitation){
			invitation.status = 'sending';
			$http.post(config.parseRoot+'classes/invitations', invitation)
			.success(function(response){
				$rootScope.alert('success', 'Invitation Sent!')
			})
			.error(function(response){
				$rootScope.alert('error', response)
			})
		},
		clearInvite:function(){
			$rootScope.temp.invitation = {};
		}
	}
	$scope.tools = tools;
	$rootScope.mainTools = tools;
	$rootScope.alert = tools.alert.add;
	
	if(!$rootScope.data){
		tools.setup();
	}
	it.MainCtrl=$scope;
});










var RideCtrl = app.controller('RideCtrl', function($rootScope, $scope, $routeParams, $q, $sce, $http, config, settings, dataService, userService){
	console.log('RIDE CONTROLLER')
	$scope.moment = moment;
	$scope.warnings = {};
	$scope.futureFilter = function (event) {
        return event.ends >= new Date();
    };
    


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
		if(!$scope.temp.ride.temple)
			tools.ride.reset();
	});
	var allRidesPromise = allRides.promise;

	var tools = {
		say:function(message){
			alert(message)
		},
		formatRides: function(rides, type){
			var rideList = [];
			if(rides)
				for(var i=0; i<rides.length; i++){
					var tRide = angular.fromJson(angular.toJson(rides[i]))

					tRide.title 	= tRide.temple;
					tRide.day 		= tRide.date;
					tRide.type 		= type;
					tRide.starts 	= new Date(tRide.date+' '+tRide.leaving);
					tRide.ends 		= new Date(tRide.date+' '+tRide.returning);
					tRide.start 	= new Date(tRide.date+' '+tRide.leaving);
					tRide.end 		= new Date(tRide.date+' '+tRide.returning);
					tRide.allDay 	= false;

					rideList.push(tRide);
				}
			return rideList;
		},
		ride:{
			reset: function(){
				$rootScope.temp.ride = {};
				for(var i=0; i<$rootScope.templeList.length; i++)
					if($rootScope.templeList[i].link == $rootScope.user.temple.link){
						$scope.temp.ride.temple = $rootScope.templeList[i];
						tools.gas.trip($scope.temp.ride.temple).then(function(trip){
							$scope.temp.ride.trip = trip;
						});
					}
			},
			ind: function(){
				$scope.loading = true;
				userService.user().then(function(user){
					allRidesPromise.then(function(rideResource){
						var rideId = $routeParams.id;
						$http.get(config.parseRoot+'classes/rides/'+rideId+'?include=createdBy').success(function(ride){
							tools.ride.get(rideId).then(function(rideCache){
								ride.type 	= rideCache.type;
								ride.starts = rideCache.starts;
								ride.ends 	= rideCache.ends;
								$scope.ride = ride;
								$scope.loading = false;
								if(ride.type=='driver')
									tools.ride.passengerList(ride);
							})
						}).error(function(){
							$scope.loading = false;
						})
						$http.post(config.parseRoot+'functions/sitterByRide', {rideId:rideId}).success(function(response){
							$rootScope.temp.sitterList = response.result;
						})
					});
				});
			},
			get: function(rideId){
				var ride = $q.defer();
				allRidesPromise.then(function(rideResource){
					var rideTypes = ['driver','passenger','other']
					rideResource.item.list().then(function(rides){
						for(var t=0; t<rideTypes.length; t++){
							var list = rides.results[rideTypes[t]];
							for(var i=0; i<list.length; i++){
								if(list[i].objectId == rideId){
									var tRide = angular.copy(list[i]);
									tRide.type = rideTypes[t];
									tRide.title 	= tRide.temple;
									tRide.day 		= tRide.date;
									tRide.starts 	= new Date(tRide.date+' '+tRide.leaving);
									tRide.ends 		= new Date(tRide.date+' '+tRide.returning);
									tRide.start 	= new Date(tRide.date+' '+tRide.leaving);
									tRide.end 		= new Date(tRide.date+' '+tRide.returning);
									tRide.allDay 	= false;
									ride.resolve(tRide);
								}
							}
						}
					})
				})
				return ride.promise;
			},
			display: function(ride){
				if(ride.type=='driver'){
					var passengers = ride.seats-ride.seatsAvail;
					if(passengers == 0)
						return 'You have set up a ride for '+moment(ride.starts).format('dddd MMMM Do [at] h:mm a')+' No passengers have signed up yet.';
					else if(passengers == 1)
						return 'You are giving a ride to one person '+moment(ride.starts).format('dddd MMMM Do [at] h:mm a');
					else
						return 'You are giving a ride to '+(ride.seats-ride.seatsAvail)+' people '+moment(ride.starts).format('dddd MMMM Do [at] h:mm a');
				}else if(ride.type=='passenger')
					return 'You will be picked up to go to the temple: '+moment(ride.starts).format('dddd MMMM Do [at] h:mm a');
				else 
					return 'A ride to the '+ride.temple+' is available: '+moment(ride.starts).format('dddd MMMM Do [at] h:mm a');
			},
			focus: function(ride){
				$scope.temp.reservationStatus = null;
				$rootScope.temp.focus = ride;
				$rootScope.mainTools.side.set('right','partials/side/'+ride.type+'.html');
				// console.log(ride.type)
				// tools.ride.sitterList(ride);
				if(ride.type=='driver')
					tools.ride.passengerList(ride);
			},
			add: function(ride){
				if(ride){
					if(!ride.date)
						$scope.warnings.date = 'You must specify the day you will go to the temple.'
					else
						delete $scope.warnings.date

					if(new Date(ride.date+' '+ride.leaving) > new Date(ride.date+' '+ride.returning))
						$scope.warnings.leaveReturn = 'You must leave before you return.'
					else
						delete $scope.warnings.leaveReturn

					if(!ride.temple)
						$scope.warnings.temple = 'You must specify the temple you will be attending.'
					else
						delete $scope.warnings.temple

					if(!ride.seats)
						$scope.warnings.seats = 'You must specify the number of seats available.'
					else
						delete $scope.warnings.seats
				}
				if(angular.toJson($scope.warnings) == "{}"){
					ride.timestamp = new Date(ride.date+' '+ride.leaving).getTime();
					ride.status = 'active';
					ride.temple = ride.temple.name;
					tools.gas.station().then(function(station){
						ride.gasPrice = station.reg_price;
						ride.miles = ride.trip.miles;
						tools.gas.savings(ride.miles).then(function(savings){
							ride.passengerSavings = savings;
							ride.possibleSavings = ride.passengerSavings * ride.seats;
							console.log('save',ride);
							allRidesPromise.then(function(rideResource){
								rideResource.item.save(ride)
								tools.ride.reset();
							})
						})
					})
				}
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
					tools.ride.reset();
				}
			},
			reserve: function(ride){
				$scope.temp.reservationStatus = 'processing';
				$http.post(config.parseRoot+'functions/joinRide', {objectId: ride.objectId}).then(function(response){
					if(response.data.result && response.data.result.updatedAt){
						$scope.temp.reservationStatus = 'reserved';
						allRidesPromise.then(function(rideResource){
							rideResource.broadcast(response.data.result.updatedAt)
							$rootScope.mainTools.side.set('right');
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
							$rootScope.mainTools.side.set('right');
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
			sitterList: function(rideId){
				if(typeof(rideId)=='object')
					rideId = rideId.objectId
				$('#findSitterModal').modal('show');
				$http.post(config.parseRoot+'functions/sitterByRide', {rideId:rideId}).success(function(response){
					$rootScope.temp.sitterList = response.result;
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
		time: {
			calculate: function(){
				var tRide 	= $scope.temp.ride
				tools.gas.trip(tRide.temple).then(function(trip){
					if(tRide.session && tRide.date){
						var session = new Date(tRide.date+' '+tRide.session)
						var prior 	= trip.seconds + 30*60;
						var duration= trip.seconds * 2 + (30 * 60) + (2 * 60 * 60);
						var after 	= duration - prior;
						$scope.temp.trip = angular.extend({}, $scope.temp.trip, {
							suggestedLeave: 	moment(session).subtract(moment.duration(prior*1000)),
							suggestedReturn: 	moment(session).add(moment.duration(after*1000))
						})
					}
				})
			},
			setLeave: function(){
				$rootScope.temp.ride.leaving = $rootScope.temp.trip.suggestedLeave.format("HH:mm")
			},
			setReturn: function(){
				$rootScope.temp.ride.returning = $rootScope.temp.trip.suggestedReturn.format("HH:mm")
			}
		},
		gas: {
			trip: function(temple){
				var deferred = $q.defer();
				var geo = $rootScope.user.geo
				var request = {
					origin: 		geo.latitude+','+geo.longitude,
					destination: 	temple.name+' temple'
				}
				if(localStorage.trip)
					var localTrip = angular.fromJson(localStorage.trip);
				if($scope.temp.trip && $scope.temp.trip.temple.name == temple.name){
					deferred.resolve($scope.temp.trip)
				}else if(localTrip && localTrip.temple.name == temple.name){
					$scope.temp.trip = localTrip;
					deferred.resolve($scope.temp.trip)
				}else{
					$http.post(config.parseRoot+'functions/distance', request).then(function(directions){
						if(directions.data.result.routes.length >0){
							var miles = directions.data.result.routes[0].legs[0].distance.value * .000621371;
							var seconds = directions.data.result.routes[0].legs[0].duration.value;
							// var thereSessionAndBack = seconds * 2 + (30 * 60) + (2 * 60 * 60);
							$scope.temp.trip = {temple:temple,miles:miles,seconds:seconds};
							localStorage.setItem('trip', angular.toJson($scope.temp.trip));
							deferred.resolve($scope.temp.trip);
						}else{
							console.log('Hmmmmm Not sure about this trip.')
							deferred.reject();
						}
					});
				}
				return deferred.promise;
			},
			savings: function(miles){
				var savingsP = $q.defer();
				var mpg = {
					sm: 24,
					md: 20,
					lg: 17
				}
				tools.gas.station().then(function(station){
					var savings = station.reg_price * miles / mpg.sm;
					savingsP.resolve(savings);
				})
				return savingsP.promise;
			},
			station: function(){
				var station = $q.defer();
				if($rootScope.temp.gas)
					station.resolve($rootScope.temp.gas)
				else
					tools.gas.stations().then(function(results){
						var chosen = null;
						for(var i=0; i<results.stations.length; i++){
							if(!chosen)
								if(results.stations[i].reg_price != 'N/A')
									chosen = results.stations[i];
						}
						$rootScope.temp.gas = chosen;
						station.resolve($rootScope.temp.gas)
					})
				return station.promise;
			},
			stations: function(){
				var stations = $q.defer();
				var geo = $rootScope.user.geo
				var url = config.gasRoot+'stations/radius/'+geo.latitude+'/'+geo.longitude+'/10/reg/price/'+config.gasKey+'.json?callback=JSON_CALLBACK'
				$http.jsonp(url).success(function(results){
					stations.resolve(results)
				})
				return stations.promise;
			}
		},
		temple:{
			show:function(){
				var temple = $rootScope.temp.ride.temple;
				// tools.gas.trip(temple).then(function(trip){
				// 	tools.gas.savings(trip.miles);
				// })
				// Being handled on calculation of time.
				// $rootScope.templeLink = $sce.trustAsResourceUrl(temple.link+'#primary-details');
				$rootScope.templeLink = $sce.trustAsResourceUrl(temple.link+'#schedule-section');
				$rootScope.mainTools.side.set('right', 'partials/side/temple.html');
			},
			update:function(){
				tools.time.calculate();
				tools.gas.trip($scope.temp.ride.temple).then(function(trip){
					$scope.temp.ride.trip = trip;
				});
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











var ListCtrl = app.controller('ListCtrl', function($rootScope, $scope, $q, $http, config, dataService, userService, geoService){
	var tools = {
		authAndSync: function(request){
			$rootScope.mainTools.side.hide('right')
			if(!request){
				if(config.dataLink.sessionToken){
					tools.http.get(config.parseRoot+'classes/Family?limit=1000&include=ward').then(function(data){
						$scope.familyList = data.results;
					})
				}
			}else{
				tools.http.auth(request.username, request.password).then(function(credentials){
					tools.http.get(config.parseRoot+'classes/Family?limit=1000&include=ward').then(function(data){
						$scope.familyList = data.results;
					})
				})
			}
		},
		family:{
			details: function(family){
				var family = angular.copy(family);
				var lastName = family.coupleName.split(",")[0]
				var firstName = family.coupleName.split(",")[1].replace("&", "or")
				$rootScope.temp.oFamily = family;
				if(family.hasInternet==undefined)
					family.hasInternet = true;
				$rootScope.temp.family = {
					lastName: 	lastName,
					firstName: 	firstName,
					name: 		family.coupleName,
					email: 		family.householdInfo.email,
					phone: 		family.householdInfo.phone,
					ward: 		family.ward,
					share: 		family.shareRides,
					internet: 	family.hasInternet
				}
				if(!family.householdInfo.email)
					if(family.headOfHousehold && family.headOfHousehold.email)
						$rootScope.temp.family.email = family.headOfHousehold.email;
					else if(family.spouse && family.spouse.email)
						$rootScope.temp.family.email = family.spouse.email;

				if(!family.householdInfo.phone)
					if(family.headOfHousehold && family.headOfHousehold.phone)
						$rootScope.temp.family.phone = family.headOfHousehold.phone;
					else if(family.spouse && family.spouse.phone)
						$rootScope.temp.family.phone = family.spouse.phone;

				if(family.householdInfo.address){
					if(family.householdInfo.address.latitude){
						$rootScope.temp.family.address = family.householdInfo.address.addr1+' '+family.householdInfo.address.addr2;
						$rootScope.temp.family.geo = {
							latitude: 	family.householdInfo.address.latitude,
							longitude: 	family.householdInfo.address.longitude
						}
					}else{
						geoService.location().then(function(loc){
							$rootScope.temp.family.address = 'Please coordinate pickup location...'
							$rootScope.temp.family.geo = {
								latitude: 	loc.coords.latitude,
								longitude: 	loc.coords.longitude
							}
						})
					}
				}
				$('#familyModal').modal('show');
			},
			save: function(family){
				if(!family.email && family.internet)
					$rootScope.alert('error','Please provide an email if you have internet at home.')
				else if(!family.email && !family.phone && family.share)
					$rootScope.alert('error','You need to provide a phone number or email address so you can share rides to the temple.')
				else{
					var oFamily = $rootScope.temp.oFamily;
					$('#familyModal').modal('hide');
					if(family.share && !oFamily.shareRides){
						family.fromList = true;
						tools.family.invite(family)
					}

					var familyId = oFamily.objectId;
					oFamily.householdInfo.phone = family.phone;
					oFamily.householdInfo.email = family.email;
					oFamily.shareRides 			= family.share;
					oFamily.hasInternet 		= family.internet;

					var nFamily = {}
					angular.copy(oFamily, nFamily)
					delete nFamily.ACL
					delete nFamily.objectId
					delete nFamily.createdBy
					delete nFamily.createdAt
					delete nFamily.updatedAt
					delete nFamily.ward
					tools.http.put(config.parseRoot+'classes/Family/'+familyId, nFamily).then(function(result){
						// $rootScope.alert('success', 'Change Saved');	
						console.log('Change Saved.')
					}, function(result){
						$rootScope.alert('error', result);	
					});
				}
			},
			invite: function(invitation){
				// Add another modal that says an invitation email has been sent.
				$('#welcomeModal').modal('show');
				invitation.status = 'sending';
				if(invitation.geo)
					invitation.geo.__type =	"GeoPoint";
				
				invitation.ward = invitation.ward.wardUnitNo;
				$http.post(config.parseRoot+'classes/invitations', invitation)
				.success(function(response){
					invitation.status='active';
					$rootScope.alert('success', 'Join Successful')
				})
				.error(function(response){
					$rootScope.alert('error', response)
				})
			}
		},
		http: {
			auth: function(username, password){
				var deferred = $q.defer();
				if(!$rootScope.dataLink){
					tools.http.get(config.parseRoot+'login?username='+username+'&password='+password).then(function(response){
						$rootScope.dataLink = response;
						deferred.resolve(response)
					})
				}else{
					deferred.resolve($rootScope.dataLink)
				}
				return deferred.promise;
			},
			get: function(url){
				var deferred = $q.defer();
				if($rootScope.dataLink)
					config.dataLink.sessionToken = $rootScope.dataLink.sessionToken;
				$http.get(url, {
					headers: {
						'X-Parse-Application-Id': 	config.dataLink.parseAppId,
						'X-Parse-REST-API-Key': 	config.dataLink.parseRestApiKey,
						'X-Parse-Session-Token': 	config.dataLink.sessionToken,
						'Content-Type': 			'application/json'
					}
				}).success(function(data){
					deferred.resolve(data);
				})
				return deferred.promise;
			},
			post: function(url, data){
				var deferred = $q.defer();
				if($rootScope.dataLink)
					config.dataLink.sessionToken = $rootScope.dataLink.sessionToken;
				$http.post(url, data, {
					headers: {
						'X-Parse-Application-Id': 	config.dataLink.parseAppId,
						'X-Parse-REST-API-Key': 	config.dataLink.parseRestApiKey,
						'X-Parse-Session-Token': 	config.dataLink.sessionToken,
						'Content-Type': 			'application/json'
					}
				}).success(function(data){
					deferred.resolve(data);
				})
				return deferred.promise;
			},
			put: function(url, data){
				var deferred = $q.defer();
				if($rootScope.dataLink)
					config.dataLink.sessionToken = $rootScope.dataLink.sessionToken;
				$http.put(url, data, {
					headers: {
						'X-Parse-Application-Id': 	config.dataLink.parseAppId,
						'X-Parse-REST-API-Key': 	config.dataLink.parseRestApiKey,
						'X-Parse-Session-Token': 	config.dataLink.sessionToken,
						'Content-Type': 			'application/json'
					}
				}).success(function(data){
					deferred.resolve(data);
				})
				return deferred.promise;
			}
		}
	}
	$scope.tools = tools;
	
	it.ListCtrl=$scope;
});











var SitterCtrl = app.controller('SitterCtrl', function($rootScope, $scope, $http, $q, config, userService, dataService, fileService){
	var myTime = $q.defer();
	var localSitters = $q.defer();
	userService.user().then(function(user){
		var liveId = user.geo.latitude.toString().split('.')[0]+user.geo.longitude.toString().split('.')[0];
		var timestamp = new Date().getTime();
		var sitterResource = new dataService.resource(
			'sitters', 
			'sitterList/'+liveId, 
			true, 
			true, 
			config.parseRoot+'functions/sitterList', 
			{timestamp: timestamp}
		);
			// ar.setQuery('');
		localSitters.resolve(sitterResource);
		sitterResource.item.list().then(function(data){
			tools.sitter.format(data.results)
		})
		$rootScope.$on(sitterResource.listenId, function(event, data){
			tools.sitter.format(data.results)
		})
	});
	var localSittersPromise = localSitters.promise;


	var tools = {
		sitter: {
			format:function(sitterList){
				$scope.sitters = sitterList;
			},
			become:function(){
				$rootScope.temp.user = angular.copy($rootScope.user);
				$('#sitterSignupModal').modal('show');
			},
			uploadPic:function(details, src){
				if(!$rootScope.temp.user)
					$rootScope.temp.user = {};
				$rootScope.temp.user.pic = {
					temp: true,
					status: 'uploading',
					class: 'grayscale',
					name: 'Image Uploading...',
					src: src
				}
	
				fileService.upload(details,src).then(function(data){
					$rootScope.temp.user.pic = {
						name: data.name(),
						src: data.url()
					}
				});
			},
			signup:function(){
				var profile = angular.extend({}, $rootScope.temp.user);
				profile.userId = $rootScope.user.objectId;
				profile.isSitter = true;
				//Remove items from user profile for the sitter list.
				delete profile.username;
				delete profile.roles;
				delete profile.sessionToken;
				delete profile.objectId;
				delete profile.createdAt;
				delete profile.updatedAt;
				//Set information that needs updated in the user profile.
				var profileUpdates = {
					isSitter: profile.isSitter,
					link: profile.link,
					pic: profile.pic
				}
				localSittersPromise.then(function(sitterResource){
					sitterResource.item.add(profile).then(function(){
						$http.put('https://api.parse.com/1/users/'+profile.userId, profileUpdates).success(function(){
							$rootScope.user = angular.extend($rootScope.user, profileUpdates);
							$('#sitterSignupModal').modal('hide');
						})
					})
				});
			},
			view:function(sitter){
				$http.get(config.parseRoot+'classes/sitterTimes?where={"userId":"'+sitter.userId+'"}')
				.success(function(data){
					$scope.sitter = sitter;
					$scope.sitterTimes = tools.time.format(data).results;
					$('#sitterTimeModal').modal('show');
				})
			}
		},
		time:{
			setup:function(){
				userService.user().then(function(user) {
					var liveId = user.objectId;
					var timestamp = new Date().getTime();
					var timeResource = new dataService.resource(
						'sitterTimes',
						'sitterTimes/' + liveId,
						true,
						true,
						'where={"userId":"' + liveId + '"}'
					);
					// ar.setQuery('');
					myTime.resolve(timeResource);
					timeResource.item.list().then(function(data) {
						if (data)
							$scope.times = tools.time.format(data)
					})
					$rootScope.$on(timeResource.listenId, function(event, data) {
						if (data)
							$scope.times = tools.time.format(data)
					})
				});
			},
			format:function(data){
				if(data.results>0)
					console.log(data.results[0].start.iso)
				for(var i=0; i<data.results.length; i++){
					var temp = data.results[i];
					if(data.results[i].start)
						data.results[i].start = moment(data.results[i].start.iso).zone(0).format('HH:mm');
					if(data.results[i].end)
						data.results[i].end = moment(data.results[i].end.iso).zone(0).format('HH:mm');
				}
				return data;
			},
			add:function(){
				$scope.times.results.push({temp:true});
			},
			save:function(time){
				var time = angular.copy(time);
				delete time.temp;
				time.start = {
					__type: "Date",
					iso: moment('12/22/2012 '+time.start+'-00:00')
				}
				time.end = {
					__type: "Date",
					iso: moment('12/22/2012 '+time.end+'-00:00')
				}
				myTime.promise.then(function(timeResource){
					timeResource.item.save(time).then(function(){
						//Time saved successfully
					})
				});
			},
			remove:function(time){
				if(confirm('Are you sure you want to delete this time?'))
					myTime.promise.then(function(timeResource){
						timeResource.item.remove(time).then(function(){
							//Time removed successfully
						})
					});
			},
		}
	}

	$scope.tools = tools;
	it.SitterCtrl=$scope;
});









var StatsCtrl = app.controller('StatsCtrl', function($rootScope, $scope, $http, $q, config){
	var tools = {
		loadStats:function(){
			$http.post(config.parseRoot+'functions/stats', {}).success(function(data){
				console.log('stats', data.result)
				$scope.stats = data.result;
			}).error(function(error, data){
				$scope.stats = {error:error,data:data};
			});
		}
	}

	$scope.tools = tools;
	it.StatsCtrl=$scope;
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