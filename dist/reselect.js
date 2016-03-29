/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2016-03-29T04:28:20.218Z
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
			ctrl.rendered_selection = null;

			ctrl.value = null;

			ctrl.selectValue = function(value){
				ctrl.value = value;
				ctrl.rendered_selection = ctrl.options.selectionTemplate(ctrl.value);
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


Reselect.value('reselectChoicesOptions', {

});

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

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile', 'LazyContainer', function(ChoiceParser, $compile, LazyContainer){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.options.directive.tpl.html',
		require     : '^reselect',
		transclude  : true,
		replace     : true,
		compile: function(element, attrs){

			if(!attrs.options){
				throw new Error('"reselect-options" directive requires the [options] attribute.');
			}

			return function($scope, $element, $attrs, $Reselect, transcludeFn){

				var self = $scope.$options = {};

				/**
				 * Manipulating the transluded html template taht is used to display
				 * each choice in the options list
				 */

				self.CHOICE_TEMPLATE = null;

				transcludeFn(function(clone){
					self.CHOICE_TEMPLATE = angular.element('<li class="reselect-option reselect-option-choice" ng-click="$options._selectChoice($containerId)"></li>');
					self.CHOICE_TEMPLATE.attr('ng-class', '{\'reselect-option-choice--highlight\' : $options.activeIndex === $index }');
					self.CHOICE_TEMPLATE.attr('ng-mouseenter', '$options.activeIndex = $index');
					self.CHOICE_TEMPLATE.attr('ng-mouseleave', '$options.activeIndex = null');
					self.CHOICE_TEMPLATE.append(clone);
				});

				self.element           = $element[0];
				self.$container        = angular.element(self.element.querySelectorAll('.reselect-options-container'));
				self.$list             = angular.element(self.element.querySelectorAll('.reselect-options-list'));

				self.choiceHeight      = 32;
				self.listHeight        = 300;

				/**
				 *
				 *
				 */

				$Reselect.parsedOptions = ChoiceParser.parse($attrs.options);
				$Reselect.choices       = $Reselect.parsedOptions.source($scope.$parent) || [];

				$scope.$watchCollection(function(){
					return $Reselect.parsedOptions.source($scope.$parent);
				}, function(newChoices){
					$Reselect.choices = newChoices || [];

					self.render();
                    self._calculateLazyRender(true);
				});

				/**
				 * Lazy Containers
				 *
				 * The goal is to used the minimum amount of DOM elements (containers)
				 * to display large amounts of data. Containers are shuffled and repositioned
				 * whenever the options list is scrolled.
				 */

				self.lazyContainers = [];

				self.numLazyContainers = Math.ceil((self.listHeight)/ self.choiceHeight) + 2;

				self._renderDropdown = function(){
					// Set the max height of the dropdown container
					var optionsHeight = $Reselect.choices.length * self.choiceHeight;
					var containerHeight = (optionsHeight > self.listHeight) ? self.listHeight : optionsHeight;

					self.$container.css('height', (containerHeight || 32) + 'px');

					// Simulate the scrollbar with the estimated height for the number of choices
					self.$list.css('height', optionsHeight + 'px');
				};

				self._initLazyContainers = function(){

					for(var i = 0; i < self.numLazyContainers; i++){

						var $choice = self.CHOICE_TEMPLATE.clone();

						var lazyScope = $scope.$new();
							lazyScope.$choice = {};

						$compile($choice)(lazyScope);

						self.lazyContainers.push(new LazyContainer({
							containerId : i,
							element     : $choice,
							scope       : lazyScope
						}));

						self.$list.append($choice);
					}
				};

				self._initLazyContainers();

				/**
				 * Lazy Load Rendering
				 *
				 *
				 */

				var lastCheck       = null; // Stores the scroll position from the last render calculation
				var scrollDirection = null;
				var lastScrollTop;

                self._shouldRender = function(scrollTop){
                    return typeof lastCheck === 'number' &&
                        (
                            scrollTop <= lastCheck + (self.choiceHeight - (lastCheck % self.choiceHeight) ) && //
                            scrollTop >= lastCheck - (lastCheck % self.choiceHeight) //
                        );
                };

				self._calculateLazyRender = function(force){
					var scrollTop = self.$container[0].scrollTop;

					if(scrollTop > lastScrollTop){
						scrollDirection = 'down';
					}else if(scrollTop < lastScrollTop){
						scrollDirection = 'up';
					}

					lastScrollTop = scrollTop;

					// A Check to throttle amounts of calculation by setting a threshold
					// The list is due to recalculation only if the differences of scrollTop and lastCheck is greater than a choiceHeight
                    if(force !== true){
                        if(self._shouldRender()){
                            return;
                        }
                    }

					var activeContainers   = [];
					var inactiveContainers = [];

					angular.forEach(self.lazyContainers, function(lazyContainer, index){
						var choiceTop = (lazyContainer.index) * self.choiceHeight || 0;

						// Check if the container is visible
						if(lazyContainer.index === null || choiceTop < scrollTop - self.choiceHeight || choiceTop > scrollTop + self.listHeight + self.choiceHeight){
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
					var indexToRenderStart = Math.floor(scrollTop / self.choiceHeight);
						indexToRenderStart = indexToRenderStart < 0 ? 0 : indexToRenderStart;

					var indexToRenderEnd = Math.ceil((scrollTop + self.listHeight) / self.choiceHeight);
						indexToRenderEnd = indexToRenderEnd >= $Reselect.choices.length ? $Reselect.choices.length : indexToRenderEnd;

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
								container.render(self.choiceHeight);

								angular.extend(container.scope, {
									$containerId : container.containerId,
									$index       : i
								});

								angular.extend(container.scope.$choice, $Reselect.choices[i]);
							}
						}
					}

					$scope.$evalAsync();

					lastCheck = Math.floor(scrollTop/self.choiceHeight) * self.choiceHeight;
				};

				self.$container.on('scroll', function(){
					window.requestAnimationFrame(function(){
						self._calculateLazyRender();
					});
				});

				self._calculateLazyRender();

				/**
				 * An index to simply track the highlighted or selected option
				 */

				self.activeIndex  = null;

				self._setActiveIndex = function(index){
					self.activeIndex = index;
				};

				/**
				 * Using the container id that is passed in, find the actual value by $eval the [value=""]
				 * from the directive with the scope of the lazy container
				 */

				self._selectChoice = function(containerId){
					var value = angular.copy(self.lazyContainers[containerId].scope.$eval($attrs.value));

					$Reselect.selectValue(value);
				};

				/**
				 * Rendering
				 */

				self.$parent = $element.parent();

				self.render = function(){
					self._renderDropdown();
				};

				// Init
				$scope.$on('reselect.options.show', function(){
					self.show();
				});

				$scope.$on('reselect.options.hide', function(){
					self.hide();
				});

				self.show = function(){
					self.$parent.append($element);
                    if(lastScrollTop){
                        self.$container[0].scrollTop = lastScrollTop;
                    }
				};

				self.hide = function(){
					$element.detach();
				};
			};
		}
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

	self.parse = function(expression) {


		var match;
		var isObjectCollection = /\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)/.test(expression);
		// If an array is used as collection

		// if (isObjectCollection){
		//00000000000000000000000000000111111111000000000000000222222222222220033333333333333333333330000444444444444444444000000000000000556666660000077777777777755000000000000000000000088888880000000
		match = expression.match(/^\s*(?:([\s\S]+?)\s+as\s+)?(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(([\w\.]+)?\s*(|\s*[\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

		// 1 Alias
		// 2 Item
		// 3 Key on (key,value)
		// 4 Value on (key,value)
		// 5 Collection expresion (only used when using an array collection)
		// 6 Object that will be converted to Array when using (key,value) syntax
		// 7 Filters that will be applied to #6 when using (key,value) syntax
		// 8 Track by

		// if (!match) {
		// 	throw uiSelectMinErr('iexp', "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
		// 		expression);
		// }
		// if (!match[6] && isObjectCollection) {
		// 	throw uiSelectMinErr('iexp', "Expected expression in form of '_item_ as (_key_, _item_) in _ObjCollection_ [ track by _id_]' but got '{0}'.",
		// 		expression);
		// }

		return {
			itemName: match[4] || match[2], // (lhs) Left-hand side,
			keyName: match[3], //for (key, value) syntax
			source: $parse(!match[3] ? match[5] : match[6]),
			sourceName: match[6],
			filters: match[7],
			trackByExp: match[8],
			modelMapper: $parse(match[1] || match[4] || match[2]),
			repeatExpression: function(grouped) {
				var expression = this.itemName + ' in ' + (grouped ? '$group.items' : '$select.items');
				if (this.trackByExp) {
					expression += ' track by ' + this.trackByExp;
				}
				return expression;
			}
		};

	};

}]);
angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/lazy-container.tpl.html","<div class=\"reselect-dropdown\"><div class=\"reselect-options-container\"><div class=\"reselect-option reselect-option-choice\" ng-show=\"!$reselect.choices.length\">No Options</div><ul class=\"reselect-options-list\"></ul></div></div>");
$templateCache.put("templates/reselect.choice.tpl.html","");
$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container reselect\" ng-click=\"$reselect.toggleDropdown()\"><input type=\"hidden\" value=\"{{ngModel}}\"><div class=\"reselect-selection\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-if=\"$reselect.value\" ng-bind=\"$reselect.rendered_selection\"></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-if=\"!$reselect.value\" ng-bind=\"$reselect.rendered_placeholder\"></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-dropdown\"><div class=\"reselect-options-container\"><div class=\"reselect-option reselect-option-choice\" ng-show=\"!$reselect.choices.length\">No Options</div><ul class=\"reselect-options-list\"></ul></div></div>");}]);
}());