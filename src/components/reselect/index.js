import template from './reselect.html'

let state = {
    is_opened: false
}

class ReselectController {
    static get $inject () {
        return ['$scope', '$rsDebug', 'ChoiceParser']
    }

    constructor ($scope, $rsDebug, ChoiceParser) {
        this.state = {
            ...state
        }

        this.$selected = {
            $source: null,
            $value: null
        }

        this.$scope = $scope
        this.$rsDebug = $rsDebug
        this.ChoiceParser = ChoiceParser
    }

    toggleDropdown () {
        this.state.is_opened = !this.state.is_opened
    }

    parseOptions (expression) {
        this.parsedResult = this.ChoiceParser.parse(expression)

        this.choices = this.parsedResult.source(this.$scope.$parent)
    }

    select (choice) {
        this.$rsDebug.log('$select', choice)

        let $selectedChoice = this.parsedResult.modelMapper(this.$scope, {
            [this.parsedResult.itemName]: choice
        })

        this.setSelected(choice, $selectedChoice)
    }

    setSelected (source = null, value = source) {
        this.$selected.$source = source
        this.$selected.$value = value

        this.$rsDebug.log('$selected', this.$selected)

        this.setValue(this.$selected.$value)
    }

    setValue (value) {
        this.ngModel.$setViewValue(value)
    }
}

class ReselectDirective {
    constructor ($rsDebug) {
        this.restrict = 'AE'
        this.require = ['reselect', 'ngModel']
        this.scope = true
        this.replace = true
        this.template = template
        this.transclude = true
        this.controller = ReselectController
        this.controllerAs = '$reselect'

        this.$rsDebug = $rsDebug
    }

    compile () {
        return (scope, element, attrs, ctrls, transcludeFn) => {
            let $reselect = ctrls[0]
            let ngModel = ctrls[1]

            $reselect.ngModel = ngModel

            // From view --> model
            ngModel.$parsers.unshift((inputValue) => {
                this.$rsDebug.log('ngModel', 'view -> model', inputValue)
                return inputValue
            })

            ngModel.$formatters.unshift((inputValue) => {
                this.$rsDebug.log('ngModel', 'model -> view', inputValue)

                $reselect.setSelected(inputValue, $reselect.parsedResult.modelMapper($reselect.$scope, {
                    [$reselect.parsedResult.itemName]: inputValue
                }))
                return inputValue
            })

            ngModel.$render = () => {
                this.$rsDebug.log('ngModel', '$rendered')
            }

            transcludeFn(scope, function (clone) {
                let $clone = angular.element('<div>').append(clone)
                let $choiceContainer = angular.element(element[0].querySelectorAll('.reselect-choices-container'))
                let $selectionContainer = angular.element(element[0].querySelectorAll('.reselect-selection-container'))
                let $placeholderContainer = angular.element(element[0].querySelectorAll('.reselect-placeholder-container'))

                $choiceContainer.append($clone[0].querySelectorAll('.reselect-choices'))

                if ($clone[0].querySelectorAll('.reselect-selection').length === 1) {
                    angular.element($selectionContainer[0].querySelectorAll('.reselect-selection')).replaceWith($clone[0].querySelectorAll('.reselect-selection'))
                }

                if ($clone[0].querySelectorAll('.reselect-placeholder').length === 1) {
                    angular.element($placeholderContainer[0].querySelectorAll('.reselect-placeholder')).replaceWith($clone[0].querySelectorAll('.reselect-placeholder'))
                }

                element.append($clone)
            })
        }
    }

    static directive () {
        return new ReselectDirective(...arguments)
    }
}

ReselectDirective.directive.$inject = ['$rsDebug']

export default angular.module('reselect.component', [])
    .directive('reselect', ReselectDirective.directive)
    .directive('rsTransclude', function () {
        return {
            link: function (scope, element, attrs, ctrls, transclude) {
                transclude(scope, function (clone) {
                    element.append(clone)
                })
            }
        }
    })
    .name
