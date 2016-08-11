/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2016-08-11T20:02:56.840Z
 * License: MIT
 */


(function () { 
'use strict';
/**
 * Reselect base
 */

var Reselect = angular.module('Reselect', ['reselect.templates']);

Reselect.service('ReselectDataAdapter', ['$q', function($q){

    var DataAdapter = function(){
        this.data = [];
    };

    DataAdapter.prototype.observe = function(){
        console.error('Not implemented');
        return;
    };

    DataAdapter.prototype.prepareGetData = function(){
        return;
    };

    DataAdapter.prototype.getData = function(search_term){
        var self = this;

        // This function requires the return of a deferred promise
        var defer = $q.defer();

        var choices;
        var search_options = {};

        choices = this.data;

        defer.resolve({
            data: choices
        });

        return defer.promise;
    };

    DataAdapter.prototype.updateData = function(newData){

        this.data = newData;

        return this.data;
    };

    DataAdapter.prototype.init = function(){
        this.observe(this.updateData.bind(this));
    };

    return DataAdapter;
}]);

Reselect.service('ReselectAjaxDataAdapter', ['$http', function($http){

    var DataAdapter = function(remoteOptions, parsedOptions){
        this.data = [];
        this.page = 1;
        this.pagination = {};

        this.parsedOptions = parsedOptions;

        this.options = angular.extend({
            params: function(params){
                return params;
            }
        }, remoteOptions);
    };

    DataAdapter.prototype.observe = function(){
        return;
    };

    DataAdapter.prototype.prepareGetData = function(){
        return;
    };

    DataAdapter.prototype.getData = function(search_term){
        var self = this;

        var state = {
            page       : this.page,
            search_term: search_term
        };

        var params = this.options.params(state, self.pagination);

        var endpoint;

        if(typeof this.options.endpoint === 'function'){
            endpoint = this.options.endpoint(state, self.pagination);
        }else{
            endpoint = this.options.endpoint;
        }

        return $http.get(endpoint, {
            params: params
        })
            .then(function(res){
                return self.parsedOptions.source({
                    '$remote': res.data
                });
            })
            .then(this.options.onData)
            .then(function(choices){
                if(choices.pagination){
                    self.pagination = choices.pagination;

                    if(choices.pagination.more){
                        self.page += 1;
                    }
                }else{
                    self.pagination = null;
                }

                return choices;
            });
    };

    DataAdapter.prototype.updateData = function(newData, push){
        if(push === true){
            this.data = this.data.concat(newData);
        }else{
            this.data = newData;
        }
        return this.data;
    };

    DataAdapter.prototype.init = function(){
    };

    return DataAdapter;
}]);

Reselect.provider('reselectConfig', [function(){

    angular.extend(this, {
        allowClear: false,
		placeholder: 'Please select an option'
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
					$transcludeElement = $element[0].querySelectorAll('.' + target);
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
		controller: ['$scope', '$element', '$attrs', '$parse', 'ReselectUtils', 'reselectConfig', '$timeout', '$window', '$document', 'KEYS', function($scope, $element, $attrs, $parse, ReselectUtils, reselectConfig, $timeout, $window, $document, KEYS) {

			var ctrl = this;
			var $ngModel = $element.controller('ngModel');

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
			};

			ctrl.selectValue = function(value, $choice) {

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

			// Override ng-model render function
			$ngModel.$render = function() {
				var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

				function mapModelValue(value) {
					var scp = {};
					scp[ctrl.parsedOptions.itemName] = value;

					return ctrl.parsedOptions.modelMapper(scp);
				}

				if (angular.isDefined(valueSelected)) {

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

							choiceMatch = mapModelValue(choices[i]);

							valueSelectedMatch = valueSelected;

							if (choiceMatch === valueSelectedMatch) {
								valueToBeSelected = choices[i];
								break;
							}
						}
					}
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
								ctrl.selectValue(mapModelValue(value), value);
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

				$scope.$safeApply(function() {
					ctrl.hideDropdown(true);
				});

				angular.element(document).off('click', hideDropdownOnClick);
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
				angular.element(window).on('resize', ctrl._positionDropdown);
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
				angular.element(window).off('resize', ctrl._positionDropdown);
			};

			/**
			 * Event Listeners
			 */

			ctrl.bindEventListeners = function() {
				$scope.$on('reselect.hide', function() {
					$scope.$safeApply(function() {
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
				angular.element(window).off('resize', ctrl._positionDropdown);
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
					$scope.$safeApply(function() {
						var element_offset = ctrl._calculateDropdownPosition(dropdownHeight);

						ctrl.$dropdown[0].style.width = element_offset.width + 'px';
						ctrl.$dropdown[0].style.top = ctrl.isDropdownAbove ? element_offset.top - dropdownHeight + 'px' : element_offset.bottom + 'px';
						ctrl.$dropdown[0].style.left = element_offset.left + 'px';
					});
				});
			};
			ctrl._appendDropdown = function() {
				return document.querySelector('body').appendChild(ctrl.$dropdown[0]);
			};
			ctrl._removeDropdown = function() {
				var $body = document.querySelector('body');
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
Reselect.service('LazyScroller', ['LazyContainer', '$compile', function(LazyContainer, $compile){

	var defaultOptions = {
		scopeName: '$choice'
	};

	var LazyScroller = function($scope, options){
		var self = this;

		self.options = angular.extend({}, defaultOptions, options);

		self.$scope = $scope;

		self.$container = self.options.container;
		self.$list = self.options.list;

		self.choices = [];

		self.lazyContainers = [];
		self.numLazyContainers = Math.ceil((self.options.listHeight)/ self.options.choiceHeight) + 2;

		self.lastCheck       = null;
		self.lastScrollTop   = null;
	};

	LazyScroller.prototype.renderContainer = function(){
		var self = this;

		// Set the max height of the dropdown container
		// var optionsHeight = $Reselect.choices.length * self.choiceHeight;
		var optionsHeight = self.choices.length * self.options.choiceHeight;
		var containerHeight = (optionsHeight > self.options.listHeight) ? self.options.listHeight : optionsHeight;

		self.$container.css('height', (containerHeight || self.options.choiceHeight) + 'px');

		// Simulate the scrollbar with the estimated height for the number of choices
		self.$list.css('height', optionsHeight + 'px');

        return {
            choiceHeight: optionsHeight,
            containerHeight: containerHeight
        };
	};

	LazyScroller.prototype.bindScroll = function(){
		var self = this;

		self.$container.on('scroll', function(){
			window.requestAnimationFrame(function(){
				self._calculateLazyRender();

                self.$scope.$apply();
			});
		});
	};

	LazyScroller.prototype._shouldRender = function(scrollTop){
		var self = this;

		return !(typeof self.lastCheck === 'number' &&
			(
				scrollTop <= self.lastCheck + (self.options.choiceHeight - (self.lastCheck % self.options.choiceHeight) ) && //
				scrollTop >= self.lastCheck - (self.lastCheck % self.options.choiceHeight) //
			));
	};

	LazyScroller.prototype._calculateLazyRender = function(force){
		var self = this;

		var scrollTop = self.$container[0].scrollTop;

		self.lastScrollTop = scrollTop;

		// A Check to throttle amounts of calculation by setting a threshold
		// The list is due to recalculation only if the differences of scrollTop and lastCheck is greater than a choiceHeight
		if(force !== true){
			if(!self._shouldRender(scrollTop)){
				return;
			}
		}

		var activeContainers   = [];
		var inactiveContainers = [];

		angular.forEach(self.lazyContainers, function(lazyContainer, index){
			var choiceTop = (lazyContainer.index) * self.options.choiceHeight || 0;

			if(force === true){
				lazyContainer.index = null;
			}

			// Check if the container is visible
			if(lazyContainer.index === null || choiceTop < scrollTop - self.options.choiceHeight || choiceTop > scrollTop + self.options.listHeight + self.options.choiceHeight){
				lazyContainer.element.addClass('inactive').removeClass('active');
				inactiveContainers.push(lazyContainer);
			}else{
				lazyContainer.element.addClass('active').removeClass('inactive');
				activeContainers.push(lazyContainer);
			}
		});

		var indexInDisplay = activeContainers.map(function(container){
			return container.index;
		});

		// Get the start and end index of all the choices that should be in the viewport at the current scroll position
		var indexToRenderStart = Math.floor(scrollTop / self.options.choiceHeight);
			indexToRenderStart = indexToRenderStart < 0 ? 0 : indexToRenderStart;

		var indexToRenderEnd = Math.ceil((scrollTop + self.options.listHeight) / self.options.choiceHeight);
			indexToRenderEnd = indexToRenderEnd >= self.choices.length ? self.choices.length : indexToRenderEnd;

		// Start rendering all missing indexs that is not in the viewport
		for(var i = indexToRenderStart; i < indexToRenderEnd; i++){
			if(indexInDisplay.indexOf(i) >= 0){
				continue;
			}else{
				// Get the next available lazy container
				var container = inactiveContainers.shift();

				if(container){
					container.element.addClass('active').removeClass('inactive');

					container.index = i;
					container.render(self.options.choiceHeight);

					angular.extend(container.scope, {
						$containerId : container.containerId,
						$index       : i,
                        cssClass     : self.choices[i] ? self.choices[i].class : ''
					});

                    if(self.choices[i] && self.choices[i].$sticky === true){
                        container.scope[self.options.scopeName] = self.choices[i].value;
                        container.scope.$onClick       = self.choices[i].onClick;
                        container.scope.$sticky        = self.choices[i].$sticky;
                        container.scope.$stickyContent = self.choices[i].$stickyContent;
                    }else{
                        container.scope[self.options.scopeName] = self.choices[i];
                        container.scope.$sticky        = false;
                    }
				}
			}
		}

        // self.lastCheck = Math.floor(scrollTop/self.options.choiceHeight) * self.options.choiceHeight || null;
        self.lastCheck = scrollTop || null;
	};

	LazyScroller.prototype.initialize = function(tpl){
		var self = this;

		for(var i = 0; i < self.numLazyContainers; i++){
			var $choice = tpl.clone();

			// HACK
			var lazyScope = self.$scope.$new();
				lazyScope.$options = self.$scope.$options;
				lazyScope[self.options.scopeName] = {};

			$compile($choice)(lazyScope);

			self.lazyContainers.push(new LazyContainer({
				containerId : i,
				element     : $choice,
				scope       : lazyScope
			}));

			self.$list.append($choice);
		}

		self.bindScroll();
	};

	return LazyScroller;

}]);

Reselect.service('LazyContainer', [function(){

	var LazyContainer = function(options){
		var self = this;

		self.containerId = null;
		self.element     = null;
		self.index       = null;
		self.scope       = null;

		angular.extend(self, options);
	};

	LazyContainer.prototype.render = function(containerHeight){
		var self = this;

		if(!self.element && self.index === null){
			return;
		}

		self.element.css('top', (self.index * containerHeight) + 'px');
	};

	return LazyContainer;

}]);

Reselect.directive('reselectNoChoice', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect-no-choice.directive.tpl.html')
    };
}]);

Reselect.directive('triggerAtBottom', ['$parse', 'ReselectUtils', function(
    $parse, ReselectUtils) {

    var height = function(elem) {
        elem = elem[0] || elem;
        if (isNaN(elem.offsetHeight)) {
            return elem.document.documentElement.clientHeight;
        } else {
            return elem.offsetHeight;
        }
    };

    return {
        restrict: 'A',
        link: function($scope, $element, $attrs) {

            var scrolling = false;

            var triggerFn = ReselectUtils.debounce(function() {
                $parse($attrs.triggerAtBottom)($scope);
            }, 150);

            function checkScrollbarPosition() {
                if (height($element) + $element[0].scrollTop === 0 && $element[0].scrollHeight === 0) {
                    return;
                }

                if (height($element) + $element[0].scrollTop >= $element[0].scrollHeight - 30) {
                    triggerFn();
                }
                scrolling = false;
            }

            $element.on('scroll', function() {
                if (!scrolling) {
                    var animationFrame = ReselectUtils.requstAnimFrame();
                    animationFrame(checkScrollbarPosition);
                    scrolling = true;
                }
            });

            checkScrollbarPosition();
        }
    };
}]);

Reselect.provider('reselectChoicesConfig', [function() {

    angular.extend(this, {
        noOptionsText: 'No Options',
        choiceHeight: 36,
        listHeight: 300
    });

    this.presets = {};

    this.$get = function() {
        return this;
    };
}]);

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile',
    '$templateCache',
    'reselectChoicesConfig', 'LazyScroller', 'LazyContainer', 'ReselectUtils',
    function(ChoiceParser, $compile, $templateCache, reselectChoicesConfig, LazyScroller,
        LazyContainer, ReselectUtils) {
        return {
            restrict: 'AE',
            template: $templateCache.get(
                'templates/reselect.options.directive.tpl.html'),
            require: ['reselectChoices', '?^reselect'],
            transclude: true,
            replace: true,
            compile: function(element, attrs) {

                if (!attrs.options) {
                    console.warn(
                        '[reselect-choices] directive requires the [options] attribute.'
                    );
                    return;
                }

                return function($scope, $element, $attrs, $ctrls,
                    transcludeFn) {
                    var $reselectChoices = $ctrls[0];
                    var $Reselect = $ctrls[1];

                    /**
                     * Manipulating the transluded html template taht is used to display
                     * each choice in the options list
                     */

                    transcludeFn(function(clone, scope) {
                        angular.element(
                            $reselectChoices.CHOICE_TEMPLATE[0].querySelectorAll('.reselect-option-choice-container')).append(clone);
                    });

                    $reselectChoices.LazyDropdown.initialize($reselectChoices.CHOICE_TEMPLATE);
                    $reselectChoices.LazyDropdown.renderContainer();
                };
            },
            controllerAs: '$options',
            controller: ['$scope', '$element', '$attrs', '$parse', '$http', '$timeout', 'ReselectDataAdapter', 'ReselectAjaxDataAdapter', 'KEYS',
                function($scope, $element, $attrs, $parse, $http, $timeout, ReselectDataAdapter, ReselectAjaxDataAdapter, KEYS) {

                    var $Reselect = $element.controller('reselect');

                    var self = this;

                    /**
                     * Options
                     */
                    self.options = angular.extend({}, reselectChoicesConfig, $parse($attrs.reselectChoices)($scope) || {});

                    self.options.noOptionsText = $attrs.noOptionsText || self.options.noOptionsText;

                    /**
                     * Variables
                     */
                    self.element = $element[0];
                    self.$container = angular.element(self.element.querySelectorAll('.reselect-options-container'));
                    self.$list = angular.element(self.element.querySelectorAll('.reselect-options-list'));
                    self.$search = angular.element(self.element.querySelectorAll('.reselect-search-input'));

                    self.choiceHeight = self.options.choiceHeight;
                    self.listHeight = self.options.listHeight;

                    self.remotePagination = {};

                    self.haveChoices = false;

                    self.CHOICE_TEMPLATE = angular.element('<li class="reselect-option reselect-option-choice" style="height: {{$options.choiceHeight}}px" ng-click="$options._selectChoice($index, $onClick)"></li>');
                    self.CHOICE_TEMPLATE.append('<div class="reselect-option-choice-sticky" ng-show="$sticky === true" ng-bind-html="$stickyContent"></div>');
                    self.CHOICE_TEMPLATE.append('<div class="reselect-option-choice-container" ng-show="!$sticky"></div>');
                    self.CHOICE_TEMPLATE.attr('ng-class', '[{\'reselect-option-choice--highlight\' : $options.activeIndex === $index, \'reselect-option-choice--selected\' : $options.selectedIndex === $index }, cssClass]');
                    self.CHOICE_TEMPLATE.attr('ng-mouseenter', '$options.activeIndex = $index');
                    self.CHOICE_TEMPLATE.attr('ng-mouseleave', '$options.activeIndex = null');

                    /**
                     * Single Choice - Sticky Choices
                     */

                    self.stickyChoices = [];

                    self.registerChoices = function($choices) {
                        angular.forEach($choices, function(
                            choice) {

                            choice = angular.element(
                                choice);

                            var sticky = {
                                bottom: angular.isDefined(choice.attr('sticky-bottom')),
                                class: choice.attr('class'),
                                $sticky: true,
                                $stickyContent: choice.html()
                            };

                            if (choice.attr('ng-click')) {
                                sticky.onClick = choice.attr('ng-click');
                            }

                            if (choice.attr('value')) {
                                sticky.value = $parse(choice.attr('value'))($scope.$parent);
                            }

                            self.stickyChoices.push(sticky);

                        });
                    };

                    /**
                     * Keyboard Support
                     */

                    self.keydown = function(evt) {
                        var key = evt.which;

                        if (!key || evt.shiftKey || evt.altKey) {
                            return;
                        }

                        switch (key) {
                            case KEYS.ENTER:
                                $scope.$emit('reselect.select');

                                evt.stopPropagation();
                                evt.preventDefault();
                                break;
                            case KEYS.SPACE:
                                $scope.$emit('reselect.select');

                                evt.stopPropagation();
                                evt.preventDefault();
                                break;
                            case KEYS.UP:
                                $scope.$emit(
                                    'reselect.previous');

                                evt.stopPropagation();
                                evt.preventDefault();
                                break;
                            case KEYS.DOWN:
                                $scope.$emit('reselect.next');

                                evt.stopPropagation();
                                evt.preventDefault();
                                break;
                            case KEYS.ESC:
                                $scope.$emit('reselect.hide');

                                evt.stopPropagation();
                                evt.preventDefault();
                                break;
                            case KEYS.TAB:
                                $scope.$emit('reselect.hide');

                                evt.stopPropagation();
                                evt.preventDefault();
                                break;

                            default:
                                break;
                        }
                    };

                    /**
                     * Choices Functionalities
                     */

                    $Reselect.parsedOptions = ChoiceParser.parse($attrs.options);

                    if ($attrs.remote) {
                        self.remoteOptions = $parse($attrs.remote)($scope.$parent);

                        $Reselect.isRemote = true;

                        $Reselect.DataAdapter = new ReselectAjaxDataAdapter(self.remoteOptions, $Reselect.parsedOptions);

                        $Reselect.DataAdapter.prepareGetData = function() {
                                $Reselect.DataAdapter.page = 1;
                                $Reselect.DataAdapter.pagination = {};
                                $Reselect.DataAdapter.updateData([]);
                                self.render();
                            };
                    } else {
                        $Reselect.DataAdapter = new ReselectDataAdapter();

                        $Reselect.DataAdapter.updateData($Reselect.parsedOptions.source($scope));

                        $Reselect.DataAdapter.observe = function(onChange) {
                            $scope.$watchCollection(function() {
                                return $Reselect.parsedOptions.source($scope);
                            }, function(newChoices) {
                                $Reselect.DataAdapter.updateData(newChoices);
                            });
                        };

                    }

                    $Reselect.DataAdapter.init();

                    self.getData = function(reset, loadingMore) {
                        if (reset === true) {
                            $Reselect.DataAdapter.prepareGetData();
                        }

                        self.is_loading = true;

                        return $Reselect.DataAdapter.getData($Reselect.search_term)
                            .then(function(choices) {
                                if (!$Reselect.search_term) {
                                    $Reselect.DataAdapter.updateData(choices.data,loadingMore);
                                    self.render();
                                } else {
                                    self.render(choices.data);
                                }

                                $scope.$emit('reselect.choices.render');
                            })
                            .finally(function() {
                                self.is_loading = false;
                            });
                    };

                    /**
                     * Load More function
                     *
                     * This function gets run when the user scrolls to the bottom
                     * of the dropdown OR the data returned to reselect does not
                     * fill up the full height of the dropdown.
                     *
                     * This function also checks if remote option's onData
                     * returns pagination.more === true
                     */

                    self.loadMore = function() {
                        if (!$Reselect.DataAdapter.pagination || !$Reselect.DataAdapter.pagination.more) {
                            return;
                        }
                        self.getData(false, true);
                    };

                    /**
                     * Search
                     */

                    self.search = ReselectUtils.debounce(function() {
                        self.getData(true, false);
                    }, 300, false, function() {
                        self.is_loading = true;
                    });

                    /**
                     * Lazy Containers
                     *
                     * The goal is to use the minimal amount of DOM elements (containers)
                     * to display large amounts of data. Containers are shuffled and repositioned
                     * whenever the options list is scrolled.
                     */

                    self.LazyDropdown = new LazyScroller($scope, {
                        scopeName: $Reselect.parsedOptions.itemName,
                        container: self.$container,
                        list: self.$list,
                        choiceHeight: self.choiceHeight,
                        listHeight: self.listHeight
                    });

                    /**
                     * An index to simply track the highlighted or selected option
                     */

                    self.activeIndex = 0;
                    self.selectedIndex = null;

                    /**
                     * Using the container id that is passed in, find the actual value by $eval the [value=""]
                     * from the directive with the scope of the lazy container
                     */

                    self._selectChoice = function(choiceIndex,
                        choiceOnClick) {

                        if (choiceOnClick) {
                            $parse(choiceOnClick)($scope.$parent);
                            $Reselect.hideDropdown();
                        } else {
                            self.selectedIndex = choiceIndex;

                            var selectedChoiceIndex = choiceIndex;

                            var selectedScope = {};

                            if (self.LazyDropdown.choices[selectedChoiceIndex] && self.LazyDropdown.choices[selectedChoiceIndex].$sticky === true && self.LazyDropdown.choices[selectedChoiceIndex].value) {
                                selectedScope[$Reselect.parsedOptions.itemName] = self.LazyDropdown.choices[selectedChoiceIndex].value;
                            } else {
                                selectedScope[$Reselect.parsedOptions.itemName] = self.LazyDropdown.choices[selectedChoiceIndex];
                            }

                            var value = angular.copy($Reselect.parsedOptions.modelMapper(selectedScope));

                            $Reselect.selectValue(value, selectedScope[$Reselect.parsedOptions.itemName]);
                        }
                    };

                    self.bindEventListeners = function() {

                        $scope.$on('reselect.select', function() {
                            self._selectChoice(self.activeIndex);
                        });

                        $scope.$on('reselect.next', function() {
                            var container_height = self.$container[0].offsetHeight;
                            var container_top = self.$container[0].scrollTop;

                            if (self.activeIndex !== null) {
                                if (self.activeIndex < self.LazyDropdown.choices.length - 1) {
                                    self.activeIndex++;
                                }
                            } else {
                                self.activeIndex = 0; // Start at the first element
                            }

                            if ((container_top + container_height) < ((self.activeIndex * self.choiceHeight ) + self.choiceHeight)) {
                                self.$container[0].scrollTop = ((self.activeIndex * self.choiceHeight ) - container_height ) + self.choiceHeight;
                            }
                        });

                        $scope.$on('reselect.previous',
                            function() {

                                var container_top = self.$container[0].scrollTop;

                                if (self.activeIndex) {
                                    self.activeIndex--;
                                } else {
                                    self.activeIndex = 0;
                                }

                                if (container_top > ((self.activeIndex * self.choiceHeight))) {
                                    self.$container[0].scrollTop = container_top - self.choiceHeight;
                                }
                            });

                        self.$search.on('keydown', function(evt) {
                            if (evt.which === KEYS.SPACE) {
                                evt.stopPropagation();
                            }
                        });
                    };

                    /**
                     * Rendering
                     *
                     * This function handles rendering the dropdown.
                     * Choices are passed along to LazyContainer which will
                     * handle the rendering of the data.
                     */

                    self.render = function(choices) {
                        self.LazyDropdown.choices = choices || $Reselect.DataAdapter.data || [];

                        self.LazyDropdown.choices = self.stickyChoices.filter(function(choice) {
                            return choice.bottom === false;
                        }).concat(self.LazyDropdown.choices.concat(self.stickyChoices.filter(function(choice) {
                            return choice.bottom === true;
                        })));

                        if (self.LazyDropdown.choices && self.LazyDropdown.choices.length >= 0) {
                            // Check if choices is empty
                            self.haveChoices = !!self.LazyDropdown.choices.length;

                            // Render the dropdown depending on the numbers of choices
                            var dimensions = self.LazyDropdown.renderContainer();

                            /**
                             * LazyContainer's render function
                             * @param {Boolean} Force - force the LazyContainer to re-render
                             */
                            self.LazyDropdown._calculateLazyRender(
                                true);

                            /**
                             * If the result's first page does not fill up
                             * the height of the dropdown, automatically fetch
                             * the next page
                             */

                            if (self.LazyDropdown.choices && self.LazyDropdown.choices.length && (dimensions.containerHeight >= dimensions.choiceHeight)) {
                                self.loadMore();
                            }
                        } else {
                            self.haveChoices = false;
                        }
                    };

                    self.bindEventListeners();
                }
            ]
        };
    }
]);
Reselect.directive('reselectPlaceholder', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect.placeholder.tpl.html')
    };
}]);

Reselect.directive('reselectSelection', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect.selection.tpl.html'),
        scope: {},
        link: function($scope, $element, $attrs, ctrls, transclude){
            transclude($scope, function(clone){
                $element.append(clone);
            });
        },
        controller: ['$scope', function($scope){
            $scope.$selection = null;
            $scope.$choice = null;

            $scope.$on('reselect.renderselection', function(event, selection){
                angular.extend($scope, selection);
            });
        }]
    };
}]);

