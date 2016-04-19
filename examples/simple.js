(function(){
	'use strict';

	angular.module('simple', ['Reselect'])

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

	.controller('SimpleCtrl', ['$scope', '$timeout', 'MOCK_DATA', function($scope, $timeout, MOCK_DATA){

		var self = $scope.simple = this;

		self.mocks = {};

		MOCK_DATA.then(function(data){
			angular.extend(self.mocks, data);
		});

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
