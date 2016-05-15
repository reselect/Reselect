# Reselect [![Build Status](https://travis-ci.org/reselect/Reselect.svg?branch=master)](https://travis-ci.org/reselect/Reselect)

Reselect is a directive built off of [Angular's HTML SELECT](https://docs.angularjs.org/api/ng/directive/select) element. Reselect features searching, ability to use remote data sets, infinite scrolling of results, and handling of invalid choices.

## Features
1. Lazy rendered options list
2. Remote data source
3. Infinite scroll
4. Invalid choice handlers

## Installation

1. Download [Reselect](https://github.com/reselect/Reselect)
2. Run `npm install` and `bower install`
3. To use Reselect in your project refer to [Usage](#usage)
4. To contribute to Reselect refer to [Contributing](#contributing)

## Usage
Download [Reselect](https://github.com/reselect/Reselect) and use the production version within the `dist/` folder. Once downloaded, add the `Reselect` dependency to your AngularJS module.

```js
angular.module('myModule', ['Reselect']);
```

Then use the directive in your application: 
````html

<reselect
    ng-model="">
    <div reselect-selection>
        <span ng-bind=""></span>
    </div>
    <div reselect-choices
        options=""
        remote="">
            <span ng-bind=""></span>
    </div>
</reselect>

````

Check out more in-depth examples on the [demo](http://reselect.github.io/Reselect/) page.


## Found a bug?

Please check the [CONTRIBUTING.md](CONTRIBUTING.md) and submit your issue [here](https://github.com/reselect/Reselect/issues/new).

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'feat(reselect): Adding an awesome feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :rocket:

Quality contributions are always welcome! Please check the [CONTRIBUTING.md](CONTRIBUTING.md) for more details on the contribution guidelines.

