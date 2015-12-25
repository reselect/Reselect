(function(){
	'use strict';

	angular.module('simple', ['Reselect'])

	.controller('SimpleCtrl', ['$scope', function($scope){

		var self = $scope.simple = this;

		self.value = 888;

		self.choices = new Array(200);

	}]);

})();

