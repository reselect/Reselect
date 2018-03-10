import template from './reselect-selection.html'

class Controller {
    static get $inject () {
        return ['$scope', '$attrs', '$rsDebug']
    }

    constructor ($scope) {
        this.$scope = $scope
    }

    $onInit () {
        this.$scope.$selection = this.$reselect.$selected
    }
}

class Directive {
    constructor ($rsDebug) {
        this.restrict = 'AE'
        this.scope = true
        this.require = {
            $reselect: '^^reselect'
        }
        this.replace = true
        this.template = template
        this.transclude = true

        this.controller = Controller

        this.bindToController = true

        this.$rsDebug = $rsDebug
    }

    link ($scope, $elem, $attrs, $reselect, transcludeFn) {
        transcludeFn($scope, function (clone) {
            $elem.replaceWith(clone)
        })
    }

    static directive () {
        return new Directive(...arguments)
    }
}

Directive.directive.$inject = ['$rsDebug']

export default Directive
