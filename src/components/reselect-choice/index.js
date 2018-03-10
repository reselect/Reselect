import template from './reselect-choice.html'

class ReselectChoiceController {
    static get $inject () {
        return ['$scope', '$attrs', '$rsDebug']
    }

    constructor ($scope, $attrs, $rsDebug) {
        this.$rsDebug = $rsDebug

        this.value = $attrs.value

        $attrs.$observe('value', (val) => {
            this.value = val
        })
    }

    onClick (value = this.value) {
        this.$rsDebug.log('rs-choice', 'onClick', value)
        this.$reselect.setValue(value)
    }
}

class ReselectChoiceDirective {
    constructor ($rsDebug) {
        this.restrict = 'AE'
        this.scope = true
        this.require = '^^reselect'
        this.replace = true
        this.template = template
        this.transclude = true

        this.controller = ReselectChoiceController
        this.controllerAs = '$choice'

        this.$rsDebug = $rsDebug
    }

    link ($scope, $elem, $attrs, $reselect) {
        $scope.$choice.$reselect = $reselect
        // Hook self to $reselect
    }

    static directive () {
        return new ReselectChoiceDirective(...arguments)
    }
}

ReselectChoiceDirective.directive.$inject = ['$rsDebug']

export default ReselectChoiceDirective
