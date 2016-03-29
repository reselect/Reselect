(function(){
	'use strict';

	angular.module('simple', ['Reselect', 'lazycontainer'])

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

	}]);

})();
