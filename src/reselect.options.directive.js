
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
				var self = $scope.choices;

				var choiceTpl;
				transcludeFn(function(clone){
					choiceTpl = angular.element('<div></div>').append(clone).html();
				});

				self.ReselectCtrl = $Reselect;

				self.parsedOptions = ChoiceParser.parse($attrs.options);
				self.choices       = self.parsedOptions.source($scope.$parent);

				var element    = $element[0];
				var $container = angular.element(element.querySelectorAll('.reselect-options-container'));
				var $list      = angular.element(element.querySelectorAll('.reselect-options-list'));

				self.choiceHeight = 32;
				self.listHeight = 300;
				var numLazyContainers = Math.ceil((self.listHeight + self.choiceHeight)/ self.choiceHeight);

				self.CHOICE_TEMPLATE = '<li class="reselect-option reselect-option-choice"></li>';

				// Debug

				$container.css('height', self.listHeight + 'px');
				$list.css('height', (self.choiceHeight * self.choices.length) + 'px');

				self.lazyContainers = [];
				
				self._calculate = function(){

					for(var i = 0; i < numLazyContainers; i++){

						var $choice = angular.element(self.CHOICE_TEMPLATE);
							$choice.append(choiceTpl);

						var lazyScope = $scope.$new();
							// lazyScope.$choice = {
							// 	$index : i,
							// 	text   : 'Option'
							// };

						$compile($choice)(lazyScope);

						self.lazyContainers.push({
							element : $choice,
							scope   : lazyScope
						});

						$list.append($choice);
					}
				};

				// Lazy Load

				var lastCheck = null;

				self._calculateLazyRender = function(){
					var scrollTop = $container[0].scrollTop;

					if(typeof lastCheck === 'number' && (scrollTop <= lastCheck + self.choiceHeight && scrollTop >= lastCheck - self.choiceHeight)){
						return;
					}

					console.clear();
					
					console.log('render');

					var activeContainers = [];
					var inactiveContainers = [];


					angular.forEach(self.lazyContainers, function(lazyContainer, index){
						// Check if element is visible
						var choiceTop = (lazyContainer.index + 1) * self.choiceHeight || 0;
						console.debug('Container #' + (index + 1) + ': ', choiceTop);

						if(angular.isUndefined(lazyContainer.index) || (choiceTop < scrollTop - self.choiceHeight || choiceTop > scrollTop + self.listHeight + self.choiceHeight)){
							inactiveContainers.push(lazyContainer);
						}else{
							activeContainers.push(lazyContainer);
						}
					});

					var indexInDisplay = activeContainers.map(function(container){
						return container.index;
					});

					var indexToRenderStart = Math.abs(Math.floor((scrollTop - self.choiceHeight) / self.choiceHeight)) - 1;
					var indexToRenderEnd = (indexToRenderStart <= 0 ? 0 : indexToRenderStart) + numLazyContainers;

					for(var i = indexToRenderStart; i < indexToRenderEnd; i++){
						if(indexInDisplay.indexOf(i) >= 0){
							continue;
						}else{
							var container = inactiveContainers.shift();

							if(container){
								container.element.css('top', ((i) * self.choiceHeight) + 'px');

								container.index = i;

								container.scope.$choice = {
									text : 'Option ' + i
								};

								container.scope.$evalAsync();
							}							
						}
					}
					
					lastCheck = scrollTop;
				};

				$container.on('scroll', function(){
					window.requestAnimationFrame(function(){
						self._calculateLazyRender();
					});
				});

				// Init
				
				self._calculate();
				self._calculateLazyRender();
			};
		},
		controller  : ['$scope', '$timeout', function($scope, $timeout, $attrs){
			var self = $scope.choices = this;
		}]
	};
}]);
