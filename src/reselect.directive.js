
Reselect.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	},
	selectionTemplate: function(state){
		return state.text;
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
				var $choice = transcludeFn($scope, function(clone){
					$element.append(clone[1]);
				}).detach();

				angular.element($element[0].querySelectorAll('.reselect-dropdown')).append($choice);
			};

		},
		controllerAs: '$reselect',
		controller: ['$scope', '$element', 'reselectDefaultOptions', '$timeout', function($scope, $element, reselectDefaultOptions, $timeout){

			var ctrl = this;
			var $ngModel = $element.controller('ngModel');

			// Options
			ctrl.options = angular.extend({}, $scope.reselectOptions, reselectDefaultOptions);

			// Variables
			ctrl.value = null;
			ctrl.opened = false;

			/**
			 * Placeholder
			 */

			ctrl.rendered_placeholder = null;

			ctrl.renderPlaceholder = function(){
				ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();
			};

			/**
			 * Selection
			 */

			ctrl.rendered_selection = null;

			ctrl.renderSelection = function(state){
				ctrl.rendered_selection = ctrl.options.selectionTemplate(state);
			};

			/**
			 * Controller Methods
			 */

			ctrl.selectValue = function(value){
				$ngModel.$setViewValue(value);
				ctrl.value = value;

				ctrl.renderSelection(ctrl.value);

				ctrl.hideDropdown();
			};

			/**
			 * Choices
			 */

			ctrl.parsedOptions = null;
			ctrl.choices = [];

			/**
			 * Dropdown
			 */

			ctrl.toggleDropdown = function(){
				if(ctrl.opened){
					ctrl.hideDropdown();
				}else{
					ctrl.showDropdown();
				}
			};

			ctrl.showDropdown = function(){
				ctrl.opened = true;
			};

			ctrl.hideDropdown = function(){
				ctrl.opened = false;
			};

			/**
			 * Initialization
			 */

			ctrl.initialize = function(){
				ctrl.renderPlaceholder();
			};

			ctrl.initialize();

			return ctrl;
		}]
	};
}]);
