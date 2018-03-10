import './styles.scss'

import components from './components'
import factories from './factories'
import services from './services'

angular.module('reselect', [factories, components, services])
