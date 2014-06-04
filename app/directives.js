app.directive('contenteditable', function() {
	return {
		require: 'ngModel',
		link: function(scope, elm, attrs, ctrl) {

			elm.bind('blur', function() {
				scope.$apply(function() {
					ctrl.$setViewValue(elm.html());
				});
			});

			ctrl.$render = function() {
				elm.html(ctrl.$viewValue);
			};
		}
	};
});

app.directive('datastore', ['$timeout','dataService', function($timeout, dataService) {
	return {
		restrict: 'A',
		link: function(scope, elm, attrs, ctrl) {
			if(attrs.identifier && attrs.datastore){
				scope.$watch(attrs.datastore, function(newValue, oldValue){
					if(newValue !== oldValue){
						$(elm).addClass('ds-edit');
						dataService.wip.add(attrs.identifier, scope[attrs.datastore]);
					}
				}, true)
			}else{
				console.error('Either a datastore or identifier attr were not defined.  Both must be assigned a value.')
			}

			if(dataService.wip.isInEdit(attrs.identifier, scope[attrs.datastore]))
				$(elm).addClass('ds-edit');
		}
	};
}]);

app.directive('mediaManager', function() {
	return {
		restrict: 'A',
		replace: true,
		transclude: true,
		template:	'<div>'+
				 		'<input type="file" class="hidden" accept="image/*" capture="camera">'+
						'<div ng-transclude></div>'+
					'</div>',
		scope: {
			callback: 	'=mediaManager'
		},
		link: function(scope, elem, attrs, ctrl) {
			if(typeof(scope.callback)!='function'){
				console.error('mediaManager: no callback defined.',scope.callback)
				return;
			}

			processDragOverOrEnter = function(event) {
				if (event != null) {
					event.preventDefault();
				}
				event.originalEvent.dataTransfer.effectAllowed = 'copy';
				return false;
			};
			resizeImage = function(imageData, maxWidth, maxHeight, callback){

				var img = new Image();
				img.onload = function () {
					var canvas = document.createElement('canvas');
					var ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0);
					var MAX_WIDTH = maxWidth;
					var MAX_HEIGHT = maxHeight;
					var width = img.width;
					var height = img.height;
					if (width > height) {
						if (width > MAX_WIDTH) {
							height *= MAX_WIDTH / width;
							width = MAX_WIDTH;
						}
					} else {
						if (height > MAX_HEIGHT) {
							width *= MAX_HEIGHT / height;
							height = MAX_HEIGHT;
						}
					}
					canvas.width = width;
					canvas.height = height;
					var ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0, width, height);
					var dataurl = canvas.toDataURL("image/png");

					if(typeof(callback)=='function')
						callback(dataurl);
				}
				img.src = imageData;
			}


			elem.bind('click', function(e){
				//At some point, this may end up being a call to open a modal which links to the media list
				$(elem).children('input')[0].click()
			});

			elem.bind('change', function(e) {
				var file, name, reader, size, type;
				if (e != null) {
					e.preventDefault();
				}
				file = e.target.files[0];
				if(file){
					name = file.name;
					type = file.type;
					size = file.size;
					reader = new FileReader();
					reader.onload = function(evt) {
						if(attrs.maxHeight || attrs.maxWidth){
							resizeImage(evt.target.result, attrs.maxHeight, attrs.maxWidth, function(newImage){
								scope.callback(file,newImage)
							})
						}else{
							scope.callback(file,evt.target.result)
						}
					};
					reader.readAsDataURL(file);
				}
				return false;
			});
			elem.bind('dragover', processDragOverOrEnter);
			elem.bind('dragenter', processDragOverOrEnter);
			return elem.bind('drop', function(event) {
				var file, name, reader, size, type;
				if (event != null) {
					event.preventDefault();
				}
				it.event = event;
				file = event.originalEvent.dataTransfer.files[0];
				name = file.name;
				type = file.type;
				size = file.size;
				reader = new FileReader();
				reader.onload = function(evt) {
					if(attrs.maxHeight || attrs.maxWidth){
						resizeImage(evt.target.result, attrs.maxHeight, attrs.maxWidth, function(newImage){
							scope.callback(file,newImage)
						})
					}else{
						scope.callback(file,evt.target.result)
					}
				};
				reader.readAsDataURL(file);
				return false;
			});
		}
	};
});










