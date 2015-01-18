app.factory('userService', function ($rootScope, $http, $q, config) {
	var userService = {
		user:function(){
			var deferred = $q.defer();
			if($rootScope.user)
				deferred.resolve($rootScope.user);
			else{
				$rootScope.$on('authenticated', function(event,user) {
					deferred.resolve(user);
				});
			}
			return deferred.promise;
		},
		// settings:function(){
		// 	var deferred = $q.defer();
		// 	if($rootScope.user && $rootScope.user.settings.__type != 'Pointer'){
		// 		deferred.resolve($rootScope.user.settings);
		// 	}else{
		// 		userService.user().then(function(user){
		// 			if(user && user.settings && user.settings.__type != 'Pointer'){
		// 				deferred.resolve(user.settings);
		// 			}else{
		// 				$http.get(config.parseRoot+'classes/UserSettings/'+user.settings.objectId+'?include=school,schedule').success(function(data){
		// 					for(var i=0; i<data.schedule.length; i++)
		// 						data.school.hours[data.schedule[i].hour].course = data.schedule[i]
		// 					$rootScope.user.settings = data;
		// 					deferred.resolve(data);
		// 				})
		// 			}
		// 		})
		// 	}
		// 	return deferred.promise;
		// },
 		init:function(){
 			if(localStorage.user){
				var localUser = angular.fromJson(localStorage.user);
				$http.defaults.headers.common['X-Parse-Session-Token'] = localUser.sessionToken;
			}
			console.log('user service init')
 			$http.get(config.parseRoot+'users/me').success(function(data){
 				//Add a weird hack because /me does not return all information stored in the user object.
 				$http.get(config.parseRoot+'users/'+data.objectId).success(function(data){
 					$rootScope.user=data;
 				});
 				userService.getRoles(data).then(function(roles){
 					data.roles = roles;
	 				$rootScope.user=data;
	 				$rootScope.$broadcast('authenticated', data);
 				})
 			}).error(function(){
				//Prompt for login
			});
 		},
 		signupModal:function(){
 			$('#userSignupModal').modal('show');
 		},
 		signup:function(user){
 			user.fullName = user.firstName + ' ' + user.lastName
 			user.username = user.email;
 			if(user.password!=user.password1){
 				$rootScope.error = {code: 101, error: 'Your passwords do not match.'}
 				console.error('error','Your passwords do not match.');
 			}else if(!user.address || !user.phone){
 				$rootScope.error = {code: 103, error: 'All fields are required - this service is designed to connect people.'}
 			}else if(!user.geo){
 				$rootScope.error = {code: 105, error: 'You must enable geo-location and pinpoint your house on the map to register.'}
 			}else{
 				$rootScope.error = null;
 				delete user.password1;
 				$http.post(config.parseRoot+'users', user).success(function(data){
 					$('#userSignupModal').modal('hide');
 					window.location.hash='#/welcome'
 					userService.login(user);
 				}).error(function(error, data){
 					$rootScope.error = error;
 					console.log('signupParse error: ',error,data);
 				});
 			}
 		},
 		loginModal:function(){
 			$('#userLoginModal').modal('show');
 		},
 		login:function(user){
 			var login = {
 				username:user.email,
 				password:user.password
 			}
 			$http.get(config.parseRoot+"login", {params: login}).success(function(data){
 				$http.defaults.headers.common['X-Parse-Session-Token'] = data.sessionToken;
 				localStorage.user=angular.toJson(data);
 				userService.getRoles(data).then(function(roles){
 					data.roles = roles;
	 				$rootScope.user=data;
	 				$('#userLoginModal').modal('hide');
 					$rootScope.$broadcast('authenticated', data);
 				})
 			}).error(function(data){
 				$rootScope.alert('error', data.error)
 				console.error('error',data.error);
				// $('#loading').removeClass('active');
			});
 		},
 		logout:function(){
 			localStorage.clear();
 			$rootScope.user=null;
 		},
 		resetPassword:function(user){
 			$http.post(config.parseRoot+"requestPasswordReset", user).success(function(data){
				$rootScope.alert('success', 'Please check your email to reset your password.')
			}).error(function(data){
				console.log(data)
				$rootScope.alert('error', data.error)
			})
 		},
 		getRoles:function(user){
			var deferred = $q.defer();
			var roleQry = 'where={"users":{"__type":"Pointer","className":"_User","objectId":"'+user.objectId+'"}}'
			$http.get(config.parseRoot+'classes/_Role?'+roleQry).success(function(data){
				deferred.resolve(data.results);
			}).error(function(data){
				deferred.reject(data);
			});
			return deferred.promise;
		},
		is:function(roleName){
			if($rootScope.user && $rootScope.user.roles)
				for(var i=0; i<$rootScope.user.roles.length; i++)
					if($rootScope.user.roles[i].name==roleName)
						return true;
			return false;
		},
 		settingsModal:function(){
 			$('#userSettingsModal').modal('show');
 		}
 	}
	it.userService = userService;
	return userService;
});










