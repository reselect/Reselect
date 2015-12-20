/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2015-12-19T08:49:52.127Z
 * License: MIT
 */


(function () { 
'use strict';
angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container\"><div class=\"reselect-selection\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-if=\"false\" ng-bind-html=\"reselect.rendered_selection\"></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-if=\"true\" ng-bind-html=\"reselect.rendered_placeholder\"></div><div class=\"reselect-input-container\"><input class=\"reselect-text-input\" readonly=\"readonly\" ng-if=\"true\"></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-options-container\"><ul></ul></div>");}]);


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

angular.module('reselect.directive', ['reselect.controller', 'reselect.options.directive', 'ngSanitize'])

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
		transclude  : true,
		scope: {
			ngModel         : '=',
			reselectOptions : '='
		},
		compile: function($element, $attrs, transcludeFn){
			transcludeFn($element, function(clone){
				console.log(clone[1].tagName);
			});
		},
		link: function($scope, $element){
			console.log($element.html());
		},
		controller: 'reselect.directive.ctrl'
	};
}]);

angular.module('reselect', ['reselect.directive', 'reselect.templates']);
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
}());