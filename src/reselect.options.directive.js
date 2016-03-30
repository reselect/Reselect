
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