app.factory('roleService', function ($rootScope, $http, $q, config) {
	var userList = [];
	var roleList = [];
	var unassigned = false;
	var roleService = {
		reassign:function(){
			var deferred = $q.defer();
			roleService.listUsers().then(function(users){
				var users = angular.fromJson(angular.toJson(users))
				var assignedUsers = [];
				for(var i=0; i<roleList.length; i++)
					for(var u=0; u<roleList[i].users.length; u++)
						assignedUsers.push(roleList[i].users[u].objectId)	

				unassigned = [];
				for(var i=0; i<users.length; i++)
					if(assignedUsers.indexOf(users[i].objectId) == -1)
						unassigned.push(users[i])

				$rootScope.$broadcast('role-reassigned', unassigned)
				deferred.resolve(unassigned);
			})
			return deferred.promise;
		},
		unassigned:function(){
			var deferred = $q.defer();
			if(unassigned){
				deferred.resolve(unassigned);
			}else{
				roleService.reassign().then(function(){
					deferred.resolve(unassigned);
				});
			}
			return deferred.promise;
		},
		detailedRoles:function(){
			var deferred = $q.defer();
			roleService.listRoles().then(function(roles){
				$rootScope.data.roles = [];
				var listToGet = [];
				for(var i=0; i<roles.length; i++){
					listToGet.push(roleService.roleUserList(roles[i]))
				}
				$q.all(listToGet).then(function(roles){
					roleList = roles;
					deferred.resolve(roles);
				})
			})
			return deferred.promise;
		},
		listRoles:function(){
			var deferred = $q.defer();
			$http.get(config.parseRoot+'classes/_Role').success(function(data){
				deferred.resolve(data.results);
			}).error(function(data){
				deferred.reject(data);
			});
			return deferred.promise;
		},
		roleUserList:function(role){
			var deferred = $q.defer();
			var roleQry = 'where={"$relatedTo":{"object":{"__type":"Pointer","className":"_Role","objectId":"'+role.objectId+'"},"key":"users"}}'
			$http.get(config.parseRoot+'classes/_User?'+roleQry).success(function(data){
				role.users = data.results;
				deferred.resolve(role);
			}).error(function(data){
				deferred.reject(data);
			});
			return deferred.promise;
		},
		listUsers:function(){
			var deferred = $q.defer();
			$http.get(config.parseRoot+'classes/_User').success(function(data){
				userList = data.results;
				deferred.resolve(data.results);
			}).error(function(data){
				deferred.reject(data);
			});
			return deferred.promise;
		},
		toggleUserRole:function(user,role){
			if(roleService.hasRole(user,role))
				roleService.deleteUserRole(user,role)
			else
				roleService.addUserRole(user,role)
		},
		addUserRole:function(user,role){
			var deferred = $q.defer();
			var request = {
				users: {
					"__op": "AddRelation",
					"objects": [{
						"__type": "Pointer",
						"className": "_User",
						"objectId": user.objectId
					}]
				}
			}
			$http.put(config.parseRoot+'classes/_Role/'+role.objectId, request).success(function(data){
				role.users.push(user);
				roleService.reassign();
				deferred.resolve(data);
			}).error(function(data){
				deferred.reject(data);
			});
			return deferred.promise;
		},
		deleteUserRole:function(user,role){
			var deferred = $q.defer();
			var request = {
				users: {
					"__op": "RemoveRelation",
					"objects": [{
						"__type": "Pointer",
						"className": "_User",
						"objectId": user.objectId
					}]
				}
			}
			$http.put(config.parseRoot+'classes/_Role/'+role.objectId, request).success(function(data){
				role.users.splice(role.users.indexOf(user), 1)
				roleService.reassign();
				deferred.resolve(data);
			}).error(function(data){
				deferred.reject(data);
			});
			return deferred.promise;
		},
		hasRole:function(user, role){
			if(user && role && role.users)
				for(var i=0; i<role.users.length; i++)
					if(user.objectId==role.users[i].objectId)
						return true
			return false;
		},
		roleList:function(){
			return roleList;
		}
	}
	it.roleService = roleService;
	return roleService;
});











