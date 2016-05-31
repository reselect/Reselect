// 'use strict';
//
// describe('Reselect Selection Test', function(){
//
// 	var $scope, $rootScope, $compile;
//
// 	var template = '<reselect \
// 	                    ng-model="ctrl.value"> \
// 	                    <reselect-choices \
// 	                        options="option in ctrl.choices" \
// 	                        value="$choice"> \
// 	                            <span ng-bind="$choice"></span>\
// 	                    </reselect-choices> \
// 	                </reselect>';
//
// 	beforeEach(module('Reselect'));
//
// 	beforeEach(inject(function(_$rootScope_, _$compile_){
// 		$rootScope  = _$rootScope_;
// 		$scope      = $rootScope.$new();
// 		$compile    = _$compile_;
//
// 		$scope.ctrl = {};
// 	}));
//
// 	describe('Default selection (no directive)', function(){
//
// 		var $reselect;
//
//         var random = 'Choice' + Math.floor(Math.random() * 1000);
//
// 		// beforeEach(function(){
// 		// 	$scope.ctrl.choices = [random];
//         //     $scope.ctrl.value = random;
//         //
// 		// 	$reselect = $compile(template)($scope);
//         //
// 		// 	$scope.$digest();
// 		// });
//
// 		it('should display choice selection WITHOUT directive', function(){
// 			expect($reselect.find('.reselect-rendered-selection').text()).toBe(random);
// 		});
//
// 	});
//
//     describe('Custom selection', function(){
//
// 		var $reselect;
//
//         var choices = [
//             { "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
//             { "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
//             { "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" }
//         ];
//
// 		// beforeEach(function(){
// 		// 	$scope.ctrl.choices = choices;
//         //     $scope.ctrl.value = choices[1].first_name;
//         //
// 		// 	$reselect = $compile('<reselect \
//         // 	                    ng-model="ctrl.value"> \
//         //                         <reselect-selection> \
//         //                             <span ng-bind="$selection"></span><span ng-bind="$choice.email"></span> \
//         //                         </reselect-selection> \
//         // 	                    <reselect-choices \
//         // 	                        options="option.first_name as option in ctrl.choices"> \
//         // 	                            <span ng-bind="option.first_name"></span>\
//         // 	                    </reselect-choices> \
//         // 	                </reselect>')($scope);
//         //
// 		// 	$scope.$digest();
// 		// });
//
// 		it('should display choice selection WITH directive', function(){
// 			expect($reselect.find('.reselect-rendered-selection').text().trim()).toBe(choices[1].first_name + choices[1].email);
// 		});
//
// 	});
//
// 	describe('Selection Scope Checks', function(){
// 		var $reselect;
//
// 		// beforeEach(function(){
// 		// 	$scope.ctrl.scopeCheck = '__SCOPE__';
//         //
// 		// 	$reselect = $compile('<reselect \
//         // 	                    ng-model="ctrl.value"> \
//         //                         <reselect-selection> \
//         //                             {{ctrl.scopeCheck}} \
//         //                         </reselect-selection> \
//         // 	                    <reselect-choices \
//         // 	                        options="option in [1]"> \
//         // 	                    </reselect-choices> \
//         // 	                </reselect>')($scope);
//         //
// 		// 	$scope.$digest();
// 		// });
//
// 		it('should have access to outer scope', function(){
// 			expect($reselect.find('.reselect-rendered-selection').text().trim()).toBe($scope.ctrl.scopeCheck);
// 		});
//
// 	});
//
//
// });
