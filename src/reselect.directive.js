Reselect.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	},
	selectionTemplate: angular.element('<span ng-bind="$selection"></span>')
})

.directive('reselect', ['$compile', function($compile){
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
		link: function($scope, $element, $attrs, ctrls, transcludeFn){

			var $Reselect = ctrls[0];
			var $transcludeElems = null;

			transcludeFn($scope, function(clone){
				$transcludeElems = clone;
				$element.append(clone);
			}).detach();

			$transcludeElems = angular.element('<div>').append($transcludeElems);

			var $choice = $transcludeElems[0].querySelectorAll('.reselect-choices, [reselect-choices]');
			var $selection = $transcludeElems[0].querySelectorAll('.reselect-selection, [reselect-selection]');
				$selection = $selection.length ? $selection : $Reselect.options.selectionTemplate.clone();

			angular.element($element[0].querySelectorAll('.reselect-dropdown')).append($choice);
			angular.element($element[0].querySelectorAll('.reselect-rendered-selection')).append($selection);

			$Reselect.transcludeCtrls.$ReselectChoice = angular.element($choice).controller('reselectChoices');

			$compile($selection)($Reselect.selection_scope);
		},
		controllerAs: '$reselect',
		controller: ['$scope', '$element', 'reselectDefaultOptions', '$timeout', function($scope, $element, reselectDefaultOptions, $timeout){

			var ctrl = this;
			var $ngModel = $element.controller('ngModel');

			// Options
			ctrl.options = angular.extend({}, reselectDefaultOptions, $scope.reselectOptions);

			// Variables
			ctrl.value = null;
			ctrl.opened = false;
			ctrl.transcludeCtrls = {};

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

			ctrl.selection_scope = $scope.$new();
			ctrl.selection_scope.$selection = null;

			ctrl.rendered_selection = null;

			ctrl.renderSelection = function(state, $choice){
				ctrl.selection_scope.$selection = state;
				ctrl.selection_scope.$choice = $choice;
			};

			/**
			 * Controller Methods
			 */

			ctrl.selectValue = function(value, $choice){
				$ngModel.$setViewValue(value);

				ctrl.value = value;

				ctrl.renderSelection(ctrl.value, $choice);

				ctrl.hideDropdown();
			};

			// Override ng-model render function
			$ngModel.$render = function(){
				var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

				if(!ctrl.options.allowInvalid && angular.isDefined(valueSelected)){
					var choices = ctrl.transcludeCtrls.$ReselectChoice.DataAdapter.data;
					var trackBy = ctrl.transcludeCtrls.$ReselectChoice.parsedOptions.trackByExp;

					var choiceMatch, valueSelectedMatch;

					for(var i = 0; i < choices.length; i++){
						if(!angular.isDefined(choices[i])){
							continue;
						}

						if(trackBy){
							choiceMatch = choices[i][trackBy];
							valueSelectedMatch = valueSelected[trackBy];
						}else{
							choiceMatch = choices[i];
							valueSelectedMatch = valueSelected;
						}
						if(choiceMatch === valueSelectedMatch){
							valueToBeSelected = choiceMatch;
							break;
						}
					}
				}else{
					valueToBeSelected = valueSelected;
				}

				if(valueToBeSelected){
					ctrl.selectValue($ngModel.$viewValue);
				}else{
					if(ctrl.options.resolveInvalid && typeof ctrl.options.resolveInvalid === 'function'){
						var validateDone = function(value){
							if(value !== undefined){
								ctrl.selectValue(value);
							}else{
								$ngModel.$setViewValue(valueToBeSelected);
							}
						};

						ctrl.options.resolveInvalid(valueSelected, validateDone);
					}else{
						$ngModel.$setViewValue(valueToBeSelected);
					}

				}

				return;
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

			function hideDropdownOnClick(event){
				if($element[0].contains(event.target)){
					return;
				}

				$scope.$apply(function(){
					ctrl.hideDropdown();
				});

				angular.element(document).off('click', hideDropdownOnClick);
			}

			ctrl.showDropdown = function(){
				ctrl.opened = true;

				ctrl.transcludeCtrls.$ReselectChoice.getData(true);

				$scope.$emit('reselect.search.focus');

				angular.element(document).on('click', hideDropdownOnClick);
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
