/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2016-03-29T23:58:53.471Z
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


Reselect.value('reselectChoicesOptions', {

});

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

		self.$container.css('height', (containerHeight || 32) + 'px');

		// Simulate the scrollbar with the estimated height for the number of choices
		self.$list.css('height', optionsHeight + 'px');
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

		return typeof self.lastCheck === 'number' &&
			(
				scrollTop <= self.lastCheck + (self.options.choiceHeight - (self.lastCheck % self.options.choiceHeight) ) && //
				scrollTop >= self.lastCheck - (self.lastCheck % self.options.choiceHeight) //
			);
	};

	LazyScroller.prototype._calculateLazyRender = function(force){
		var self = this;

		var scrollTop = self.$container[0].scrollTop;

		self.lastScrollTop = scrollTop;

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
			var choiceTop = (lazyContainer.index) * self.options.choiceHeight || 0;

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

					angular.extend(container.scope.$choice, self.choices[i]);
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

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile', 'LazyScroller', 'LazyContainer', function(ChoiceParser, $compile, LazyScroller, LazyContainer){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.options.directive.tpl.html',
		require     : ['reselectChoices', '^reselect'],
		transclude  : true,
		replace     : true,
		compile: function(element, attrs){

			if(!attrs.options){
				throw new Error('"reselect-options" directive requires the [options] attribute.');
			}

			return function($scope, $element, $attrs, $ctrls, transcludeFn){
				var $reselectChoices = $ctrls[0];
				var $Reselect = $ctrls[1];

				$Reselect.parsedOptions = ChoiceParser.parse($attrs.options);
				$Reselect.choices       = $Reselect.parsedOptions.source($scope.$parent) || [];

				/**
				 * Manipulating the transluded html template taht is used to display
				 * each choice in the options list
				 */

				transcludeFn(function(clone){
					$reselectChoices.CHOICE_TEMPLATE.append(clone);
				});

				$reselectChoices.LazyDropdown.initialize($reselectChoices.CHOICE_TEMPLATE);
				$reselectChoices.LazyDropdown.renderContainer();
			};
		},
		controllerAs: '$options',
		controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs){
			var self = this;

			self.element      = $element[0];
			self.$container   = angular.element(self.element.querySelectorAll('.reselect-options-container'));
			self.$list        = angular.element(self.element.querySelectorAll('.reselect-options-list'));

			self.choiceHeight = 36;
			self.listHeight   = 300;

			self.CHOICE_TEMPLATE = angular.element('<li class="reselect-option reselect-option-choice" ng-click="$options._selectChoice($containerId)"></li>');
			self.CHOICE_TEMPLATE.attr('ng-class', '{\'reselect-option-choice--highlight\' : $options.activeIndex === $index }');
			self.CHOICE_TEMPLATE.attr('ng-mouseenter', '$options.activeIndex = $index');
			self.CHOICE_TEMPLATE.attr('ng-mouseleave', '$options.activeIndex = null');

			var $Reselect = $element.controller('reselect');

			$scope.$watchCollection(function(){
				return $Reselect.parsedOptions.source($scope.$parent);
			}, function(newChoices){
				$Reselect.choices = newChoices || [];

				self.render($Reselect.choices);
			});

			/**
			 * Lazy Containers
			 *
			 * The goal is to used the minimum amount of DOM elements (containers)
			 * to display large amounts of data. Containers are shuffled and repositioned
			 * whenever the options list is scrolled.
			 */

			self.LazyDropdown = new LazyScroller($scope, {
 				container   : self.$container,
 				list        : self.$list,
 				choiceHeight: 36,
 				listHeight  : 300
 			});

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
				var value = angular.copy(self.LazyDropdown.lazyContainers[containerId].scope.$eval($attrs.value));

				$Reselect.selectValue(value);
			};

			/**
			 * Rendering
			 */

			self.$parent = $element.parent();

			self.render = function(choices){
				self.LazyDropdown.choices = choices;

				self.LazyDropdown.renderContainer();
				self.LazyDropdown._calculateLazyRender(true);
			};
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
$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container reselect\"><input type=\"hidden\" value=\"{{ngModel}}\"><div class=\"reselect-selection\" ng-class=\"{\'reselect-selection--active\' : $reselect.opened }\" ng-click=\"$reselect.toggleDropdown()\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-if=\"$reselect.value\" ng-bind=\"$reselect.rendered_selection\"></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-if=\"!$reselect.value\" ng-bind=\"$reselect.rendered_placeholder\"></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div><div class=\"reselect-dropdown\" ng-class=\"{\'reselect-dropdown--opened\' : $reselect.opened }\"></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-choices\"><div class=\"reselect-options-container\"><div class=\"reselect-option reselect-option-choice\" ng-show=\"!$reselect.choices.length\">No Options</div><ul class=\"reselect-options-list\"></ul></div></div>");}]);
}());