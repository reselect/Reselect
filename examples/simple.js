(function(){
	'use strict';

	angular.module('simple', ['Reselect'])

	.controller('SimpleCtrl', ['$scope', '$timeout', function($scope, $timeout){

		var self = $scope.simple = this;

		var num = 0;

		self.choices = Array.apply(null, Array(100)).map(function(){
			return num++;
		});

		self.choices1000 = Array.apply(null, Array(1000)).map(function(){
			return {
				text: 'Option ' + (num++)
			};
		});

		self.options1 = {
			resolveInvalid: function(value, done){
				if(value){
					done({
						text: 'HARHARHAR'
					});
				}else{
					done(null);
				}
			}
		}

		$timeout(function(){
			self.value = {
				text: 'Option 20xx'
			}
		}, 2000);

		$timeout(function(){
			self.value2 = {
				text: 'Option xx20'
			}
		}, 2000);

		$timeout(function(){
			self.value3 = undefined;
		}, 2000);

		self.remoteOptions = {
			endpoint: function(params, pagination){
				if(params.search_term){
					return 'https://www.reddit.com/r/webdev/search/.json';
				}else{
					return 'https://www.reddit.com/r/webdev/.json';
				}

			},
			params: function(params, pagination){
				var query = {
					after: pagination.more,
					limit: 10,
					q    : params.search_term,
					t    : 'all',
					sort : 'relevance'
				};

				return query;
			},
			onData: function(data){
				return {
					data: data.data.children,
					pagination: {
						more: data.data.after
					}
				};
			}
		};

	}]);

})();
