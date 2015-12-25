
Reselect.value('reselectChoicesOptions', {

});

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile', function(ChoiceParser, $compile){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.options.directive.tpl.html',
		require     : '^reselect',
		transclude  : true,
		compile: function(element, attrs){

			if(!attrs.options){
				throw new Error('"reselect-options" directive requires the [options] attribute.');
			}

			return function($scope, $element, $attrs, $Reselect, transcludeFn){
				var self = $scope.choices = {};

				
				self.CHOICE_TEMPLATE = null;

				transcludeFn(function(clone){
					self.CHOICE_TEMPLATE = angular.element('<li class="reselect-option reselect-option-choice" ng-click="choices.selectChoice($containerId)"></li>');
					self.CHOICE_TEMPLATE.append(clone);
				});

				self.parsedOptions = ChoiceParser.parse($attrs.options);
				self.choices       = self.parsedOptions.source($scope.$parent);

				var element    = $element[0];
				var $container = angular.element(element.querySelectorAll('.reselect-options-container'));
				var $list      = angular.element(element.querySelectorAll('.reselect-options-list'));

				self.choiceHeight = 32;
				self.listHeight = 300;
				var numLazyContainers = Math.ceil((self.listHeight)/ self.choiceHeight) + 2;

				self.selectChoice = function(containerId){
					var value = angular.copy(self.lazyContainers[containerId].scope.$eval($attrs.value));

					$Reselect.selectValue(value);
				};

				// Debug

				$container.css('height', self.listHeight + 'px');
				$list.css('height', (self.choiceHeight * self.choices.length) + 'px');

				self.lazyContainers = [];
				
				self._calculate = function(){

					for(var i = 0; i < numLazyContainers; i++){

						var $choice = self.CHOICE_TEMPLATE.clone();

						var lazyScope = $scope.$new();
							lazyScope.$choice = {};

						$compile($choice)(lazyScope);

						self.lazyContainers.push({
							containerId : i,
							element     : $choice,
							scope       : lazyScope
						});

						$list.append($choice);
					}
				};

				// Lazy Load

				var lastCheck = null;
				var lastScrollTop;
				var scrollDirection = null;

				self._calculateLazyRender = function(){
					var scrollTop = $container[0].scrollTop;

					if(scrollTop > lastScrollTop){
						scrollDirection = 'down';
					}else if(scrollTop < lastScrollTop){
						scrollDirection = 'up';
					}

					lastScrollTop = scrollTop;

					if(typeof lastCheck === 'number' && (scrollTop <= lastCheck + self.choiceHeight && scrollTop >= lastCheck - self.choiceHeight)){
						return;
					}

					// console.clear();

					// console.debug('lastCheck: ' + lastCheck);
					
					var activeContainers = [];
					var inactiveContainers = [];


					angular.forEach(self.lazyContainers, function(lazyContainer, index){
						// Check if element is visible
						var choiceTop = (lazyContainer.index) * self.choiceHeight || 0;
						// console.debug('Container #' + (index + 1) + ': ', choiceTop);

						if(angular.isUndefined(lazyContainer.index) || choiceTop < scrollTop - self.choiceHeight || choiceTop > scrollTop + self.listHeight + self.choiceHeight){
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

					var indexToRenderStart = Math.floor(scrollTop / self.choiceHeight);
						indexToRenderStart = indexToRenderStart < 0 ? 0 : indexToRenderStart;
					// var indexToRenderEnd = indexToRenderStart + numLazyContainers;
					var indexToRenderEnd = Math.ceil((scrollTop + self.listHeight) / self.choiceHeight);
						indexToRenderEnd = indexToRenderEnd >= self.choices.length ? self.choices.length : indexToRenderEnd;

					console.log('Index Start', indexToRenderStart);
					console.log('Index End', indexToRenderEnd);

					for(var i = indexToRenderStart; i < indexToRenderEnd; i++){
						if(indexInDisplay.indexOf(i) >= 0){
							continue;
						}else{
							var container = inactiveContainers.shift();

							if(container){
								container.element.addClass('active').removeClass('inactive');

								container.element.css('top', ((i) * self.choiceHeight) + 'px');

								container.index = i;

								container.scope.$containerId = container.containerId;
								container.scope.$index = i;
								angular.extend(container.scope.$choice, self.choices[i]);

								container.scope.$evalAsync();
							}else{
								// console.error('not enough');
							}							
						}
					}
					
					lastCheck = Math.floor(scrollTop/self.choiceHeight) * self.choiceHeight;
				};

				$container.on('scroll', function(){
					window.requestAnimationFrame(function(){
						self._calculateLazyRender();
					});
				});

				// Init
				
				window.up = self._calculateLazyRender;
				self._calculate();
				self._calculateLazyRender();
			};
		}
	};
}]);
