'use strict';

describe('Reselect Lazyscroller Test', function(){
    var $rootScope, $compile, $scope, $reselect, LazyScroller, LazyContainer;

    beforeEach(module('Reselect'));

    beforeEach(inject(function (_$rootScope_, _$compile_, _LazyScroller_, _LazyContainer_) {
        $rootScope  = _$rootScope_;
        $scope        = $rootScope.$new();
        $compile = _$compile_;
        LazyScroller  = _LazyScroller_;
        LazyContainer = _LazyContainer_;

        $scope.ctrl = {};

        $scope.ctrl.arrayOfObjects = [
            { "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
            { "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
            { "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" }
        ];

        var template = '<reselect \
                            ng-model="ctrl.value1"> \
                            <reselect-choices \
                                options="option in ctrl.arrayOfObjects"> \
                                    <span ng-bind="option.email"></span> \
                            </reselect-choices> \
                        </reselect>';

        $reselect = $compile(template)($scope);

        $rootScope.$digest();
    }));

    describe('LazyScroller', function () {

        var LazyScrollerOpts;

        beforeEach(inject(function () {
            LazyScrollerOpts = {
                scopeName: 'option',
                container: $reselect.find('.reselect-options-container'),
                list: $reselect.find('.reselect-options-list'),
                choiceHeight: 36,
                listHeight: 300
            }
        }));

        describe('LazyScroller instantiation', function () {
            it('should create a new LazyScroller class', function() {
                var LazyDropdown = new LazyScroller($scope, LazyScrollerOpts);

                expect(angular.isObject(LazyDropdown)).toBe(true);
                expect(LazyDropdown.options.scopeName).toEqual(LazyScrollerOpts.scopeName);
            });
        });
    });

    describe('LazyContainer', function() {
        var LazyContainerOpts;

        beforeEach(inject(function () {
            var lazyScope = $scope.$new();
				lazyScope.$options = {};
				lazyScope['option'] = {};

            LazyContainerOpts = {
                containerId : 1,
				element     : $reselect.find('.reselect-options-list .reselect-option-choice').eq(0),
				scope       : lazyScope
            }
        }));

        describe('LazyContainer instantiation', function () {
            it('should create a new LazyContainer class', function() {
                var LazyCntr = new LazyContainer($scope, LazyContainerOpts);

                expect(angular.isObject(LazyCntr)).toBe(true);
                expect(LazyCntr.render).toBeDefined();
            });
        });
    });
});
