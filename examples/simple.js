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
			endpoint: 'https://www.reddit.com/r/webdev/.json',
			params: function(params, pagination){
				params.after = pagination.more;
				params.limit = 100;
				return params;
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