/**
 * Service to parse choice "options" attribute
 *
 * Services credited to angular-ui team
 * https://github.com/angular-ui/ui-select/blob/master/src/uisRepeatParserService.js
 *
 */

Reselect.service('ChoiceParser', ['$parse', function($parse) {

	var self = this;

	/**
	 * Example:
	 * expression = "address in addresses | filter: {street: $select.search} track by $index"
	 * itemName = "address",
	 * source = "addresses | filter: {street: $select.search}",
	 * trackByExp = "$index",
	 */
	self.parse = function(expression) {


		var match;
		//var isObjectCollection = /\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)/.test(expression);
		// If an array is used as collection

		// if (isObjectCollection){
		// 000000000000000000000000000000111111111000000000000000222222222222220033333333333333333333330000444444444444444444000000000000000055555555555000000000000000000000066666666600000000
		match = expression.match(
			/^\s*(?:([\s\S]+?)\s+as\s+)?(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(\s*[\s\S]+?)?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/
		);

		// 1 Alias
		// 2 Item
		// 3 Key on (key,value)
		// 4 Value on (key,value)
		// 5 Source expression (including filters)
		// 6 Track by

		if (!match) {
			throw uiSelectMinErr('iexp',
				"Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
				expression);
		}

		var source = match[5],
			filters = '';

		// When using (key,value) ui-select requires filters to be extracted, since the object
		// is converted to an array for $select.items
		// (in which case the filters need to be reapplied)
		if (match[3]) {
			// Remove any enclosing parenthesis
			source = match[5].replace(/(^\()|(\)$)/g, '');
			// match all after | but not after ||
			var filterMatch = match[5].match(
				/^\s*(?:[\s\S]+?)(?:[^\|]|\|\|)+([\s\S]*)\s*$/);
			if (filterMatch && filterMatch[1].trim()) {
				filters = filterMatch[1];
				source = source.replace(filters, '');
			}
		}

		return {
			itemName: match[4] || match[2], // (lhs) Left-hand side,
			keyName: match[3], //for (key, value) syntax
			source: $parse(source),
			sourceItem: source,
			filters: filters,
			trackByExp: match[6],
			modelMapper: $parse(match[1] || match[4] || match[2]),
			repeatExpression: function(grouped) {
				var expression = this.itemName + ' in ' + (grouped ? '$group.items' :
					'$select.items');
				if (this.trackByExp) {
					expression += ' track by ' + this.trackByExp;
				}
				return expression;
			}
		};

	};

}]);

Reselect.directive('reselectSticky', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect.sticky.tpl.html'),
        link: function($scope, $element){
            $element.on('click', function(){
                $scope.$apply(function(){
                    $scope.$reselect.hideDropdown();
                });
            });
        }
    };
}]);

