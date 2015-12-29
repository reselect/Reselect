
Reselect.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	}
})

.directive('reselect', [function(){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.directive.tpl.html',
		require     : ['^reselect', '^ngModel'],
		transclude  : true,
		replace     : true,
		scope: {
			ngModel         : '=',
			reselectOptions : '='
		},
		compile: function($element, $attrs, transcludeFn){

			return function($scope, $element, $attrs, ctrls){
				transcludeFn($scope, function(clone){
					$element.append(clone[1]);
				});
			};
			
		},
		controllerAs: '$reselect',
		controller: ['$scope', 'reselectDefaultOptions', '$timeout', function($scope, reselectDefaultOptions, $timeout){
			
			var ctrl = this;

			// Options
			ctrl.options = angular.extend({}, $scope.reselectOptions, reselectDefaultOptions);

			ctrl.opened = false;

			ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();

			ctrl.value = null;

			ctrl.selectValue = function(value){
				ctrl.value = value;
				$scope.ngModel = value;
			};

			// Options Directive
			ctrl.parsedOptions = null;
			ctrl.choices = [];

			ctrl.toggleDropdown = function(){
				$scope.$broadcast('reselect.options.' + (!ctrl.opened ? 'show' : 'hide'));

				ctrl.opened = !ctrl.opened;
			};

			return ctrl;
		}]
	};
}]);