app.factory('fileService', function ($http, $q, config) {
	var fileService = {
		upload:function(details,b64){
			var deferred = $q.defer();
			var file = new Parse.File(details.name, { base64: b64});
			file.save().then(function(data) {
				console.log('save success',data)
				deferred.resolve(data);
			}, function(error) {
				console.log('save error',error)
				deferred.reject(error);
			});
			return deferred.promise;
		}
	}

	it.fileService = fileService;
	return fileService;
});






app.factory('qrService', function () {
	var qrService = {
		create:function(text, size){
			if(!size)
				size = 256;
			return 'https://api.qrserver.com/v1/create-qr-code/?size='+size+'x'+size+'&data='+text
			// return 'https://chart.googleapis.com/chart?'+
		}
	}

	it.qrService = qrService;
	return qrService;
});








app.factory('geoService', function ($q) {
	var  geoService={
		helpModal:function(){
			$('#userGeoHelpModal').modal('show');
		},
		location:function(){
			var deferred = $q.defer();
			if(navigator.geolocation){
				navigator.geolocation.getCurrentPosition(function(geo){
					deferred.resolve(geo)
				})
			}else{
				deferred.resolve({status:'error',message:'Geolocation is not supported by this browser.'});
			}
			return deferred.promise;
		},
		distance:function(geo1,geo2){
			var from = new google.maps.LatLng(geo1.latitude,geo1.longitude);
			var to = new google.maps.LatLng(geo2.latitude,geo2.longitude);
			var dist = google.maps.geometry.spherical.computeDistanceBetween(from, to);
			var miles = dist*.00062137;
			return miles;
		},
		parsePoint:function(geo){
			console.log(geo)
			if(geo.coords)
				return {
					__type:"GeoPoint",
					latitude:geo.coords.latitude,
					longitude:geo.coords.longitude
				}
			else
				return {
					__type:"GeoPoint",
					latitude:geo.latitude,
					longitude:geo.longitude
				}
		},
		parseSearch:function(geoShape){
			var where = {};
			if(geoShape.type=='circle'){
				where={
					"location": {
						"$nearSphere": {
							"__type": "GeoPoint",
							"latitude": geoShape.latitude,
							"longitude": geoShape.longitude
						},
						"$maxDistanceInMiles": geoShape.radius
					}
				}
			}else if(geoShape.type=='rectangle'){
				where = {
					"location": {
						"$within": {
							"$box": [{
								"__type": "GeoPoint",
								"latitude": geoShape.northEast.latitude,
								"longitude": geoShape.northEast.longitude
							},{
								"__type": "GeoPoint",
								"latitude": geoShape.southWest.latitude,
								"longitude": geoShape.southWest.longitude
							}]
						}
					}
				}
			}else if(geoShape.type=='marker'){
				where={
					"location": {
						"$nearSphere": {
							"__type": "GeoPoint",
							"latitude": geoShape.latitude,
							"longitude": geoShape.longitude
						}
					}
				}
			}
			return where;
		}
	}
	it.geoService = geoService;
	return geoService;
});









