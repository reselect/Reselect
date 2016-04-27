'use strict';

describe('Reselect No Choice', function(){

	var $scope, $rootScope, $compile;

	beforeEach(module('Reselect'));

	beforeEach(inject(function(_$rootScope_, _$compile_){
		$rootScope  = _$rootScope_;
		$scope      = $rootScope.$new();
		$compile    = _$compile_;

		$scope.ctrl = {};
	}));

    var $reselect;

    it('should display default no options text', function(){

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                options="option in []">\
                            </reselect-choices> \
                        </reselect>';

        $reselect = $compile(template)($scope);

        $rootScope.$digest();

        expect($reselect.find('.reselect-empty-container').text().trim()).toBe('No Options');
    });

    it('should display [no-options-text] value', function(){

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                no-options-text="__NO_OPTION_TEXT__" \
                                options="option in []">\
                            </reselect-choices> \
                        </reselect>';

        $reselect = $compile(template)($scope);

        $rootScope.$digest();

        expect($reselect.find('.reselect-empty-container').text().trim()).toBe('__NO_OPTION_TEXT__');
    });

    it('should display [reselect-no-choice] directive', function(){

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                no-options-text="__NO_OPTION_TEXT__" \
                                options="option in []">\
                            </reselect-choices> \
                            <reselect-no-choice>\
                                __NO_CHOICE_DIRECTIVE__\
                            </reselect-no-choice>\
                        </reselect>';

        $reselect = $compile(template)($scope);

        $rootScope.$digest();

        expect($reselect.find('.reselect-empty-container').text().trim()).toBe('__NO_CHOICE_DIRECTIVE__');
    });

    it('should have access to correct scope', function(){

        $scope.ctrl.outer = '__OUTER_SCOPE__';

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                no-options-text="__NO_OPTION_TEXT__" \
                                options="option in []">\
                            </reselect-choices> \
                            <reselect-no-choice>\
                                {{ctrl.outer}}\
                            </reselect-no-choice>\
                        </reselect>';

        $reselect = $compile(template)($scope);

        $rootScope.$digest();

        expect($reselect.find('.reselect-empty-container').text().trim()).toBe($scope.ctrl.outer);
    });

});
