// 'use strict';
//
// describe('Remote Fetching Test', function(){
//     var $scope, $rootScope, $compile, $httpBackend, $reselect, $timeout, ctrl;
//
//     var default_result = [];
//
//     //set up template
//     var template = '<reselect\
//                         ng-model="ctrl.value">\
//                         <div reselect-selection>\
//                             <span ng-bind="$selection"></span>\
//                         </div>\
//                         <div reselect-choices\
//                             options="option.data as option in $remote"\
//                             remote="ctrl.remoteOptions">\
//                             <span ng-bind="option.first_name"></span> \
//                         </div>\
//                     </reselect>';
//                     // make api call, get results
//                     // set model as $scope.ctrl and pass in remoteOptions
//                     // test what is binded from remote
//
//     //loads module
//     beforeEach(module('Reselect'));
//
//     //inject dependencies
//     beforeEach(inject(function(_$rootScope_, _$compile_, _$httpBackend_, _$timeout_){
//         $rootScope   = _$rootScope_;
//         $scope       = $rootScope.$new();
//         $compile     = _$compile_;
//         $httpBackend = _$httpBackend_;
//         $timeout     = _$timeout_;
//
//         // set up ctrl
//         $scope.ctrl = {};
//         $scope.ctrl.remoteOptions = {
//             endpoint: function(params, pagination){
//                 if(params.search_term){
//                     return 'http://reselect.com/foo/bar/';
//                 }else{
//                     return 'http://reselect.com/foo/bar/';
//                 }
//
//             },
//             params: function(params, pagination){
//                 var query = {
//                     after: pagination.more,
//                     limit: 10,
//                     q    : params.search_term,
//                     t    : 'all',
//                     sort : 'relevance'
//                 };
//
//                 return query;
//             },
//             onData: function(data){
//                 // console.log('data', data[0].first_name);
//                 return {
//                     data: data
//                 };
//             }
//         };
//
//         default_result = [
//             { "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
//             { "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
//             { "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" }
//         ]
//
//         $httpBackend.when('GET', /.*?foo\/bar\/?.*/g).respond(default_result);
//
//         // set $reselect as compiled template
//
//         $reselect = $compile(template)($scope);
//
//         // fire watcher to evaluate expressions
//
//         $scope.$digest();
//         ctrl = $reselect.controller('reselect');
//
//
//     }));
//
//     afterEach(function () {
//         $httpBackend.verifyNoOutstandingExpectation();
//         $httpBackend.verifyNoOutstandingRequest();
//     });
//
//     it('should retrieve data when select is clicked', function(){
//         // expect backend call
//         $httpBackend.expectGET(/.*?foo\/bar\/?.*/g);
//         // click dropdown to initiate call
//         $reselect.find('.reselect-selection')[0].click();
//         // flush backend
//         $httpBackend.flush();
//     });
//
//     it('should have a populated options list after click', function(){
//         $reselect.find('.reselect-selection')[0].click();
//
//         // $scope.$digest();
//
//         $httpBackend.flush();
//
//         // check if dropdown is defined
//         expect($reselect.hasClass('.reselect-options-list')).toBeDefined();
//         // check if dropdown has atleast one item returned from backend
//         expect($reselect.find('.reselect-dropdown--opened').length).toBe(1);
//
//     })
//
//     it('should have options that match retrieved data', function(){
//         $reselect.find('.reselect-selection')[0].click();
//
//         // $scope.$digest();
//
//         $httpBackend.flush();
//
//         expect($reselect.find('.reselect-option').eq(0).text().trim()).toBe(default_result[0].first_name);
//
//     });
// })