app.factory('initSetupService', function($rootScope, $http, $q, config){
	//1st time admin user login
	//Setup permissions and assign 1st user as admin
	var privateData = {}
	var initSetupService = {
		setup:function(user, roleList){
			var deferred = $q.defer();
			if(!user || !user.objectId){
				console.error('You must create an account before you can setup roles.')
				deferred.reject();
			}else{
				var createdRoles = [];
				var superAdmin = user.objectId;
				initSetupService.setAdminRole(superAdmin).then(
					function(adminRole){
						privateData.adminRole = adminRole;
						createdRoles.push(adminRole);
						roleSetupArray = [];
						for(var i=0; i<roleList.length; i++)
							roleSetupArray.push(initSetupService.setOtherRole(roleList[i]))
						$q.all(roleSetupArray).then(function(data){
							for(var i=0; i<data.length; i++)
								createdRoles.push(data[i]);
							deferred.resolve(createdRoles);
						});
					}
				)
			}
			return deferred.promise;
		},
		setAdminRole:function(superAdmin){
			var deferred = $q.defer();
			var adminRole = {
				name: 'Admin',
				ACL: {
					"*":{
						read: true
					}
				},
				users: {
					"__op": "AddRelation",
					"objects": [{
						"__type": "Pointer",
						"className": "_User",
						"objectId": superAdmin
					}]
				}
			};
			adminRole.ACL[superAdmin] = {
				read: true,
				write: true
			}
			$http.post('https://api.parse.com/1/classes/_Role', adminRole).success(function(data){
				adminRole.response = data;
				deferred.resolve(adminRole);
			}).error(function(error, data){
				deferred.reject({error:error,data:data});
			});

			return deferred.promise;
		},
		setOtherRole:function(roleName){
			var deferred = $q.defer();
			var roleParams = {
				name: roleName,
				ACL: {
					"*":{
						read: true
					},
					"role:Admin":{
						read: true,
						write: true
					}
				},
				roles: {
					"__op": "AddRelation",
					"objects": [
					{
						"__type": "Pointer",
						"className": "_Role",
						"objectId": privateData.adminRole.response.objectId
					}
					]
				}
			};
			$http.post('https://api.parse.com/1/classes/_Role', roleParams).success(function(data){
				roleParams.response = data;
				deferred.resolve(roleParams);
			}).error(function(error, data){
				deferred.reject({error:error,data:data});
			});

			return deferred.promise;
		}
	}
	it.initSetupService = initSetupService;
	return initSetupService;
});











