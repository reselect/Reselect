(function(){
	'use strict';

	angular.module('simple', ['Reselect', 'ngSanitize'])

	.service('MOCK_DATA', function($q, $http){
		var defer = $q.defer();

		$http.get('./MOCK_DATA.json')
			.success(function(data){

				var mocks = {
					single: data.map(function(data){
						return data.skill
					}),
					objects: data
				};

				defer.resolve(mocks);
			});

		return defer.promise;
	})

	.controller('SimpleCtrl', ['$scope', '$rootScope', '$timeout', 'MOCK_DATA', function($scope, $rootScope, $timeout, MOCK_DATA){

		var self = $scope.simple = this;

		self.mocks = {};

		self.value = 'HTML';
		self.invalidValue = 50;
		self.invalidValue2 = 50;
		self.invalidValue3 = {};
		self.objects1 = 3;

		MOCK_DATA.then(function(data){
			angular.extend(self.mocks, data);

			self.objects2 = data.objects[2];

			self.ready = true;
		});

		self.invalidOptions2 = {
			allowInvalid: function(value, done){
				done('Resolved Value');
			}
		}

		self.invalidOptions3 = {
			allowInvalid: function(value, done){
				$timeout(function(){
					done(self.mocks.objects[2]);
				}, 1000);
			}
		}

		self.remoteOptions = {
			endpoint: function(params, pagination){
				if(params.search_term){
					return 'https://www.reddit.com/r/webdev/search/.json';
				}else{
					return 'https://www.reddit.com/r/webdev/.json';
				}

			},
			params: function(params, pagination){
				var query = {
					after: pagination.more,
					limit: 10,
					q    : params.search_term,
					t    : 'all',
					sort : 'relevance'
				};

				return query;
			},
			onData: function(data){
				return {
					data: data.data.children,
					pagination: {
						more: data.data.after
					}
				};
			}
		};

	}]);

})();
