(function(){
	'use strict';

	angular.module('simple', ['reselect'])

	.controller('SimpleCtrl', ['$scope', function($scope){

		var self = $scope.simple = this;

		self.value = 888;

	}]);

})();