app.factory('dataService', function ($rootScope, $http, $q, config, Firebase) {
	//Set local dataStore obj if it doesn't exist
	if(!localStorage.getItem('RQdataStore'))
		localStorage.setItem('RQdataStore', angular.toJson({
			resource: {},
			resourceList: [],
			notLocal:[], 
			wip: {},
			lastRequest: ''
		}))

	//Load local dataStore
	var dataStore = angular.fromJson(localStorage.getItem('RQdataStore'));
	windowState.setup();

	var DS = {
		data: function(){
			return dataStore;
		},
		resourceList: function(){
			return dataStore.resourceList;
		},
		localSave:function(){
			var tempData = angular.fromJson(angular.toJson(dataStore))
				for(var i=0; i<tempData.notLocal.length; i++)
					delete tempData.resource[tempData.notLocal[i]]
			localStorage.setItem('RQdataStore', angular.toJson(tempData))
		},
		wip: {
			add: function(identifier, object){
				if(object.objectId){
					if(!dataStore.wip[identifier])
						dataStore.wip[identifier] = {};
					dataStore.wip[identifier][object.objectId] = object;
					DS.localSave();
				}
			},
			remove: function(identifier, objectId){
				if(typeof(object)=='object')
					objectId = objectId.objectId

				if(dataStore.wip[identifier])
					delete dataStore.wip[identifier][objectId];
			},
			list: function(){
				return dataStore.wip;
			},
			isInEdit: function(identifier, object){
				if(dataStore.wip[identifier])
					return !!dataStore.wip[identifier][object.objectId]
			},
			keepResource: function(identifier, resource){
				if(dataStore.wip[identifier])
					for(var i=0; i<resource.length; i++)
						if(dataStore.wip[identifier][resource[i].objectId])
							resource[i] = dataStore.wip[identifier][resource[i].objectId]
				return resource;
			}
		},
		resource: function(className, identifier, isLive, isLocal, query, params){
			var resource = this;
			resource.listenId = 'DS-'+identifier;
			resource.config = {
				liveStreams: [],
				className: className,
				identifier: identifier,
				isLive: isLive,
				isLocal: isLocal,
				query: query,
				params: params
			}
			
			resource.addLiveStream = function(identifier){
				var tempRef = new Firebase(config.fireRoot+identifier)
				resource.config.liveStreams.push(tempRef);
			}
 			resource.setQuery = function(query){
				resource.config.query = query;
			}
			resource.loadData = function(lastUpdate){
				var deferred 	= $q.defer();
				var className 	= resource.config.className
				var identifier 	= resource.config.identifier
				
				//We were getting multiple requests when the controller was re-initiated.
				if(!lastUpdate)
					lastUpdate = new Date().getTime();
				if(dataStore.lastRequest != lastUpdate){
					dataStore.lastRequest = lastUpdate
					var query = '';
					if(resource.config.params)
						query = resource.config.query
					else if(resource.config.query)
						query = config.parseRoot+'classes/'+className+'?'+resource.config.query;
					else
						query = config.parseRoot+'classes/'+className;

					if(params)
						$http.post(query, params).success(function(data){
							dataStore.resource[identifier] = {
								identifier: identifier,
								results: DS.wip.keepResource(identifier, data.result),
								liveSync: lastUpdate
							}

							DS.localSave();
							$rootScope.$broadcast(resource.listenId, dataStore.resource[identifier]);
							deferred.resolve(dataStore.resource[identifier]);
						}).error(function(data){
							deferred.reject(data);
						});
					else
						$http.get(query).success(function(data){
							dataStore.resource[identifier] = {
								identifier: identifier,
								results: DS.wip.keepResource(identifier, data.results),
								liveSync: lastUpdate
							}

							DS.localSave();
							$rootScope.$broadcast(resource.listenId, dataStore.resource[identifier]);
							deferred.resolve(dataStore.resource[identifier]);
						}).error(function(data){
							deferred.reject(data);
						});
				}else{
					deferred.resolve(dataStore.resource[identifier]);
				}
				return deferred.promise;
			}
			resource.broadcast = function(timestamp){
				console.log('www broadcast',timestamp)
				fireBroadcast(timestamp);
			}
			function fireBroadcast(timestamp){
				for(var i=0; i<resource.config.liveStreams.length; i++)
					resource.config.liveStreams[i].set(timestamp);
				if(resource.config.liveRef)
					resource.config.liveRef.set(timestamp)
				else
					resource.loadData();
			}

			
			if(isLive){
				resource.config.liveRef = new Firebase(config.fireRoot+identifier)
				resource.config.liveRef.on('value', function(dataSnapshot) {
					// alert(dataSnapshot.val())
					if(dataStore.resource[identifier])
						var lastUpdate = dataStore.resource[identifier].liveSync;
					if(dataSnapshot.val() != lastUpdate){
						if(windowState.isActive){
							resource.loadData(dataSnapshot.val())
						}else{
							windowState.setActive(function(){
								console.log('IS ACTIVE')
								resource.loadData(dataSnapshot.val())
							})
						}
					}else{
						$rootScope.$broadcast(resource.listenId, dataStore.resource[identifier]);
					}
				});
			}
			if(!isLocal){
				if(dataStore.notLocal && dataStore.notLocal.indexOf(resource.config.identifier) == -1)
					dataStore.notLocal.push(resource.config.identifier)
			}
			if(dataStore.resourceList.indexOf(identifier) == -1)
				dataStore.resourceList.push(identifier)


			this.item = {
				list: function(){
					var deferred = $q.defer();
					var className 	= resource.config.className
					var identifier 	= resource.config.identifier
					if(dataStore.resource[identifier]){
						deferred.resolve(dataStore.resource[identifier]);
						if(!resource.config.isLive)
							resource.loadData()
					}else{
						resource.loadData().then(function(data){
							deferred.resolve(data);
						})
					}
					return deferred.promise;
				},
				get: function(objectId){
					var deferred = $q.defer();
					var className 	= resource.config.className
					var identifier 	= resource.config.identifier

					var resourceList = dataStore.resource[identifier].results;
					var requestedResource = false;
					for(var i=0; i<resourceList.length; i++){
						if(resourceList[i].objectId == objectId)
							requestedResource = resourceList[i]
					}
					if(requestedResource)
						deferred.resolve(requestedResource);
					else
						$http.get(config.parseRoot+'classes/'+className+'/'+objectId).success(function(data){
							deferred.resolve(data);
						}).error(function(data){
							deferred.reject(data);
						});
					return deferred.promise;
				},
				save: function(object){
					console.log('Save Object: ', object)
					if(!object)
						object = {};
					if(object.objectId)
						return this.update(object)
					else
						return this.add(object)
				},
				add: function(object){
					var deferred = $q.defer();
					var className = resource.config.className;
					var identifier = resource.config.identifier;
					var objectId = object.objectId;

					$http.post(config.parseRoot+'classes/'+className, object).success(function(data){
						DS.wip.remove(identifier, objectId)
						fireBroadcast(data.createdAt)
						deferred.resolve(data);
					}).error(function(error, data){
						resource.loadData();
						deferred.reject(data);
					});
					return deferred.promise;
				},
				update: function(object){
					object = angular.fromJson(angular.toJson(object))
					var deferred = $q.defer();
					var className = resource.config.className;
					var identifier = resource.config.identifier;
					var objectId = object.objectId;

					delete object.objectId;
					delete object.createdAt;
					delete object.updatedAt;

					$http.put(config.parseRoot+'classes/'+className+'/'+objectId, object).success(function(data){
						DS.wip.remove(identifier, objectId)
						fireBroadcast(data.updatedAt)
						deferred.resolve(data);
					}).error(function(error, data){
						resource.loadData();
						deferred.reject(data);
					});
					return deferred.promise;
				},
				remove: function(object){
					var deferred = $q.defer();
					var className = resource.config.className
					var identifier = resource.config.identifier;
					var objectId = object.objectId;

					$http.delete(config.parseRoot+'classes/'+className+'/'+object.objectId).success(function(data){
						var deletedAt = new Date();
						DS.wip.remove(identifier, objectId)
						fireBroadcast(deletedAt.toISOString())
						deferred.resolve(data);
					}).error(function(error, data){
						resource.loadData();
						deferred.reject(data);
					});
					return deferred.promise;
				}
			}
			this.remove = function(){
				var identifier = resource.config.identifier;

				var posInNotLocal = dataStore.notLocal.indexOf[identifier]
				if(posInNotLocal != -1)
					dataStore.notLocal.splice(posInNotLocal, 1)
				delete dataStore.resource[identifier]
				var posInResourceList = dataStore.resourceList.indexOf[identifier]
				if(posInResourceList != -1)
					dataStore.notLocal.splice(posInResourceList, 1)
				delete dataStore.wip[identifier]

				DS.localSave();
			}
		},
		parse:{
			pointer:function(className, objectId){
				return {
					__type: 	'Pointer',
					className: 	className,
					objectId: 	objectId
				}
			},
			acl: function(read, write){
				var acl = {};
					acl[$rootScope.user.objectId] = {
						read: true,
						write: true
					}
					if(read && write)
						acl['*'] = {
							read: read,
							write: write
						}
					else if(read)
						acl['*'] = {
							read: read
						}
				return acl;
			}
		}
	}
	it.DS = DS;
	return DS;
});