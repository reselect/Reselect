Reselect.value('reselectDefaultOptions', {
    allowClear: false
})

.directive('reselect', ['$compile', function($compile){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.directive.tpl.html',
		require     : ['^reselect', '^ngModel'],
		transclude  : true,
		replace     : true,
		scope		: true,
        terminal    : true,
		link: function($scope, $element, $attrs, ctrls, transcludeFn){

			var $Reselect = ctrls[0];
			var $transcludeElems = null;

			transcludeFn($scope, function(clone, scp){
				$transcludeElems = clone;
				$element.append(clone);
			}).detach();

			function transcludeAndAppend(target, destination, store, ctrl, replace){
				var $transcludeElement = $transcludeElems[0].querySelectorAll('.'+target+','+ '['+target+'],' + target);

				if($transcludeElement.length === 1){
					if(replace === true){
						angular.element($element[0].querySelector('.'+target)).replaceWith($transcludeElement);
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
			transcludeAndAppend('reselect-no-choice', '.reselect-empty-container', null, null, true);
			transcludeAndAppend('reselect-placeholder', '.reselect-rendered-placeholder', '$ReselectPlaceholder', 'reselectPlaceholder', true);
			transcludeAndAppend('reselect-selection', '.reselect-rendered-selection', '$ReselectSelection', 'reselectSelection', true);

			// Transclude [reselect-no-choice] directive
            var $choice = $transcludeElems[0].querySelectorAll('.reselect-choice, [reselect-choice], reselect-choice');

            $Reselect.transcludeCtrls.$ReselectChoice.registerChoices($choice);

            $Reselect.$dropdown = angular.element($element[0].querySelector('.reselect-dropdown')).detach();
            $Reselect.$dropdown[0].style.top = '-999999px';
            $Reselect.$options_container = angular.element($Reselect.$dropdown[0].querySelectorAll('.reselect-options-container'));

		},
		controllerAs: '$reselect',
		controller: ['$scope', '$element', '$attrs', '$parse', 'ReselectUtils', 'reselectDefaultOptions', '$timeout', '$window', '$document', 'KEYS', function($scope, $element, $attrs, $parse, ReselectUtils, reselectDefaultOptions, $timeout, $window, $document, KEYS){

			var ctrl = this;
			var $ngModel = $element.controller('ngModel');

			// Options
			ctrl.options = angular.extend({}, reselectDefaultOptions, $parse($attrs.reselectOptions)($scope));

            angular.forEach(reselectDefaultOptions, function(v, key){
                if(angular.isDefined($attrs[key])){
                    ctrl.options[key] = $parse($attrs[key])($scope);
                }
            });

			// Variables
			ctrl.value = null;
			ctrl.opened = false;
			ctrl.isDropdownAbove = false;
			ctrl.transcludeCtrls = {};
			ctrl.transcludeScopes = {};

			ctrl.parsedChoices = null;
			ctrl.DataAdapter = null;

			ctrl.search_term = '';
            ctrl.isRemote   = false;
			ctrl.isDisabled = false; // TODO
			ctrl.isFetching = false; // TODO
            ctrl.dropdownBuffer = 50; // Minimum distance between dropdown and viewport
            ctrl.scrollPos  = 0;

            ctrl.$element  = $element[0];
            ctrl.$dropdown = null;
            ctrl.$options_container  = null;

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

            ctrl.clearValue = function(){
                ctrl.selectValue(undefined, undefined);
            };

			ctrl.selectValue = function(value, $choice){

				$ngModel.$setViewValue(value);

				ctrl.value = value;

				ctrl.renderSelection(ctrl.value, $choice || value);
                ctrl._saveScrollPos();

                if(ctrl.opened) {
                    ctrl.hideDropdown();
                }
			};

			ctrl.clearSearch = function(){
				ctrl.search_term = '';
			};

			// Override ng-model render function
			$ngModel.$render = function(){
				var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

                function mapModelValue(value){
                    var scp = {};
                    scp[ctrl.parsedOptions.itemName] = value;

                    return ctrl.parsedOptions.modelMapper(scp);
                }

				if(angular.isDefined(valueSelected)){
					var choices = ctrl.DataAdapter.data;
					var trackBy = ctrl.parsedOptions.trackByExp;

					var choiceMatch, valueSelectedMatch;

					if(choices && choices.length >= 0){
						for(var i = 0; i < choices.length; i++){
							if(!angular.isDefined(choices[i])){
								continue;
							}

							choiceMatch = mapModelValue(choices[i]);

							valueSelectedMatch = valueSelected;

							if(choiceMatch === valueSelectedMatch){
								valueToBeSelected = choices[i];
								break;
							}
						}
					}
				}


				if(valueToBeSelected){
					ctrl.selectValue($ngModel.$viewValue, valueToBeSelected);
				}else{
					/**
					 * Allow Invalid
					 *
					 * This options allows the select to try and resolve a possible
					 * value when an invalid value is set to the ng-model
					 */
					if(ctrl.options.allowInvalid === true){
						ctrl.selectValue(valueSelected);
					}else if(ctrl.options.allowInvalid && typeof ctrl.options.allowInvalid === 'function'){
						var validateDone = function(value){
							if(value !== undefined){
								ctrl.selectValue(mapModelValue(value), value);
							}else{
								ctrl.selectValue(undefined);
							}
						};

						ctrl.options.allowInvalid(valueSelected, validateDone);
					}else{
						ctrl.selectValue(undefined);
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
                   if (key === KEYS.ENTER || key === KEYS.SPACE || key === KEYS.UP || key === KEYS.DOWN) {
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

                $scope.$safeApply(function() {
                    ctrl.hideDropdown(true);
                });

				angular.element(document).off('click', hideDropdownOnClick);
			}

			ctrl.showDropdown = function(){
				ctrl.opened = true;

				ctrl.transcludeCtrls.$ReselectChoice.getData(true).then(function() {
                    ctrl._positionDropdown();
                    ctrl._appendDropdown();
                    if(!ctrl.isRemote) {
                        ctrl._setScrollPos();
                    }
                });

				$scope.$emit('reselect.search.focus');

				angular.element(document).on('click', hideDropdownOnClick);
			};

			ctrl.hideDropdown = function(blurInput){
				ctrl.opened = false;

				// Clear search
				ctrl.clearSearch();

                ctrl._removeDropdown();

                if(!blurInput) {
                    $scope.$emit('reselect.input.focus');
                }
			};

            /**
            * Event Listeners
            */

            ctrl.bindEventListeners = function() {
                $scope.$on('reselect.hide', function(){
                    $scope.$safeApply(function(){
    					ctrl.hideDropdown();
    				});
                });
            };

            $scope.$on('$destroy', function(){
                ctrl._removeDropdown();
                angular.element(document).off('click', hideDropdownOnClick);
            });
            /**
			 * Position Dropdown
			 */

             ctrl._calculateDropdownPosition = function(dropdownHeight) {
                dropdownHeight = angular.isNumber(dropdownHeight) ? dropdownHeight + ctrl.dropdownBuffer : ctrl.dropdownBuffer;

                var $element  = ctrl.$element;
                var $elementBCR = $element.getBoundingClientRect();

                var offset    = {
                    width: Math.round(angular.isNumber($elementBCR.width) ? $elementBCR.width : $element.offsetWidth),
                    height: Math.round(angular.isNumber($elementBCR.height) ? $elementBCR.height : $element.offsetHeight),
                    top: Math.round($elementBCR.top + ($window.pageYOffset || $document[0].documentElement.scrollTop)),
                    bottom: Math.round($elementBCR.bottom + ($window.pageYOffset || $document[0].documentElement.scrollTop)),
                    left: Math.round($elementBCR.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft))
                };

                ctrl.isDropdownAbove = Math.round($elementBCR.top) > ($window.outerHeight - Math.round($elementBCR.bottom));

                return offset;
             };
             ctrl._calculateDropdownHeight = function() {
                 var searchHeight   = ctrl.transcludeCtrls.$ReselectChoice.choiceHeight;
                 var listHeight     = ctrl.transcludeCtrls.$ReselectChoice.listHeight + searchHeight;
                 var choicesHeight  = ctrl.$dropdown[0].clientHeight;

                 return (choicesHeight >= listHeight) ? listHeight : choicesHeight;
             };
             ctrl._positionDropdown = function() {
                 var animationFrame = ReselectUtils.requstAnimFrame();

                 animationFrame(function() {
                     var dropdownHeight = ctrl._calculateDropdownHeight();
                     $scope.$safeApply(function() {
                         var element_offset = ctrl._calculateDropdownPosition(dropdownHeight);

                         ctrl.$dropdown[0].style.width = element_offset.width + 'px';
                         ctrl.$dropdown[0].style.top   = ctrl.isDropdownAbove ? element_offset.top - dropdownHeight + 'px' : element_offset.bottom + 'px';
                         ctrl.$dropdown[0].style.left  = element_offset.left + 'px';
                     });
                 });
             };
             ctrl._appendDropdown = function() {
                 return document.querySelector('body').appendChild(ctrl.$dropdown[0]);
             };
             ctrl._removeDropdown = function() {
                 var $body = document.querySelector('body');
                 if($body.contains(ctrl.$dropdown[0])) {
                     return $body.removeChild(ctrl.$dropdown[0]);
                 }
             };
             ctrl._saveScrollPos = function() {
                 if(ctrl.$options_container.length) {
                     ctrl.scrollPos = ctrl.$options_container[0].scrollTop;
                 }
             };
             ctrl._setScrollPos = function() {
                 var animationFrame = ReselectUtils.requstAnimFrame();

                 animationFrame(function() {
                     if(ctrl.$options_container.length) {
                        ctrl.$options_container[0].scrollTop = ctrl.scrollPos;
                     }
                 });
             };

			/**
			 * Initialization
			 */

			ctrl.initialize = function(){
                ctrl.bindEventListeners();
			};

			ctrl.initialize();

			return ctrl;
		}]
	};
}]);