Reselect.run(['$rootScope', '$http', function ($rootScope, $http) {
    $rootScope.$safeApply = function (fn) {
        if(!this.$root) {
            return fn();
        }
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };
}]);

Reselect.factory('ReselectUtils', ['$timeout', function($timeout){
    var ReselectUtils = {
        debounce: function(func, wait, immediate, immediateFn) {
    		var timeout;
    		return function() {
    			var context = this, args = arguments;
    			var later = function() {
    				timeout = null;
    				if (!immediate) func.apply(context, args);
    			};
    			var callNow = immediate && !timeout;
    			clearTimeout(timeout);
    			timeout = setTimeout(later, wait);
    			if (callNow) func.apply(context, args);
                if (!timeout, immediateFn) immediateFn.apply(context, args);
    		};
    	},
        requstAnimFrame: function() {
            return  (window.requestAnimationFrame   ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                $timeout);
        }
    };

    return ReselectUtils;
}]);

Reselect.filter('rshighlight', ['$sce', function($sce){
    return function(target, str){
        var result, matches, re;
        var match_class = "reselect-text-match";

		re = new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
		if (!angular.isDefined(target) || target === null) {
			return;
		}

		if (!str) {
			return target;
		}

		if (!target.match || !target.replace) {
			target = target.toString();
		}
		matches = target.match(re);
		if (matches) {
			result = target.replace(re, '<span class="' + match_class + '">' + matches[0] + '</span>');
		} else {
			result = target;
		}

		return $sce.trustAsHtml(result);
    };
}]);

