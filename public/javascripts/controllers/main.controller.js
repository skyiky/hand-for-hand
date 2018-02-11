angular.module('app')
.controller('mainController', ['$scope', '$rootScope', '$http', '$window', '$uibModal',
	function($scope, $rootScope, $http, $window, $uibModal) {
		$scope.user = null;
		$scope.isLoggedIn = false;
		$scope.markers = {};
		$scope.coords = {};
		$scope.posts = [];
		$scope.search = "";
		
		function initPage() {
			var mapOptions = {
				zoom: 14,
				center: new google.maps.LatLng(49.2807513, -123.1152712),
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				disableDefaultUI: true,
				zoomControl: true,
				styles: [
				{
					"featureType": "landscape.natural",
					"elementType": "geometry.fill",
					"stylers": [
					{
						"visibility": "on"
					},
					{
						"color": "#e0efef"
					}
					]
				},
				{
					"featureType": "poi",
					"elementType": "geometry.fill",
					"stylers": [
					{
						"visibility": "on"
					},
					{
						"hue": "#1900ff"
					},
					{
						"color": "#c0e8e8"
					}
					]
				},
				{
					"featureType": "road",
					"elementType": "geometry",
					"stylers": [
					{
						"lightness": 100
					},
					{
						"visibility": "simplified"
					}
					]
				},
				{
					"featureType": "road",
					"elementType": "labels",
					"stylers": [
					{
						"visibility": "off"
					}
					]
				},
				{
					"featureType": "transit.line",
					"elementType": "geometry",
					"stylers": [
					{
						"visibility": "on"
					},
					{
						"lightness": 700
					}
					]
				},
				{
					"featureType": "water",
					"elementType": "all",
					"stylers": [
					{
						"color": "#7dcdcd"
					}
					]
				}
				]
			};


			$scope.map = new google.maps.Map(document.getElementById('map'), mapOptions);

			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function (position) {
					var initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
					$scope.coords.lat = initialLocation.lat();
					$scope.coords.lng = initialLocation.lng();
					$scope.map.setCenter(initialLocation);

					$scope.userMarker = new google.maps.Marker({
						position: initialLocation,
						map: $scope.map,
						icon: 'http://www.robotwoods.com/dev/misc/bluecircle.png'
					});
				});
			}

			var username = $window.sessionStorage.getItem("user");

			$http.get('/auth/user/' + username).success(function(data) {
				if (data.state === 'success') {
					$scope.user = data.user;
					$scope.isLoggedIn = true;
				}

				$http.get('/post/all').success(function(data) {
					if (data.state === 'success') {
						Object.keys(data.data).forEach(function(username) {
							Object.keys(data.data[username]).forEach(function(id) {
								$scope.posts.push(data.data[username][id]);
							});
						});

						$scope.loadMarkers();
					}
				});
			}, function (err) {
				// fail silently
				console.log(err);
			});
		}

		$scope.clearMarkers = function() {
			Object.keys($scope.markers).forEach(function(key) {
				$scope.markers[key].setMap(null);
			});
		};

		$scope.loadMarkers = function() {
			$scope.clearMarkers();

			for (var i = 0; i < $scope.posts.length; i++) {
				addMarker($scope.posts[i]);
			}
		}

		function addMarker(post) {
			var geocoder = new google.maps.Geocoder();
			geocoder.geocode({ 'address': post.location}, function(results, status) {
				if (status == google.maps.GeocoderStatus.OK) {
					var fillColor = null;
					var strokeColor = null;
					var radius = post.serviceType.length * 0.8 * 500;

					if (post.serviceType.length > 1) {
						fillColor = '#FFFF66';
						strokeColor = '#FFCC66';
					} else {
						var serviceType = post.serviceType[0];

						if (serviceType.value === 0) {
							fillColor = '#FF9900';
							strokeColor = 'FF6633';
						} else if (serviceType.value === 1) {
							fillColor = '#00CC66';
							strokeColor = '#339933';
						} else if (serviceType.value === 2) {
							// fix blue
							fillColor = '#3399FF';
							strokeColor = '0066FF'
						} else {
							fillColor = '#CC99FF';
							strokeColor = '#9966FF'
						}
					}

					$scope.markers[post.id] = new google.maps.Circle({
						map: $scope.map,
						center: new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()),
						strokeColor: strokeColor,
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: fillColor,
						fillOpacity: 0.5,
						radius: radius
					});

					google.maps.event.addListener($scope.markers[post.id], 'click', function () {
						$uibModal.open({
							templateUrl: 'post.template.html',
							controller: 'modalController',
							resolve: {
								user: function() {
									return $scope.user;
								},
								post: function() {
									return post;
								}
							}
						});
					});
				}
			});
		}

		$scope.openSignInModal = function() {
			var signInModalInstance = $uibModal.open({
				templateUrl: 'signin.template.html',
				controller: 'modalController',
				resolve: {
					user: function() {
						return $scope.user;
					},
					post: function() {
						return null;
					}
				}
			});

			signInModalInstance.result.then(function(user) {
				if (user) {
					$scope.user = user;
					$scope.isLoggedIn = true;
					$window.sessionStorage.setItem("user", user.username);
				}
			});
		}

		$scope.openAddPostingModal = function() {
			var addPostingModalInstance = $uibModal.open({
				templateUrl: 'post.add.template.html',
				controller: 'modalController',
				resolve: {
					user: function() {
						return $scope.user;
					},
					post: function() {
						return null;
					}
				}
			});

			addPostingModalInstance.result.then(function(posting) {
				addMarker(posting);
			});
		}

		$scope.openModal = function() {
			$uibModal.open({
				templateUrl: 'post.template.html',
				controller: 'modalController',
				resolve: {
					user: function() {
						return $scope.user;
					},
					post: function() {
						return null;
					}
				}
			})
		}

		$scope.logout = function() {
			$window.sessionStorage.clear();
			$scope.user = null;
			$scope.isLoggedIn = false;
		}

		initPage();
	}]);