/*
	selectors: 		'MARKER|CIRCLE|RECTANGLE' (you can allow multiple by dividing them with the: | bar)
	color: 			a hex color if you wish to override the selection color
	zoom: 			map zoom level
	initmarker: 	allows you to add a point to the map when the map is created.
	advanced: 		by default, the return object is formated with latitude,longitude and(radius,northEast,southWest) enable advanced if you want the orig. shape returned by the map.
	callback: 		this callback will be called every time the user changes the marker or selection on the map.  It will return the new geo-object / map-shape.

	You can modify the default configuration in the code below.
*/
app.directive('map', ['geoService', function(geoService){
	return {
		restrict: 'E',
		replace: true,
		scope: {
			callback: '='
		},
		link:function (scope, elem, attr){

			/*SETUP DEFAULT VARIABLES FOR DIRECTIVE*/
			scope.config = {
				selectors: new Array('MARKER','CIRCLE', 'RECTANGLE'),
				color: '#1E90FF',
				zoom: 15,
				initmarker: false,
				advanced:false
			}

			/*OVERRIDE DEFAULTS IF PROVIDED*/
			if(attr.selectors)
				scope.config.selectors = attr.selectors.split('|');
			if(attr.color)
				scope.config.color = attr.color;
			if(attr.zoom)
				scope.config.zoom = Number(attr.zoom);
			if(attr.initmarker)
				scope.config.initmarker = attr.initmarker;
			if(attr.advanced)
				scope.config.advanced = attr.advanced;

			/*THESE CONSTANTS ARE REQUIRED*/
			scope.consts = {
				modes: [],
				currentShape:false
			};

			//Setup interaction
			$(scope.config.selectors).each(function(index, elem){
				scope.consts.modes.push(google.maps.drawing.OverlayType[elem]);
			});

			//Important Functions
			function normalizeShape(geoShape){
				var normalized = {};
				if(geoShape.type=='circle'){
					normalized={
						"type": "circle",
						"latitude": geoShape.getCenter().lat(),
						"longitude": geoShape.getCenter().lng(),
						"radius": Math.round(geoShape.getRadius()) / 1000
					}
				}else if(geoShape.type=='rectangle'){
					normalized = {
						"type": "rectangle",
						"northEast":{
							"latitude": geoShape.getBounds().getNorthEast().lat(),
							"longitude": geoShape.getBounds().getNorthEast().lng()
						},
						"southWest":{
							"latitude": geoShape.getBounds().getSouthWest().lat(),
							"longitude": geoShape.getBounds().getSouthWest().lng()
						}
					}
				}else if(geoShape.type=='marker'){
					normalized={
						"type": "marker",
						"latitude": geoShape.getPosition().lat(),
						"longitude": geoShape.getPosition().lng()
					}
				}
				return normalized;
			}
			function returnResults(newShape){
				if(typeof(scope.callback)=='function'){
					if(scope.config.advanced)
						scope.callback(newShape);
					else
						scope.callback(normalizeShape(newShape))
				}
			}

			geoService.location().then(function(geo){
				scope.geo=geo;
				var mapOptions = {
					center: new google.maps.LatLng(geo.coords.latitude,geo.coords.longitude),
					zoom: scope.config.zoom
				};
				scope.map = new google.maps.Map(elem[0],mapOptions);

				var polyOptions = {
					strokeWeight: 0,
					fillOpacity: 0.45,
					editable: false
				};
				drawingManager = new google.maps.drawing.DrawingManager({
					drawingControlOptions: {
						position: google.maps.ControlPosition.TOP_CENTER,
						drawingModes: scope.consts.modes
					},
					drawingMode: scope.consts.modes[0],
					rectangleOptions: polyOptions,
					circleOptions: polyOptions,
					map: scope.map
				});
				

				google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {
					scope.deleteOld();
					var newShape = e.overlay;
						newShape.type = e.type;
						scope.setCurrent(newShape);
						returnResults(newShape)
				});

				if(scope.config.initmarker){
					scope.consts.currentShape = new google.maps.Marker({
						type: 'marker',
						map:scope.map,
						animation: google.maps.Animation.DROP,
						position: mapOptions.center
					});
					returnResults(scope.consts.currentShape)
				}

				var rectangleOptions = drawingManager.get('rectangleOptions');
				rectangleOptions.fillColor = scope.config.color;
				drawingManager.set('rectangleOptions', rectangleOptions);

				var circleOptions = drawingManager.get('circleOptions');
				circleOptions.fillColor = scope.config.color;
				drawingManager.set('circleOptions', circleOptions);
			})
			scope.setCurrent=function setCurrent(shape) {
				scope.consts.currentShape = shape;
			}
			scope.deleteOld=function deleteOld() {
				if (scope.consts.currentShape) {
					scope.consts.currentShape.setMap(null);
				}
			}
		}
	}
}]);



app.directive('aside', ['geoService', function(geoService){
	return {
		restrict: 'E',
		templateUrl: 'partials/sidebar.html',
		transclude: true
	}
}]);