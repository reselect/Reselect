(function(){
	'use strict';

	angular.module('simple', ['Reselect'])

	.controller('SimpleCtrl', ['$scope', '$timeout', function($scope, $timeout){

		var self = $scope.simple = this;

		self.value = 888;

		var num = 0;

		// $timeout(function(){
			self.choices = Array.apply(null, Array(1000)).map(function(){
				return {
					text: 'Option ' + (num++)
				};
			});
		// }, 5000);

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
					q: params.search_term,
					t: 'all',
					sort: 'relevance'
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
