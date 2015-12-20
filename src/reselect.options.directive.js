angular.module('reselect.options.directive', [])

.directive('reselectOptions', [function(){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.options.directive.tpl.html',
		controller: ['$scope', function($scope){
			var self = $scope.options = self;


		}]
	};
}]);