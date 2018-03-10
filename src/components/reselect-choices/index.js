import template from './reselect-choices.html'

class ReselectChoicesController {
    static get $inject () {
        return ['ChoiceParser', '$scope']
    }

    constructor (ChoiceParser, $scope) {
        this.ChoiceParser = ChoiceParser
        this.$scope = $scope
    }
}

class ReselectChoicesDirective {
    constructor ($rsDebug, ChoiceParser) {
        this.restrict = 'AE'
        this.require = '^^reselect'
        this.replace = true
        this.template = template
        this.transclude = true

        this.controller = ReselectChoicesController
        this.controllerAs = '$ctrl'

        this.$rsDebug = $rsDebug
        this.ChoiceParser = ChoiceParser
    }

    compile (elem, attrs) {
        if (!attrs.options) {
            console.error('reselect-choices missing [options] attribute')
            return
        }

        var parsedChoice = this.ChoiceParser.parse(attrs.options)
        this.$rsDebug.log('rs-choices', 'compile: parsedChoice', parsedChoice)

        let $choices = angular.element(elem[0].querySelectorAll('.reselect-choice'))

        $choices.attr('ng-repeat', parsedChoice.repeatExpression())
        $choices.attr('rs-transclude', '')
        $choices.attr('ng-click', `$reselect.select(${parsedChoice.itemName})`)

        return function link ($scope, element, attrs, $reselect, transcludeFn) {
            $reselect.parseOptions(attrs.options)

            transcludeFn($scope, function (clone) {
                // this.$rsDebug.log('transpile inner?')
                // this.$rsDebug.log(element[0].innerHTML)
                // element.append(clone)
            })
        }
    }

    static directive () {
        return new ReselectChoicesDirective(...arguments)
    }
}

ReselectChoicesDirective.directive.$inject = ['$rsDebug', 'ChoiceParser']

export default ReselectChoicesDirective