Reselect.directive('focusOn', ['$timeout', function($timeout){
    return {
        restrict: 'A',
        link: function($scope, $elem, $attrs){
            $scope.$on($attrs.focusOn, function(){
                $timeout(function(){
                    $elem[0].focus();
                });
            });
        }
    };
}]);

Reselect.directive('blurOn', ['$timeout', function($timeout){
    return {
        restrict: 'A',
        link: function($scope, $elem, $attrs){
            $scope.$on($attrs.blurOn, function(){
                $timeout(function(){
                    $elem[0].blur();
                });
            });
        }
    };
}]);

angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/lazy-container.tpl.html","<div class=\"reselect-dropdown\"><div class=\"reselect-options-container\"><div class=\"reselect-option reselect-option-choice\" ng-show=\"!$reselect.choices.length\">No Options</div><ul class=\"reselect-options-list\"></ul></div></div>");
$templateCache.put("templates/reselect-no-choice.directive.tpl.html","<div class=\"reselect-no-choice\" ng-transclude=\"\"></div>");
$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container reselect\" tabindex=\"0\" focus-on=\"reselect.input.focus\" blur-on=\"reselect.input.blur\" ng-keydown=\"$reselect.handleKeyDown($event)\"><input type=\"hidden\" value=\"{{ngModel}}\" ng-disabled=\"$reselect.isDisabled\"><div class=\"reselect-selection-container\" ng-class=\"{\'reselect-selection--active\' : $reselect.opened }\" ng-click=\"$reselect.toggleDropdown($event)\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-show=\"$reselect.isValidValue\"><div class=\"reselect-selection\" reselect-selection=\"\"><span ng-bind=\"$selection\"></span></div></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-show=\"!$reselect.isValidValue\"><div class=\"reselect-placeholder\" reselect-placeholder=\"\"><span ng-bind=\"$reselect.options.placeholder\"></span></div></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div><a href=\"javascript:;\" class=\"reselect-clear-button\" ng-if=\"$reselect.options.allowClear && $reselect.isValidValue\" ng-click=\"$reselect.clearValue()\">&times;</a><div class=\"reselect-dropdown\" ng-class=\"{\'reselect-dropdown--opened\' : $reselect.opened, \'reselect-dropdown--above\': $reselect.isDropdownAbove, \'reselect-dropdown--below\': !$reselect.isDropdownAbove }\"></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-choices\" ng-keydown=\"$options.keydown($event)\"><div class=\"reselect-search-container\"><input class=\"reselect-search-input\" tabindex=\"-1\" type=\"text\" focus-on=\"reselect.search.focus\" placeholder=\"Type to search...\" ng-model=\"$reselect.search_term\" ng-change=\"$options.search()\"></div><div class=\"reselect-option-loader\" ng-show=\"$options.is_loading\"></div><div class=\"reselect-options-container\" ng-class=\"{\'reselect-options-container--autoheight\': !$options.LazyDropdown.choices.length && !$options.is_loading }\" trigger-at-bottom=\"$options.loadMore()\"><ul class=\"reselect-options-list\" ng-show=\"$options.LazyDropdown.choices.length\"></ul><div class=\"reselect-static-option reselect-empty-container\" ng-show=\"!$options.haveChoices && !$options.is_loading\"><div class=\"reselect-no-choice\" reselect-no-choice=\"\"><div class=\"reselect-option reselect-option--static reselect-option-choice\">{{$options.options.noOptionsText}}</div></div></div><div class=\"reselect-option reselect-static-option reselect-option-loading\" ng-show=\"$options.is_loading\">Loading More...</div></div><div class=\"reselect-sticky-container\"></div></div>");
$templateCache.put("templates/reselect.placeholder.tpl.html","<div class=\"reselect-placeholder\" ng-transclude=\"\"></div>");
$templateCache.put("templates/reselect.selection.tpl.html","<div class=\"reselect-selection\"></div>");
$templateCache.put("templates/reselect.sticky.tpl.html","<div class=\"reselect-sticky reselect-sticky-choice\" ng-transclude=\"\"></div>");}]);
/**
 * Filter credited to https://github.com/Rokt33r/
 * https://gist.github.com/Rokt33r/569f518eddcce5e01a4a
 */

Reselect.filter('rsPropsFilter', function() {
    return function(items, props) {
        var out = [];
        if (angular.isArray(items)) {
            items.forEach(function(item) {
                var itemMatches = false;

                var keys = Object.keys(props);
                for (var i = 0; i < keys.length; i++) {
                    var prop = keys[i];
                    if(angular.isUndefined(props[prop])){
                        itemMatches = true;
                        break;
                    }
                    var text = props[prop].toLowerCase();
                    if (item[prop].toString().toLowerCase()
                        .indexOf(text) !== -1) {
                        itemMatches = true;
                        break;
                    }
                }

                if (itemMatches) {
                    out.push(item);
                }
            });
        } else {
            // Let the output be the input untouched
            out = items;
        }

        return out;
    };
});

/**
 * Common shared functionalities
 */

 Reselect.constant('KEYS', {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    CTRL: 17,
    ESC: 27,
    SPACE: 32,
    PAGEUP: 33,
    PAGEDOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    DELETE: 46
 });

}).apply(this);