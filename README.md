# Reselect [![Build Status](https://travis-ci.org/reselect/Reselect.svg?branch=master)](https://travis-ci.org/reselect/Reselect)

Reselect is a directive built off of [Angular's HTML SELECT](https://docs.angularjs.org/api/ng/directive/select) element. It supports searching, remote data sets, and infinite scrolling of results.

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
    reselect-options=""
    ng-model="">
    <div reselect-choices
        options=""
        value="">
            <span ng-bind=""></span>
    </div>
</reselect>
````

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :rocket:

## History

TODO: Write history

