import reselect from './reselect'
import ReselectChoices from './reselect-choices'
import ReselectChoice from './reselect-choice'

export default angular.module('reselect.components', [reselect])
    .directive('reselectChoice', ReselectChoice.directive)
    .directive('reselectChoices', ReselectChoices.directive)
    .name
