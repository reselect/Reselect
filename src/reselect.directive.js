Reselect.value('reselectDefaultOptions', {
})

.directive('reselect', ['$compile', function($compile){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.directive.tpl.html',
		require     : ['^reselect', '^ngModel'],
		transclude  : true,
		replace     : true,
		scope		: true,
		link: function($scope, $element, $attrs, ctrls, transcludeFn){

			var $Reselect = ctrls[0];
			var $transcludeElems = null;

			transcludeFn($scope, function(clone, scp){
				$transcludeElems = clone;
				$element.append(clone);
			}).detach();

			function transcludeAndAppend(target, destination, store, ctrl, replace){
				var $transcludeElement = $transcludeElems[0].querySelectorAll('.'+target, '['+target+']', target);

				if($transcludeElement.length === 1){
					if(replace === true){
						angular.element($element[0].querySelectorAll('.'+target)).replaceWith($transcludeElement);
					}else{
						angular.element($element[0].querySelectorAll(destination)).append($transcludeElement);
					}
				}else{
                    $transcludeElement = $element[0].querySelectorAll('.'+target);
                }

                if(store && ctrl){
                    $Reselect.transcludeCtrls[store] = angular.element($transcludeElement).controller(ctrl);
                    $Reselect.transcludeScopes[store] = angular.element($transcludeElement).scope();
                }
			}

			// Wrap array of transcluded elements in a <div> so we can run css queries
			$transcludeElems = angular.element('<div>').append($transcludeElems);

			// Transclude [reselect-choices] directive
			transcludeAndAppend('reselect-choices', '.reselect-dropdown', '$ReselectChoice', 'reselectChoices');
			transcludeAndAppend('reselect-no-choice', '.reselect-empty-container');
			transcludeAndAppend('reselect-placeholder', '.reselect-rendered-placeholder', '$ReselectPlaceholder', 'reselectPlaceholder', true);
			transcludeAndAppend('reselect-selection', '.reselect-rendered-selection', '$ReselectSelection', 'reselectSelection', true);

            console.log($Reselect.transcludeScopes);

			// Transclude [reselect-no-choice] directive
            var $choice = $transcludeElems[0].querySelectorAll('.reselect-choice, [reselect-choice], reselect-choice');

            $Reselect.transcludeCtrls.$ReselectChoice.registerChoices($choice);
		},
		controllerAs: '$reselect',
		controller: ['$scope', '$element', '$attrs', '$parse', 'reselectDefaultOptions', '$timeout', 'KEYS', function($scope, $element, $attrs, $parse, reselectDefaultOptions, $timeout, KEYS){

			var ctrl = this;
			var $ngModel = $element.controller('ngModel');

			// Options
			ctrl.options = angular.extend({}, reselectDefaultOptions, $parse($attrs.reselectOptions)($scope));

			// Variables
			ctrl.value = null;
			ctrl.opened = false;
			ctrl.transcludeCtrls = {};
			ctrl.transcludeScopes = {};

			ctrl.parsedChoices = null;
			ctrl.DataAdapter = null;

			ctrl.search_term = '';
			ctrl.isDisabled = false; // TODO
			ctrl.isFetching = false; // TODO
			ctrl.isRequired = false; // TODO

			/**
			 * Selection
			 */

			ctrl.selection_scope = {};
			ctrl.selection_scope.$selection = null;

			ctrl.renderSelection = function(state, $choice){
				ctrl.selection_scope.$selection = state;
				ctrl.selection_scope.$choice = $choice;

                $scope.$broadcast('reselect.renderselection', ctrl.selection_scope);
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

			ctrl.clearSearch = function(){
				ctrl.search_term = '';
			};

			// Override ng-model render function
			$ngModel.$render = function(){
				var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

				if(!ctrl.options.allowInvalid && angular.isDefined(valueSelected)){
					var choices = ctrl.DataAdapter.data;
					var trackBy = ctrl.parsedOptions.trackByExp;

					var choiceMatch, valueSelectedMatch;

					if(choices && choices.length >= 0){
						for(var i = 0; i < choices.length; i++){
							if(!angular.isDefined(choices[i])){
								continue;
							}

							var scp = {};
							scp[ctrl.parsedOptions.itemName] = choices[i];

							choiceMatch = ctrl.parsedOptions.modelMapper(scp);
							valueSelectedMatch = valueSelected;

							if(choiceMatch === valueSelectedMatch){
								valueToBeSelected = choices[i];
								break;
							}
						}
					}
				}
				/**
				 * Allow Invalid
				 *
				 * This options allows the select to try and resolve a possible
				 * value when an invalid value is set to the ng-model
				 */
				else if(ctrl.options.allowInvalid) {
					// TODO
				}

				if(valueToBeSelected){
					ctrl.selectValue($ngModel.$viewValue, valueToBeSelected);
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
                        ctrl.selectValue(null, null);
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
			 * Keyboard Support
			 */

            ctrl.handleKeyDown = function(evt) {
                var key = evt.which;

                if (ctrl.opened) {
                   if (key === KEYS.ESC || key === KEYS.TAB) {
                     ctrl.hideDropdown();

                     evt.preventDefault();
                   }
                 } else {
                   if (key === KEYS.ENTER || key === KEYS.SPACE) {
                     ctrl.showDropdown();

                     evt.preventDefault();
                   } else if(key === KEYS.ESC) {
                     $scope.$emit('reselect.input.blur');

                     evt.preventDefault();
                   }
                 }
            };

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
					ctrl.hideDropdown(true);
				});

				angular.element(document).off('click', hideDropdownOnClick);
			}

			ctrl.showDropdown = function(){
				ctrl.opened = true;

				ctrl.transcludeCtrls.$ReselectChoice.getData(true);

				$scope.$emit('reselect.search.focus');

				angular.element(document).on('click', hideDropdownOnClick);
			};

			ctrl.hideDropdown = function(blurInput){
				ctrl.opened = false;

				// Clear search
				ctrl.clearSearch();

                if(!blurInput) {
                    $scope.$emit('reselect.input.focus');
                }
			};

			return ctrl;
		}]
	};
}]);
