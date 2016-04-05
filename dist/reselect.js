/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2016-04-05T06:58:44.236Z
 * License: MIT
 */


(function () { 
'use strict';
/**
 * Common shared functionalities
 */
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

    DataAdapter.prototype.getData = function(){
        var defer = $q.defer();

        defer.resolve({
            data: this.data
        });

        return defer.promise;
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
        this.observe(this.updateData.bind(this));
    };

    return DataAdapter;
}]);

Reselect.service('ReselectAjaxDataAdapter', ['$http', function($http){

    var DataAdapter = function(remoteOptions){
        this.data = [];
        this.page = 1;
        this.pagination = {};

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
                return res.data;
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

    DataAdapter.prototype.updateData = function(existingData, newData, push){
        if(push === true){
            existingData = existingData.concat(newData);
        }else{
            existingData = newData;
        }

        return existingData;
    };

    DataAdapter.prototype.init = function(){
    };

    return DataAdapter;
}]);


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

/*
TODO:
	- Static choice search
	- Choice support native filters
	- Multi level choices
	- Dropdown positioning
*/
Reselect.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	},
	selectionTemplate: angular.element('<div><span ng-bind="$selection"></span></div>')
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
		compile: function($element, $attrs, transcludeFn){

			return function($scope, $element, $attrs, ctrls){
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
			};

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

			ctrl.renderSelection = function(state){
				ctrl.selection_scope.$selection = state;
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

			$ngModel.$render = function(){
				var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

				if(!ctrl.options.allowInvalid && angular.isDefined(valueSelected)){
					var choices = ctrl.transcludeCtrls.$ReselectChoice.choices;
					var trackBy = ctrl.transcludeCtrls.$ReselectChoice.parsedOptions.trackByExp;

					var choiceMatch, valueSelectedMatch;

					for(var i = 0; i < choices.length; i++){

						if(trackBy){
							choiceMatch = choices[i][trackBy];
							valueSelectedMatch = valueSelected[trackBy];
						}else{
							choiceMatch = choices[i];
							valueSelectedMatch = valueSelected;
						}

						if(choiceMatch === valueSelectedMatch){
							valueToBeSelected = choices[i][trackBy];
							continue;
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

			ctrl.showDropdown = function(){
				ctrl.opened = true;

				ctrl.transcludeCtrls.$ReselectChoice.getData(true);
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

Reselect.service('LazyScroller', ['LazyContainer', '$compile', function(LazyContainer, $compile){

	var LazyScroller = function($scope, options){
		var self = this;

		self.options = angular.extend({}, options);

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

		self.$container.css('height', (containerHeight || self.options.choiceHeight) + 2 + 'px');

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

		var scrollTop = (force === true) ? self.lastScrollTop : self.$container[0].scrollTop;

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
						$index       : i
					});

					container.scope.$choice = self.choices[i];
				}
			}
		}

		self.$scope.$evalAsync();

		self.lastCheck = Math.floor(scrollTop/self.options.choiceHeight) * self.options.choiceHeight;
	};

	LazyScroller.prototype.initialize = function(tpl){
		var self = this;

		for(var i = 0; i < self.numLazyContainers; i++){
			var $choice = tpl.clone();

			var lazyScope = self.$scope.$new();
				lazyScope.$choice = {};

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

angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/lazy-container.tpl.html","<div class=\"reselect-dropdown\"><div class=\"reselect-options-container\"><div class=\"reselect-option reselect-option-choice\" ng-show=\"!$reselect.choices.length\">No Options</div><ul class=\"reselect-options-list\"></ul></div></div>");
$templateCache.put("templates/reselect.choice.tpl.html","");
$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container reselect\"><input type=\"hidden\" value=\"{{ngModel}}\"><div class=\"reselect-selection\" ng-class=\"{\'reselect-selection--active\' : $reselect.opened }\" ng-click=\"$reselect.toggleDropdown()\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-show=\"$reselect.value\"></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-show=\"!$reselect.value\" ng-bind=\"$reselect.rendered_placeholder\"></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div><div class=\"reselect-dropdown\" ng-class=\"{\'reselect-dropdown--opened\' : $reselect.opened }\"></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-choices\"><div class=\"reselect-search-container\"><input class=\"reselect-search-input\" type=\"text\" ng-model=\"$options.search_term\" ng-change=\"$options.search()\"></div><div class=\"reselect-options-container\" trigger-at-bottom=\"$options.loadMore()\"><ul class=\"reselect-options-list\" ng-show=\"$options.choices.length\"></ul><div class=\"reselect-option reselect-option--static reselect-option-choice\" ng-show=\"!$options.choices.length && !$options.is_loading\">No Options</div><div class=\"reselect-option reselect-option--static reselect-option-loading\" ng-show=\"$options.is_loading\">Loading More</div></div></div>");}]);
Reselect.value('reselectChoicesOptions', {

});

Reselect.directive('triggerAtBottom', ['$parse', 'ReselectUtils', function($parse, ReselectUtils) {

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

			var triggerFn = ReselectUtils.debounce(function(){
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
					if (!window.requestAnimationFrame) {
						setTimeout(checkScrollbarPosition, 300);
					} else {
						window.requestAnimationFrame(checkScrollbarPosition);
					}
					scrolling = true;
				}
			});

			checkScrollbarPosition();
		}
	};
}]);

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile',
	'LazyScroller', 'LazyContainer', 'ReselectUtils',
	function(ChoiceParser, $compile, LazyScroller, LazyContainer, ReselectUtils) {
		return {
			restrict: 'AE',
			templateUrl: 'templates/reselect.options.directive.tpl.html',
			require: ['reselectChoices', '?^reselect'],
			transclude: true,
			replace: true,
			compile: function(element, attrs) {

				if (!attrs.options && !attrs.remote) {
					throw new Error('"reselect-options" directive requires the [options] or [remote] attribute.');
				}

				return function($scope, $element, $attrs, $ctrls, transcludeFn) {
					var $reselectChoices = $ctrls[0];
					var $Reselect = $ctrls[1];

					/**
					 * Manipulating the transluded html template taht is used to display
					 * each choice in the options list
					 */

					transcludeFn(function(clone) {
						$reselectChoices.CHOICE_TEMPLATE.append(clone);
					});

					$reselectChoices.LazyDropdown.initialize($reselectChoices.CHOICE_TEMPLATE);
					$reselectChoices.LazyDropdown.renderContainer();
				};
			},
			controllerAs: '$options',
			controller: ['$scope', '$element', '$attrs', '$parse', '$http',
				'ReselectDataAdapter', 'ReselectAjaxDataAdapter',
				function($scope, $element, $attrs, $parse, $http, ReselectDataAdapter,
					ReselectAjaxDataAdapter) {
					var self = this;

					self.element = $element[0];
					self.$container = angular.element(self.element.querySelectorAll(
						'.reselect-options-container'));
					self.$list = angular.element(self.element.querySelectorAll(
						'.reselect-options-list'));

					self.choiceHeight = 36;
					self.listHeight = 300;

					self.search_term = '';
					self.choices = [];
					self.remotePagination = {};

					self.CHOICE_TEMPLATE = angular.element(
						'<li class="reselect-option reselect-option-choice" ng-click="$options._selectChoice($containerId)"></li>'
					);
					self.CHOICE_TEMPLATE.attr('ng-class',
						'{\'reselect-option-choice--highlight\' : $options.activeIndex === $index }'
					);
					self.CHOICE_TEMPLATE.attr('ng-mouseenter',
						'$options.activeIndex = $index');
					self.CHOICE_TEMPLATE.attr('ng-mouseleave',
						'$options.activeIndex = null');

					var $Reselect = $element.controller('reselect');

					/**
					 * Choices Functionalities
					 */

					self.DataAdapter = null;

					if ($attrs.options) {
						self.parsedOptions = ChoiceParser.parse($attrs.options);

						self.DataAdapter = new ReselectDataAdapter();

						self.choices = self.DataAdapter.updateData(self.parsedOptions.source($scope.$parent));

						self.DataAdapter.observe = function(onChange) {
							$scope.$watchCollection(function() {
								return self.parsedOptions.source($scope.$parent);
							}, function(newChoices) {
								self.choices = self.DataAdapter.updateData(newChoices);
							});
						};

					} else if ($attrs.remote) {
						self.parsedOptions = $parse($attrs.remote)($scope.$parent);

						self.DataAdapter = new ReselectAjaxDataAdapter(self.parsedOptions);

						self.DataAdapter.prepareGetData = function(){
							self.DataAdapter.page = 1;
							self.DataAdapter.pagination = {};
							self.choices = self.DataAdapter.updateData(self.choices, []);
							self.render();
						};
					}

					self.DataAdapter.init();

					self.getData = function(reset, loadingMore) {
						if(reset === true){
							self.DataAdapter.prepareGetData();
						}

						self.is_loading = true;

						self.DataAdapter.getData(self.search_term)
							.then(function(choices) {
								self.choices = self.DataAdapter.updateData(self.choices, choices.data, loadingMore);
								self.render();
							})
							.finally(function(){
								self.is_loading = false;
							});
					};

					self.loadMore = function() {
						self.getData(false, true);
					};

					self.search = ReselectUtils.debounce(function(){
						self.getData(true, false);
					}, 300, false, function(){
						self.is_loading = true;
					});

					/**
					 * Lazy Containers
					 *
					 * The goal is to used the minimum amount of DOM elements (containers)
					 * to display large amounts of data. Containers are shuffled and repositioned
					 * whenever the options list is scrolled.
					 */

					self.LazyDropdown = new LazyScroller($scope, {
						container: self.$container,
						list: self.$list,
						choiceHeight: 36,
						listHeight: 300
					});

					/**
					 * An index to simply track the highlighted or selected option
					 */

					self.activeIndex = null;

					self._setActiveIndex = function(index) {
						self.activeIndex = index;
					};

					/**
					 * Using the container id that is passed in, find the actual value by $eval the [value=""]
					 * from the directive with the scope of the lazy container
					 */

					self._selectChoice = function(containerId) {
						var value = angular.copy(self.LazyDropdown.lazyContainers[containerId]
							.scope.$eval($attrs.value));

						$Reselect.selectValue(value);
					};

					/**
					 * Rendering
					 */

					self.$parent = $element.parent();

					self.render = function(choices) {
						self.LazyDropdown.choices = choices || self.choices;

						var dimensions = self.LazyDropdown.renderContainer();
						self.LazyDropdown._calculateLazyRender(true);

						if(self.LazyDropdown.choices && self.LazyDropdown.choices.length && (dimensions.containerHeight >= dimensions.choiceHeight)){
							self.loadMore();
						}
					};
				}
			]
		};
	}
]);

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


Reselect.factory('ReselectUtils', function(){
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
    	}
    };

    return ReselectUtils;
});

}());