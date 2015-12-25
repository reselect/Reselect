
Reselect.value('reselectDefaultOptions', {
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

			return function($scope, $element, $attrs, ctrls){
				transcludeFn($scope, function(clone){
					$element.append(clone[1]);
				});
			};
			
		},
		controllerAs: 'reselect',
		controller: ['$scope', 'reselectDefaultOptions', function($scope, reselectDefaultOptions){
			var ctrl = this;

			// Options
			ctrl.options = angular.extend({}, $scope.reselectOptions, reselectDefaultOptions);

			ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();

			ctrl.selectValue = function(value){
				$scope.ngModel = value;
			};

			return ctrl;
		}]
	};
}]);