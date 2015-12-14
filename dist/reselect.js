/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2015-12-14T10:33:37.893Z
 * License: MIT
 */


(function () { 
'use strict';
angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container\"><div class=\"reselect-selection\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-if=\"false\" ng-bind-html=\"reselect.rendered_selection\"></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-if=\"true\" ng-bind-html=\"reselect.rendered_placeholder\"></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div></div>");}]);


var ReselectDirectiveCtrl = function($scope, reselectDefaultOptions){
	var ctrl = $scope.reselect = this;

	// Options
	ctrl.options = angular.extend({}, $scope.reselectOptions, reselectDefaultOptions);

	ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();
};

ReselectDirectiveCtrl.$inject = ['$scope', 'reselectDefaultOptions'];

angular
	.module('reselect.controller', [])
	.controller('reselect.directive.ctrl', ReselectDirectiveCtrl);

angular.module('reselect.directive', ['reselect.controller', 'ngSanitize'])

.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	}
})

.directive('reselect', [function(){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.directive.tpl.html',
		require     : ['^ngModel'],
		scope: {
			ngModel         : '=',
			reselectOptions : '='
		},
		controller: 'reselect.directive.ctrl'
	};
}]);

angular.module('reselect', ['reselect.directive', 'reselect.templates']);
}());