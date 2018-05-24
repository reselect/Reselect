Reselect.provider('reselectConfig', [function(){

    angular.extend(this, {
        allowClear: false,
        placeholder: 'Please select an option',
        container: 'body'
    });
    
    this.$get = function(){
        return this;
    };
}]);

Reselect.directive('reselect', ['$compile', function($compile) {
    return {
        restrict: 'AE',
        templateUrl: 'templates/reselect.directive.tpl.html',
        require: ['^reselect', '^ngModel'],
        transclude: true,
        replace: true,
        scope: true,
        terminal: true,
        link: function($scope, $element, $attrs, ctrls, transcludeFn) {

            var $Reselect = ctrls[0];
            var $transcludeElems = null;

            transcludeFn($scope, function(clone, scp) {
                $transcludeElems = clone;
                $element.append(clone);
            }).detach();

            function transcludeAndAppend(target, destination, store, ctrl, replace) {
                var $transcludeElement = $transcludeElems[0].querySelectorAll('.' + target + ',' + '[' + target + '],' + target);
                
                if ($transcludeElement.length === 1) {
                    if (replace === true) {
                        angular.element($element[0].querySelector('.' + target)).replaceWith($transcludeElement);
                    } else {
                        angular.element($element[0].querySelectorAll(destination)).append($transcludeElement);
                    }
                } else {
                    angular.element($element[0].querySelectorAll(destination)).append($transcludeElement);
                }

                if (store && ctrl) {
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
            transcludeAndAppend('reselect-sticky', '.reselect-sticky-container', null, null);

            // TODO - Fix this
            if(!angular.element($element[0].querySelectorAll('.reselect-sticky-container')).children().length){
                angular.element($element[0].querySelectorAll('.reselect-sticky-container')).remove();
            }

            // Transclude [reselect-no-choice] directive
            var $choice = $transcludeElems[0].querySelectorAll('.reselect-choice, [reselect-choice], reselect-choice');

            $Reselect.transcludeCtrls.$ReselectChoice.registerChoices($choice);

            $Reselect.$dropdown = angular.element($element[0].querySelector('.reselect-dropdown')).detach();
            $Reselect.$dropdown[0].style.top = '-999999px';
            $Reselect.$options_container = angular.element($Reselect.$dropdown[0].querySelectorAll('.reselect-options-container'));

        },
        controllerAs: '$reselect',
        controller: ['$scope', '$element', '$attrs', '$parse', 'ReselectUtils', 'reselectConfig', '$timeout', '$window', '$document', 'KEYS', 'safeApply', function($scope, $element, $attrs, $parse, ReselectUtils, reselectConfig, $timeout, $window, $document, KEYS, safeApply) {

            var ctrl = this;
            var $ngModel = ctrl.$ngModel = $element.controller('ngModel');

            // Options
            ctrl.options = angular.extend({}, reselectConfig, $parse($attrs.reselect)($scope), $parse($attrs.reselectOptions)($scope));

            // Deprecation Warning
            if(angular.isDefined($attrs.reselectOptions)){
                console.warn('Reselect [reselect-options] is deprecated. Please pass options like this. <reselect="options">');
            }

            ctrl.validParsableAttrs = ['allowClear'];

            angular.forEach(reselectConfig, function(v, key) {
                if (angular.isDefined($attrs[key]) && ctrl.validParsableAttrs.indexOf(key) >= 0) {
                    ctrl.options[key] = $parse($attrs[key])($scope);
                }else if(angular.isDefined($attrs[key])){
                    ctrl.options[key] = $attrs[key];
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
            ctrl.isRemote = false;
            ctrl.isDisabled = false; // TODO
            ctrl.isFetching = false; // TODO
            ctrl.dropdownBuffer = 50; // Minimum distance between dropdown and viewport
            ctrl.scrollPos = 0;

            ctrl.$element = $element[0];
            ctrl.$dropdown = null;
            ctrl.$options_container = null;

            /**
             * Selection
             */

            ctrl.selection_scope = {};
            ctrl.selection_scope.$selection = null;

            ctrl.renderSelection = function(state, $choice) {
                ctrl.selection_scope.$selection = state;
                ctrl.selection_scope.$choice = $choice;

                $scope.$broadcast('reselect.renderselection', ctrl.selection_scope);
            };

            /**
             * Controller Methods
             */

            ctrl.clearValue = function() {
                ctrl.selectValue(undefined, undefined);
                $scope.$broadcast('reselect.resetIndex');
            };

            ctrl.selectValue = function(value, $choice) {
                if(value === undefined && $choice === undefined){
                    $scope.$broadcast('reselect.resetIndex');					
                }
                $ngModel.$setViewValue(value);

                ctrl.value = value;
                ctrl.isValidValue = angular.isDefined(ctrl.value) || null;

                ctrl.renderSelection(ctrl.value, $choice || value);
                ctrl._saveScrollPos();

                if (ctrl.opened) {
                    ctrl.hideDropdown();
                }
            };

            ctrl.clearSearch = function() {
                ctrl.search_term = '';
            };

            ctrl.mapModelValue = function (value) {
                var scp = {};
                scp[ctrl.parsedOptions.itemName] = value;

                return ctrl.parsedOptions.modelMapper(scp);
            }
            
            ctrl.findSelectedChoice = function () {
                var valueSelected = $ngModel.$viewValue;
                var valueToBeSelected;
                var index;

                var choices = ctrl.transcludeCtrls.$ReselectChoice.stickyChoices.filter(function(choice) {
                    return angular.isDefined(choice.value);
                }).map(function(choice) {
                    return choice.value;
                }).concat(ctrl.DataAdapter.data);

                var trackBy = ctrl.parsedOptions.trackByExp;

                var choiceMatch, valueSelectedMatch;

                if (choices && choices.length >= 0) {
                    for (var i = 0; i < choices.length; i++) {
                        if (!angular.isDefined(choices[i])) {
                            continue;
                        }

                        choiceMatch = ctrl.mapModelValue(choices[i]);

                        valueSelectedMatch = valueSelected;

                        if (typeof choiceMatch === 'object' && typeof valueSelectedMatch === 'object') {
                            var objectMatched = true

                            for(var key in valueSelectedMatch) {
                                if (!valueSelectedMatch.hasOwnProperty(key) || key === '$$reselectAllow') break

                                if (valueSelectedMatch[key] !== choiceMatch[key]) {
                                    objectMatched = false
                                    break
                                }
                            }

                            if (objectMatched) {
                                index = i;
                                valueToBeSelected = choices[i];
                                break;
                            }

                        } else if (choiceMatch === valueSelectedMatch) {
                            index = i;
                            valueToBeSelected = choices[i];
                            break;
                        }
                    }
                }

                return {
                    value: valueToBeSelected,
                    index: index
                }
            }

            // Override ng-model render function
            $ngModel.$render = function() {
                var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

				if (angular.isDefined(valueSelected)) {
                    valueToBeSelected = ctrl.findSelectedChoice(valueSelected).value
				}

                if (angular.isDefined(valueToBeSelected)) {
                    ctrl.selectValue($ngModel.$viewValue, valueToBeSelected);
                } else {
                    /**
                     * Allow Invalid
                     *
                     * This options allows the select to try and resolve a possible
                     * value when an invalid value is set to the ng-model
                     */
                    if (ctrl.options.allowInvalid === true) {
                        ctrl.selectValue(valueSelected);
                    } else if (ctrl.options.allowInvalid && typeof ctrl.options.allowInvalid === 'function') {
                        var validateDone = function(value) {
                            if (value !== undefined) {
                                ctrl.selectValue(ctrl.mapModelValue(value), value);
                            } else {
                                ctrl.selectValue(undefined);
                            }
                        };

                        ctrl.options.allowInvalid(valueSelected, validateDone);
                    } else {
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
                    } else if (key === KEYS.ESC) {
                        $scope.$emit('reselect.input.blur');

                        evt.preventDefault();
                    }
                }
            };

            /**
             * Dropdown
             */

            ctrl.toggleDropdown = function() {
                if (ctrl.isDisabled) {
                    return;
                }

                if (ctrl.opened) {
                    ctrl.hideDropdown();
                } else {
                    ctrl.showDropdown();
                }
            };

            function hideDropdownOnClick(event) {
                if (ctrl.$dropdown[0].contains(event.target)) {
                    return;
                }

                safeApply($scope, function() {
                    ctrl.hideDropdown(true);
                });

                angular.element(document).off('click', hideDropdownOnClick);

                event.stopPropagation();
            }

            ctrl.showDropdown = function() {
                ctrl.opened = true;

                ctrl._positionDropdown();
                ctrl._appendDropdown();

                setTimeout(function() {
                    angular.element(document).on('click', hideDropdownOnClick);
                });

                ctrl.transcludeCtrls.$ReselectChoice.getData(true).then(function() {
                    ctrl._positionDropdown();

                    if (!ctrl.isRemote) {
                        ctrl._setScrollPos();
                    }
                });

                $scope.$emit('reselect.search.focus');

                // Recalculate on resize
                angular.element(window).on('resize scroll', ctrl._positionDropdown);
            };

            ctrl.hideDropdown = function(blurInput) {
                ctrl.opened = false;

                // Clear search
                ctrl.clearSearch();

                ctrl._removeDropdown();

                angular.element(document).off('click', hideDropdownOnClick);

                if (!blurInput) {
                    $scope.$emit('reselect.input.focus');
                }

                // Remove resize Listeners
                angular.element(window).off('resize scroll', ctrl._positionDropdown);
            };

            /**
             * Event Listeners
             */

            ctrl.bindEventListeners = function() {
                $scope.$on('reselect.hide', function() {
                    safeApply($scope, function() {
                        ctrl.hideDropdown();
                    });
                });

                $scope.$on('reselect.choices.render', function() {
                    ctrl._positionDropdown();
                });
            };

            $scope.$on('$destroy', function() {
                ctrl._removeDropdown();
                angular.element(document).off('click', hideDropdownOnClick);
                angular.element(window).off('resize scroll', ctrl._positionDropdown);
            });

            $attrs.$observe('disabled', function(val) {
                ctrl.isDisabled = val;
            });

            /**
             * Position Dropdown
             */

            ctrl._calculateDropdownPosition = function(dropdownHeight) {
                dropdownHeight = angular.isNumber(dropdownHeight) ? dropdownHeight + ctrl.dropdownBuffer : ctrl.dropdownBuffer;

                var $element = ctrl.$element;
                var $elementBCR = $element.getBoundingClientRect();

                var offset = {
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
                var searchHeight = ctrl.transcludeCtrls.$ReselectChoice.choiceHeight;
                var stickyHeight = ctrl.$element.querySelectorAll('.reselect-sticky-container').clientHeight;
                var listHeight = ctrl.transcludeCtrls.$ReselectChoice.listHeight + searchHeight + stickyHeight;
                var choicesHeight = ctrl.$dropdown[0].clientHeight;

                return (choicesHeight >= listHeight) ? listHeight : choicesHeight;
            };
            ctrl._positionDropdown = function() {
                var animationFrame = ReselectUtils.requstAnimFrame();

                animationFrame(function() {
                    var dropdownHeight = ctrl._calculateDropdownHeight();
                    safeApply($scope, function() {
                        var element_offset = ctrl._calculateDropdownPosition(dropdownHeight);
                        var width = element_offset.width

                        if (ctrl.transcludeCtrls.$ReselectChoice.options && ctrl.transcludeCtrls.$ReselectChoice.options.minWidth >= 0 && element_offset.width < ctrl.transcludeCtrls.$ReselectChoice.options.minWidth) {
                            width = ctrl.transcludeCtrls.$ReselectChoice.options.minWidth
                        }

                        ctrl.$dropdown[0].style.width = width + 'px';
                        ctrl.$dropdown[0].style.top = ctrl.isDropdownAbove ? element_offset.top - dropdownHeight + 'px' : element_offset.bottom + 'px';
                        ctrl.$dropdown[0].style.left = element_offset.left + 'px';
                    });
                });
            };
            ctrl._getContainer = function () {
                var container;
                if (typeof ctrl.options.container === 'function') {
                    container = ctrl.options.container($element);

                    if (container && typeof container.style === 'object') {
                        container = container; //
                    } else if (container && typeof container.style === 'string') {
                        container = document.querySelector(container);
                    } else {
                        container = document.querySelector('body');
                    }
                } else if (typeof ctrl.options.container === 'string') {
                    container = document.querySelector(ctrl.options.container);	
                }

                return container;
            };
            ctrl._appendDropdown = function() {
                return ctrl._getContainer().appendChild(ctrl.$dropdown[0]);
            };
            ctrl._removeDropdown = function() {
                var $body = ctrl._getContainer();
                if ($body.contains(ctrl.$dropdown[0])) {
                    return $body.removeChild(ctrl.$dropdown[0]);
                }
            };
            ctrl._saveScrollPos = function() {
                if (ctrl.$options_container.length) {
                    ctrl.scrollPos = ctrl.$options_container[0].scrollTop;
                }
            };
            ctrl._setScrollPos = function() {
                var animationFrame = ReselectUtils.requstAnimFrame();

                animationFrame(function() {
                    if (ctrl.$options_container.length) {
                        ctrl.$options_container[0].scrollTop = ctrl.scrollPos;
                    }
                });
            };

            /**
             * Initialization
             */

            ctrl.initialize = function() {
                ctrl.bindEventListeners();
            };

            ctrl.initialize();

            return ctrl;
        }]
    };
}]);