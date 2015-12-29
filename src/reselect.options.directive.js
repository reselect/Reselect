
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
				$Reselect.choices       = $Reselect.parsedOptions.source($scope.$parent);

				/**
				 * Lazy Containers
				 * 
				 * The goal is to used the minimum amount of DOM elements (containers)
				 * to display large amounts of data. Containers are shuffled and repositioned
				 * whenever the options list is scrolled.
				 */
				
				self.lazyContainers = [];

				self.numLazyContainers = Math.ceil((self.listHeight)/ self.choiceHeight) + 2;

				// Set the max height of the dropdown container
				self.$container.css('height', self.listHeight + 'px');

				// Simulate the scrollbar with the estimated height for the number of choices
				self.$list.css('height', (self.choiceHeight * $Reselect.choices.length) + 'px');

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

				self._calculateLazyRender = function(){
					var scrollTop = self.$container[0].scrollTop;

					if(scrollTop > lastScrollTop){
						scrollDirection = 'down';
					}else if(scrollTop < lastScrollTop){
						scrollDirection = 'up';
					}

					lastScrollTop = scrollTop;

					// A Check to throttle amounts of calculation by setting a threshold
					// The list is due to recalculation only if the differences of scrollTop and lastCheck is greater than a choiceHeight
					if(typeof lastCheck === 'number' && (scrollTop <= lastCheck + self.choiceHeight && scrollTop >= lastCheck - self.choiceHeight)){
						return;
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

				

				// Init				

				var $parent = $element.parent();

				// $element.detach();

				$scope.$on('reselect.options.show', function(){
					self.show();
				});

				$scope.$on('reselect.options.hide', function(){
					self.hide();
				});

				self.show = function(){
					$parent.append($element);
				};

				self.hide = function(){
					$element.detach();
				};
			};
		}
	};
}]);
