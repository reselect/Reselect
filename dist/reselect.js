/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2016-04-30T08:11:59.273Z
 * License: MIT
 */


(function () { 
'use strict';
/**
 * @license
 * Fuse - Lightweight fuzzy-search
 *
 * Copyright (c) 2012-2016 Kirollos Risk <kirollos@gmail.com>.
 * All Rights Reserved. Apache Software License 2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
;(function (global) {
  'use strict'

  function log () {
    console.log.apply(console, arguments)
  }

  var MULTI_CHAR_REGEX = / +/g

  var defaultOptions = {
    // The name of the identifier property. If specified, the returned result will be a list
    // of the items' dentifiers, otherwise it will be a list of the items.
    id: null,

    // Indicates whether comparisons should be case sensitive.

    caseSensitive: false,

    // An array of values that should be included from the searcher's output. When this array
    // contains elements, each result in the list will be of the form `{ item: ..., include1: ..., include2: ... }`.
    // Values you can include are `score`, `matchedLocations`
    include: [],

    // Whether to sort the result list, by score
    shouldSort: true,

    // The search function to use
    // Note that the default search function ([[Function]]) must conform to the following API:
    //
    //  @param pattern The pattern string to search
    //  @param options The search option
    //  [[Function]].constructor = function(pattern, options)
    //
    //  @param text: the string to search in for the pattern
    //  @return Object in the form of:
    //    - isMatch: boolean
    //    - score: Int
    //  [[Function]].prototype.search = function(text)
    searchFn: BitapSearcher,

    // Default sort function
    sortFn: function (a, b) {
      return a.score - b.score
    },

    // The get function to use when fetching an object's properties.
    // The default will search nested paths *ie foo.bar.baz*
    getFn: deepValue,

    // List of properties that will be searched. This also supports nested properties.
    keys: [],

    // Will print to the console. Useful for debugging.
    verbose: false,

    // When true, the search algorithm will search individual words **and** the full string,
    // computing the final score as a function of both. Note that when `tokenize` is `true`,
    // the `threshold`, `distance`, and `location` are inconsequential for individual tokens.
    tokenize: false
  }

  function Fuse (list, options) {
    var i
    var len
    var key
    var keys

    this.list = list
    this.options = options = options || {}

    // Add boolean type options
    for (i = 0, keys = ['sort', 'shouldSort', 'verbose', 'tokenize'], len = keys.length; i < len; i++) {
      key = keys[i]
      this.options[key] = key in options ? options[key] : defaultOptions[key]
    }
    // Add all other options
    for (i = 0, keys = ['searchFn', 'sortFn', 'keys', 'getFn', 'include'], len = keys.length; i < len; i++) {
      key = keys[i]
      this.options[key] = options[key] || defaultOptions[key]
    }
  }

  Fuse.VERSION = '2.2.0'

  /**
   * Sets a new list for Fuse to match against.
   * @param {Array} list
   * @return {Array} The newly set list
   * @public
   */
  Fuse.prototype.set = function (list) {
    this.list = list
    return list
  }

  Fuse.prototype.search = function (pattern) {
    if (this.options.verbose) log('\nSearch term:', pattern, '\n')

    this.pattern = pattern
    this.results = []
    this.resultMap = {}
    this._keyMap = null

    this._prepareSearchers()
    this._startSearch()
    this._computeScore()
    this._sort()

    var output = this._format()
    return output
  }

  Fuse.prototype._prepareSearchers = function () {
    var options = this.options
    var pattern = this.pattern
    var searchFn = options.searchFn
    var tokens = pattern.split(MULTI_CHAR_REGEX)
    var i = 0
    var len = tokens.length

    if (this.options.tokenize) {
      this.tokenSearchers = []
      for (; i < len; i++) {
        this.tokenSearchers.push(new searchFn(tokens[i], options))
      }
    }
    this.fullSeacher = new searchFn(pattern, options)
  }

  Fuse.prototype._startSearch = function () {
    var options = this.options
    var getFn = options.getFn
    var list = this.list
    var listLen = list.length
    var keys = this.options.keys
    var keysLen = keys.length
    var key
    var weight
    var item = null
    var i
    var j

    // Check the first item in the list, if it's a string, then we assume
    // that every item in the list is also a string, and thus it's a flattened array.
    if (typeof list[0] === 'string') {
      // Iterate over every item
      for (i = 0; i < listLen; i++) {
        this._analyze('', list[i], i, i)
      }
    } else {
      this._keyMap = {}
      // Otherwise, the first item is an Object (hopefully), and thus the searching
      // is done on the values of the keys of each item.
      // Iterate over every item
      for (i = 0; i < listLen; i++) {
        item = list[i]
        // Iterate over every key
        for (j = 0; j < keysLen; j++) {
          key = keys[j]
          if (typeof key !== 'string') {
            weight = (1 - key.weight) || 1
            this._keyMap[key.name] = {
              weight: weight
            }
            if (key.weight <= 0 || key.weight > 1) {
              throw new Error('Key weight has to be > 0 and <= 1')
            }
            key = key.name
          } else {
            this._keyMap[key] = {
              weight: 1
            }
          }
          this._analyze(key, getFn(item, key, []), item, i)
        }
      }
    }
  }

  Fuse.prototype._analyze = function (key, text, entity, index) {
    var options = this.options
    var words
    var scores
    var exists = false
    var tokenSearchers
    var tokenSearchersLen
    var existingResult
    var averageScore
    var finalScore
    var scoresLen
    var mainSearchResult
    var tokenSearcher
    var termScores
    var word
    var tokenSearchResult
    var i
    var j

    // Check if the text can be searched
    if (text === undefined || text === null) {
      return
    }

    scores = []

    if (typeof text === 'string') {
      words = text.split(MULTI_CHAR_REGEX)

      if (options.verbose) log('---------\nKey:', key)
      if (options.verbose) log('Record:', words)

      if (this.options.tokenize) {
        tokenSearchers = this.tokenSearchers
        tokenSearchersLen = tokenSearchers.length

        for (i = 0; i < this.tokenSearchers.length; i++) {
          tokenSearcher = this.tokenSearchers[i]
          termScores = []
          for (j = 0; j < words.length; j++) {
            word = words[j]
            tokenSearchResult = tokenSearcher.search(word)
            if (tokenSearchResult.isMatch) {
              exists = true
              termScores.push(tokenSearchResult.score)
              scores.push(tokenSearchResult.score)
            } else {
              termScores.push(1)
              scores.push(1)
            }
          }
          if (options.verbose) log('Token scores:', termScores)
        }

        averageScore = scores[0]
        scoresLen = scores.length
        for (i = 1; i < scoresLen; i++) {
          averageScore += scores[i]
        }
        averageScore = averageScore / scoresLen

        if (options.verbose) log('Token score average:', averageScore)
      }

      // Get the result
      mainSearchResult = this.fullSeacher.search(text)
      if (options.verbose) log('Full text score:', mainSearchResult.score)

      finalScore = mainSearchResult.score
      if (averageScore !== undefined) {
        finalScore = (finalScore + averageScore) / 2
      }

      if (options.verbose) log('Score average:', finalScore)

      // If a match is found, add the item to <rawResults>, including its score
      if (exists || mainSearchResult.isMatch) {
        // Check if the item already exists in our results
        existingResult = this.resultMap[index]

        if (existingResult) {
          // Use the lowest score
          // existingResult.score, bitapResult.score
          existingResult.output.push({
            key: key,
            score: finalScore,
            matchedIndices: mainSearchResult.matchedIndices
          })
        } else {
          // Add it to the raw result list
          this.resultMap[index] = {
            item: entity,
            output: [{
              key: key,
              score: finalScore,
              matchedIndices: mainSearchResult.matchedIndices
            }]
          }

          this.results.push(this.resultMap[index])
        }
      }
    } else if (isArray(text)) {
      for (i = 0; i < text.length; i++) {
        this._analyze(key, text[i], entity, index)
      }
    }
  }

  Fuse.prototype._computeScore = function () {
    var i
    var j
    var keyMap = this._keyMap
    var totalScore
    var output
    var scoreLen
    var score
    var weight
    var results = this.results
    var bestScore
    var nScore

    if (this.options.verbose) log('\n\nComputing score:\n')

    for (i = 0; i < results.length; i++) {
      totalScore = 0
      output = results[i].output
      scoreLen = output.length

      bestScore = 1

      for (j = 0; j < scoreLen; j++) {
        score = output[j].score
        weight = keyMap ? keyMap[output[j].key].weight : 1

        nScore = score * weight

        if (weight !== 1) {
          bestScore = Math.min(bestScore, nScore)
        } else {
          totalScore += nScore
          output[j].nScore = nScore
        }
      }

      if (bestScore === 1) {
        results[i].score = totalScore / scoreLen
      } else {
        results[i].score = bestScore
      }

      if (this.options.verbose) log(results[i])
    }
  }

  Fuse.prototype._sort = function () {
    var options = this.options
    if (options.shouldSort) {
      if (options.verbose) log('\n\nSorting....')
      this.results.sort(options.sortFn)
    }
  }

  Fuse.prototype._format = function () {
    var options = this.options
    var getFn = options.getFn
    var finalOutput = []
    var item
    var i
    var len
    var results = this.results
    var replaceValue
    var getItemAtIndex
    var include = options.include

    if (options.verbose) log('\n\nOutput:\n\n', results)

    // Helper function, here for speed-up, which replaces the item with its value,
    // if the options specifies it,
    replaceValue = options.id ? function (index) {
      results[index].item = getFn(results[index].item, options.id, [])[0]
    } : function () {}

    getItemAtIndex = function (index) {
      var record = results[index]
      var data
      var includeVal
      var j
      var output
      var _item
      var _result

      // If `include` has values, put the item in the result
      if (include.length > 0) {
        data = {
          item: record.item
        }
        if (include.indexOf('matches') !== -1) {
          output = record.output
          data.matches = []
          for (j = 0; j < output.length; j++) {
            _item = output[j]
            _result = {
              indices: _item.matchedIndices
            }
            if (_item.key) {
              _result.key = _item.key
            }
            data.matches.push(_result)
          }
        }

        if (include.indexOf('score') !== -1) {
          data.score = results[index].score
        }

      } else {
        data = record.item
      }

      return data
    }

    // From the results, push into a new array only the item identifier (if specified)
    // of the entire item.  This is because we don't want to return the <results>,
    // since it contains other metadata
    for (i = 0, len = results.length; i < len; i++) {
      replaceValue(i)
      item = getItemAtIndex(i)
      finalOutput.push(item)
    }

    return finalOutput
  }

  // Helpers

  function deepValue (obj, path, list) {
    var firstSegment
    var remaining
    var dotIndex
    var value
    var i
    var len

    if (!path) {
      // If there's no path left, we've gotten to the object we care about.
      list.push(obj)
    } else {
      dotIndex = path.indexOf('.')

      if (dotIndex !== -1) {
        firstSegment = path.slice(0, dotIndex)
        remaining = path.slice(dotIndex + 1)
      } else {
        firstSegment = path
      }

      value = obj[firstSegment]
      if (value !== null && value !== undefined) {
        if (!remaining && (typeof value === 'string' || typeof value === 'number')) {
          list.push(value)
        } else if (isArray(value)) {
          // Search each item in the array.
          for (i = 0, len = value.length; i < len; i++) {
            deepValue(value[i], remaining, list)
          }
        } else if (remaining) {
          // An object. Recurse further.
          deepValue(value, remaining, list)
        }
      }
    }

    return list
  }

  function isArray (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]'
  }

  /**
   * Adapted from "Diff, Match and Patch", by Google
   *
   *   http://code.google.com/p/google-diff-match-patch/
   *
   * Modified by: Kirollos Risk <kirollos@gmail.com>
   * -----------------------------------------------
   * Details: the algorithm and structure was modified to allow the creation of
   * <Searcher> instances with a <search> method which does the actual
   * bitap search. The <pattern> (the string that is searched for) is only defined
   * once per instance and thus it eliminates redundant re-creation when searching
   * over a list of strings.
   *
   * Licensed under the Apache License, Version 2.0 (the "License")
   * you may not use this file except in compliance with the License.
   */
  function BitapSearcher (pattern, options) {
    options = options || {}
    this.options = options
    this.options.location = options.location || BitapSearcher.defaultOptions.location
    this.options.distance = 'distance' in options ? options.distance : BitapSearcher.defaultOptions.distance
    this.options.threshold = 'threshold' in options ? options.threshold : BitapSearcher.defaultOptions.threshold
    this.options.maxPatternLength = options.maxPatternLength || BitapSearcher.defaultOptions.maxPatternLength

    this.pattern = options.caseSensitive ? pattern : pattern.toLowerCase()
    this.patternLen = pattern.length

    if (this.patternLen <= this.options.maxPatternLength) {
      this.matchmask = 1 << (this.patternLen - 1)
      this.patternAlphabet = this._calculatePatternAlphabet()
    }
  }

  BitapSearcher.defaultOptions = {
    // Approximately where in the text is the pattern expected to be found?
    location: 0,

    // Determines how close the match must be to the fuzzy location (specified above).
    // An exact letter match which is 'distance' characters away from the fuzzy location
    // would score as a complete mismatch. A distance of '0' requires the match be at
    // the exact location specified, a threshold of '1000' would require a perfect match
    // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
    distance: 100,

    // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
    // (of both letters and location), a threshold of '1.0' would match anything.
    threshold: 0.6,

    // Machine word size
    maxPatternLength: 32
  }

  /**
   * Initialize the alphabet for the Bitap algorithm.
   * @return {Object} Hash of character locations.
   * @private
   */
  BitapSearcher.prototype._calculatePatternAlphabet = function () {
    var mask = {},
      i = 0

    for (i = 0; i < this.patternLen; i++) {
      mask[this.pattern.charAt(i)] = 0
    }

    for (i = 0; i < this.patternLen; i++) {
      mask[this.pattern.charAt(i)] |= 1 << (this.pattern.length - i - 1)
    }

    return mask
  }

  /**
   * Compute and return the score for a match with `e` errors and `x` location.
   * @param {number} errors Number of errors in match.
   * @param {number} location Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  BitapSearcher.prototype._bitapScore = function (errors, location) {
    var accuracy = errors / this.patternLen,
      proximity = Math.abs(this.options.location - location)

    if (!this.options.distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy
    }
    return accuracy + (proximity / this.options.distance)
  }

  /**
   * Compute and return the result of the search
   * @param {String} text The text to search in
   * @return {Object} Literal containing:
   *                          {Boolean} isMatch Whether the text is a match or not
   *                          {Decimal} score Overall score for the match
   * @public
   */
  BitapSearcher.prototype.search = function (text) {
    var options = this.options
    var i
    var j
    var textLen
    var location
    var threshold
    var bestLoc
    var binMin
    var binMid
    var binMax
    var start, finish
    var bitArr
    var lastBitArr
    var charMatch
    var score
    var locations
    var matches
    var isMatched
    var matchMask
    var matchedIndices
    var matchesLen
    var match

    text = options.caseSensitive ? text : text.toLowerCase()

    if (this.pattern === text) {
      // Exact match
      return {
        isMatch: true,
        score: 0,
        matchedIndices: [[0, text.length - 1]]
      }
    }

    // When pattern length is greater than the machine word length, just do a a regex comparison
    if (this.patternLen > options.maxPatternLength) {
      matches = text.match(new RegExp(this.pattern.replace(MULTI_CHAR_REGEX, '|')))
      isMatched = !!matches

      if (isMatched) {
        matchedIndices = []
        for (i = 0, matchesLen = matches.length; i < matchesLen; i++) {
          match = matches[i]
          matchedIndices.push([text.indexOf(match), match.length - 1])
        }
      }

      return {
        isMatch: isMatched,
        // TODO: revisit this score
        score: isMatched ? 0.5 : 1,
        matchedIndices: matchedIndices
      }
    }

    location = options.location
    // Set starting location at beginning text and initialize the alphabet.
    textLen = text.length
    // Highest score beyond which we give up.
    threshold = options.threshold
    // Is there a nearby exact match? (speedup)
    bestLoc = text.indexOf(this.pattern, location)

    // a mask of the matches
    matchMask = []
    for (i = 0; i < textLen; i++) {
      matchMask[i] = 0
    }

    if (bestLoc != -1) {
      threshold = Math.min(this._bitapScore(0, bestLoc), threshold)
      // What about in the other direction? (speed up)
      bestLoc = text.lastIndexOf(this.pattern, location + this.patternLen)

      if (bestLoc != -1) {
        threshold = Math.min(this._bitapScore(0, bestLoc), threshold)
      }
    }

    bestLoc = -1
    score = 1
    locations = []
    binMax = this.patternLen + textLen

    for (i = 0; i < this.patternLen; i++) {
      // Scan for the best match; each iteration allows for one more error.
      // Run a binary search to determine how far from the match location we can stray
      // at this error level.
      binMin = 0
      binMid = binMax
      while (binMin < binMid) {
        if (this._bitapScore(i, location + binMid) <= threshold) {
          binMin = binMid
        } else {
          binMax = binMid
        }
        binMid = Math.floor((binMax - binMin) / 2 + binMin)
      }

      // Use the result from this iteration as the maximum for the next.
      binMax = binMid
      start = Math.max(1, location - binMid + 1)
      finish = Math.min(location + binMid, textLen) + this.patternLen

      // Initialize the bit array
      bitArr = Array(finish + 2)

      bitArr[finish + 1] = (1 << i) - 1

      for (j = finish; j >= start; j--) {
        charMatch = this.patternAlphabet[text.charAt(j - 1)]

        if (charMatch) {
          matchMask[j - 1] = 1
        }

        if (i === 0) {
          // First pass: exact match.
          bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch
        } else {
          // Subsequent passes: fuzzy match.
          bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch | (((lastBitArr[j + 1] | lastBitArr[j]) << 1) | 1) | lastBitArr[j + 1]
        }
        if (bitArr[j] & this.matchmask) {
          score = this._bitapScore(i, j - 1)

          // This match will almost certainly be better than any existing match.
          // But check anyway.
          if (score <= threshold) {
            // Indeed it is
            threshold = score
            bestLoc = j - 1
            locations.push(bestLoc)

            if (bestLoc > location) {
              // When passing loc, don't exceed our current distance from loc.
              start = Math.max(1, 2 * location - bestLoc)
            } else {
              // Already passed loc, downhill from here on in.
              break
            }
          }
        }
      }

      // No hope for a (better) match at greater error levels.
      if (this._bitapScore(i + 1, location) > threshold) {
        break
      }
      lastBitArr = bitArr
    }

    matchedIndices = this._getMatchedIndices(matchMask)

    // Count exact matches (those with a score of 0) to be "almost" exact
    return {
      isMatch: bestLoc >= 0,
      score: score === 0 ? 0.001 : score,
      matchedIndices: matchedIndices
    }
  }

  BitapSearcher.prototype._getMatchedIndices = function (matchMask) {
    var matchedIndices = []
    var start = -1
    var end = -1
    var i = 0
    var match
    var len = len = matchMask.length
    for (; i < len; i++) {
      match = matchMask[i]
      if (match && start === -1) {
        start = i
      } else if (!match && start !== -1) {
        end = i - 1
        matchedIndices.push([start, end])
        start = -1
      }
    }
    if (matchMask[i - 1]) {
      matchedIndices.push([start, i - 1])
    }
    return matchedIndices
  }

  // Export to Common JS Loader
  if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = Fuse
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(function () {
      return Fuse
    })
  } else {
    // Browser globals (root is window)
    global.Fuse = Fuse
  }

})(this)

/**
 * Reselect base
 */

var Reselect = angular.module('Reselect', ['reselect.templates']);

Reselect.service('ReselectDataAdapter', ['$q', function($q){

    var DataAdapter = function(){
        this.data = [];
    };

    DataAdapter.prototype.observe = function(){
        console.error('Not implemented');
        return;
    };

    DataAdapter.prototype.prepareGetData = function(){
        return;
    };

    DataAdapter.prototype.getData = function(search_term){
        var self = this;

        // This function requires the return of a deferred promise
        var defer = $q.defer();

        var choices;
        var search_options = {};

        if(search_term){

            // Fuzzy Search
            var fuse = new Fuse(this.data, search_options);

            choices = fuse.search(search_term);

            if(angular.isDefined(search_options.keys)){
                choices = choices.map(function(index){
                    return self.data[index];
                });
            }
        }else{
            choices = this.data;
        }

        defer.resolve({
            data: choices
        });

        return defer.promise;
    };

    DataAdapter.prototype.updateData = function(newData){

        this.data = newData;

        return this.data;
    };

    DataAdapter.prototype.init = function(){
        this.observe(this.updateData.bind(this));
    };

    return DataAdapter;
}]);

Reselect.service('ReselectAjaxDataAdapter', ['$http', function($http){

    var DataAdapter = function(remoteOptions, parsedOptions){
        this.data = [];
        this.page = 1;
        this.pagination = {};

        this.parsedOptions = parsedOptions;

        this.options = angular.extend({
            params: function(params){
                return params;
            }
        }, remoteOptions);
    };

    DataAdapter.prototype.observe = function(){
        return;
    };

    DataAdapter.prototype.prepareGetData = function(){
        return;
    };

    DataAdapter.prototype.getData = function(search_term){
        var self = this;

        var state = {
            page       : this.page,
            search_term: search_term
        };

        var params = this.options.params(state, self.pagination);

        var endpoint;

        if(typeof this.options.endpoint === 'function'){
            endpoint = this.options.endpoint(state, self.pagination);
        }else{
            endpoint = this.options.endpoint;
        }

        return $http.get(endpoint, {
            params: params
        })
            .then(function(res){
                return self.parsedOptions.source({
                    '$remote': res.data
                });
            })
            .then(this.options.onData)
            .then(function(choices){
                if(choices.pagination){
                    self.pagination = choices.pagination;

                    if(choices.pagination.more){
                        self.page += 1;
                    }
                }else{
                    self.pagination = null;
                }

                return choices;
            });
    };

    DataAdapter.prototype.updateData = function(newData, push){
        if(push === true){
            this.data = this.data.concat(newData);
        }else{
            this.data = newData;
        }
        return this.data;
    };

    DataAdapter.prototype.init = function(){
    };

    return DataAdapter;
}]);


var ReselectDirectiveCtrl = function($scope, reselectDefaultOptions){
	var ctrl = $scope.reselect = this;

	// Options
	ctrl.options = angular.extend({}, $scope.reselectOptions, reselectDefaultOptions);

	ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();
};

ReselectDirectiveCtrl.$inject = ['$scope', 'reselectDefaultOptions'];

angular
	.module('reselect.controller', [])
	.controller('reselect.directive.ctrl', ReselectDirectiveCtrl);

Reselect.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	},
	selectionTemplate: angular.element('<span ng-bind="$selection"></span>')
})

.directive('reselect', ['$compile', function($compile){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.directive.tpl.html',
		require     : ['^reselect', '^ngModel'],
		transclude  : true,
		replace     : true,
		scope		: true,
		link: function($scope, $element, $attrs, ctrls, transcludeFn){

			var $Reselect = ctrls[0];
			var $transcludeElems = null;

			transcludeFn($scope, function(clone, scp){
				$transcludeElems = clone;
				$element.append(clone);
			}).detach();

			// Wrap array of transcluded elements in a <div> so we can run css queries
			$transcludeElems = angular.element('<div>').append($transcludeElems);

			// Transclude [reselect-choices] directive
			var $choice = $transcludeElems[0].querySelectorAll('.reselect-choices, [reselect-choices], reselect-choices');

			angular.element($element[0].querySelectorAll('.reselect-dropdown')).append($choice);

			// Transclude [reselect-selection] directive
			var $selection = $transcludeElems[0].querySelectorAll('.reselect-selection, [reselect-selection], reselect-selection');
				$selection = $selection.length ? $selection : $Reselect.options.selectionTemplate.clone();

			angular.element($element[0].querySelectorAll('.reselect-rendered-selection')).append($selection);

			// Transclude [reselect-no-choice] directive
			var $noChoice = angular.element($transcludeElems[0].querySelectorAll('.reselect-no-choice, [reselect-selection], reselect-selection'));

			if($noChoice.length === 1){
				angular.element($element[0].querySelectorAll('.reselect-empty-container')).html('').append($noChoice);
			}

			// Store [reselect-choices]'s controller
			$Reselect.transcludeCtrls.$ReselectChoice = angular.element($choice).controller('reselectChoices');

			$compile($selection)($Reselect.selection_scope);
		},
		controllerAs: '$reselect',
		controller: ['$scope', '$element', 'reselectDefaultOptions', '$timeout', 'KEYS', function($scope, $element, reselectDefaultOptions, $timeout, KEYS){

			var ctrl = this;
			var $ngModel = $element.controller('ngModel');

			// Options
			ctrl.options = angular.extend({}, reselectDefaultOptions, $scope.reselectOptions);

			// Variables
			ctrl.value = null;
			ctrl.opened = false;
			ctrl.transcludeCtrls = {};

			/**
			 * Placeholder
			 */

			ctrl.rendered_placeholder = null;

			ctrl.renderPlaceholder = function(){
				ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();
			};

			/**
			 * Selection
			 */

			ctrl.selection_scope = $scope.$new();
			ctrl.selection_scope.$selection = null;

			ctrl.rendered_selection = null;

			ctrl.renderSelection = function(state, $choice){
				ctrl.selection_scope.$selection = state;
				ctrl.selection_scope.$choice = $choice;
			};

			/**
			 * Controller Methods
			 */

			ctrl.selectValue = function(value, $choice){
				$ngModel.$setViewValue(value);

				ctrl.value = value;

				ctrl.renderSelection(ctrl.value, $choice);

				ctrl.hideDropdown();
			};

			// Override ng-model render function
			$ngModel.$render = function(){
				var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

				if(!ctrl.options.allowInvalid && angular.isDefined(valueSelected)){
					var choices = ctrl.transcludeCtrls.$ReselectChoice.DataAdapter.data;
					var trackBy = ctrl.transcludeCtrls.$ReselectChoice.parsedOptions.trackByExp;

					var choiceMatch, valueSelectedMatch;

					for(var i = 0; i < choices.length; i++){
						if(!angular.isDefined(choices[i])){
							continue;
						}

						var scp = {};
						scp[ctrl.transcludeCtrls.$ReselectChoice.parsedOptions.itemName] = choices[i];

						choiceMatch = ctrl.transcludeCtrls.$ReselectChoice.parsedOptions.modelMapper(scp);
						valueSelectedMatch = valueSelected;

						if(choiceMatch === valueSelectedMatch){
							valueToBeSelected = choices[i];
							break;
						}
					}
				}else{
					valueToBeSelected = valueSelected;
				}

				if(valueToBeSelected){
					ctrl.selectValue($ngModel.$viewValue, valueToBeSelected);
				}else{
					if(ctrl.options.resolveInvalid && typeof ctrl.options.resolveInvalid === 'function'){
						var validateDone = function(value){
							if(value !== undefined){
								ctrl.selectValue(value);
							}else{
								$ngModel.$setViewValue(valueToBeSelected);
							}
						};

						ctrl.options.resolveInvalid(valueSelected, validateDone);
					}else{
						$ngModel.$setViewValue(valueToBeSelected);
					}

				}

				return;
			};

			/**
			 * Choices
			 */

			ctrl.parsedOptions = null;
			ctrl.choices = [];

            /**
			 * Keyboard Support
			 */

            ctrl.handleKeyDown = function(evt) {
                var key = evt.which;

                if (ctrl.opened) {
                   if (key === KEYS.ESC || key === KEYS.TAB) {
                     ctrl.hideDropdown();

                     evt.preventDefault();
                   }
                 } else {
                   if (key === KEYS.ENTER || key === KEYS.SPACE) {
                     ctrl.showDropdown();

                     evt.preventDefault();
                   }
                 }
            };

			/**
			 * Dropdown
			 */

			ctrl.toggleDropdown = function(){
				if(ctrl.opened){
					ctrl.hideDropdown();
				}else{
					ctrl.showDropdown();
				}
			};

			function hideDropdownOnClick(event){
				if($element[0].contains(event.target)){
					return;
				}

				$scope.$apply(function(){
					ctrl.hideDropdown();
				});

				angular.element(document).off('click', hideDropdownOnClick);
			}

			ctrl.showDropdown = function(){
				ctrl.opened = true;

				ctrl.transcludeCtrls.$ReselectChoice.getData(true);

				$scope.$emit('reselect.search.focus');

				angular.element(document).on('click', hideDropdownOnClick);
			};

			ctrl.hideDropdown = function(){
				ctrl.opened = false;

                $scope.$emit('reselect.input.focus');
			};

			/**
			 * Initialization
			 */

			ctrl.initialize = function(){
				ctrl.renderPlaceholder();
			};

			ctrl.initialize();

			return ctrl;
		}]
	};
}]);

Reselect.service('LazyScroller', ['LazyContainer', '$compile', function(LazyContainer, $compile){

	var defaultOptions = {
		scopeName: '$choice'
	};

	var LazyScroller = function($scope, options){
		var self = this;

		self.options = angular.extend({}, defaultOptions, options);

		self.$scope = $scope;

		self.$container = self.options.container;
		self.$list = self.options.list;

		self.choices = [];

		self.lazyContainers = [];
		self.numLazyContainers = Math.ceil((self.options.listHeight)/ self.options.choiceHeight) + 2;

		self.lastCheck       = null;
		self.lastScrollTop   = null;
	};

	LazyScroller.prototype.renderContainer = function(){
		var self = this;

		// Set the max height of the dropdown container
		// var optionsHeight = $Reselect.choices.length * self.choiceHeight;
		var optionsHeight = self.choices.length * self.options.choiceHeight;
		var containerHeight = (optionsHeight > self.options.listHeight) ? self.options.listHeight : optionsHeight;

		self.$container.css('height', (containerHeight || self.options.choiceHeight) + 'px');

		// Simulate the scrollbar with the estimated height for the number of choices
		self.$list.css('height', optionsHeight + 'px');

        return {
            choiceHeight: optionsHeight,
            containerHeight: containerHeight
        };
	};

	LazyScroller.prototype.bindScroll = function(){
		var self = this;

		self.$container.on('scroll', function(){
			window.requestAnimationFrame(function(){
				self._calculateLazyRender();
			});
		});
	};

	LazyScroller.prototype._shouldRender = function(scrollTop){
		var self = this;

		return !(typeof self.lastCheck === 'number' &&
			(
				scrollTop <= self.lastCheck + (self.options.choiceHeight - (self.lastCheck % self.options.choiceHeight) ) && //
				scrollTop >= self.lastCheck - (self.lastCheck % self.options.choiceHeight) //
			));
	};

	LazyScroller.prototype._calculateLazyRender = function(force){
		var self = this;

		var scrollTop = (force === true) ? self.lastScrollTop : self.$container[0].scrollTop;

		self.lastScrollTop = scrollTop;

		// A Check to throttle amounts of calculation by setting a threshold
		// The list is due to recalculation only if the differences of scrollTop and lastCheck is greater than a choiceHeight
		if(force !== true){
			if(!self._shouldRender(scrollTop)){
				return;
			}
		}

		var activeContainers   = [];
		var inactiveContainers = [];

		angular.forEach(self.lazyContainers, function(lazyContainer, index){
			var choiceTop = (lazyContainer.index) * self.options.choiceHeight || 0;

			if(force === true){
				lazyContainer.index = null;
			}

			// Check if the container is visible
			if(lazyContainer.index === null || choiceTop < scrollTop - self.options.choiceHeight || choiceTop > scrollTop + self.options.listHeight + self.options.choiceHeight){
				lazyContainer.element.addClass('inactive').removeClass('active');
				inactiveContainers.push(lazyContainer);
			}else{
				lazyContainer.element.addClass('active').removeClass('inactive');
				activeContainers.push(lazyContainer);
			}
		});

		var indexInDisplay = activeContainers.map(function(container){
			return container.index;
		});

		// Get the start and end index of all the choices that should be in the viewport at the current scroll position
		var indexToRenderStart = Math.floor(scrollTop / self.options.choiceHeight);
			indexToRenderStart = indexToRenderStart < 0 ? 0 : indexToRenderStart;

		var indexToRenderEnd = Math.ceil((scrollTop + self.options.listHeight) / self.options.choiceHeight);
			indexToRenderEnd = indexToRenderEnd >= self.choices.length ? self.choices.length : indexToRenderEnd;

		// Start rendering all missing indexs that is not in the viewport
		for(var i = indexToRenderStart; i < indexToRenderEnd; i++){
			if(indexInDisplay.indexOf(i) >= 0){
				continue;
			}else{
				// Get the next available lazy container
				var container = inactiveContainers.shift();

				if(container){
					container.element.addClass('active').removeClass('inactive');

					container.index = i;
					container.render(self.options.choiceHeight);

					angular.extend(container.scope, {
						$containerId : container.containerId,
						$index       : i
					});

					container.scope[self.options.scopeName] = self.choices[i];
				}
			}
		}

		self.$scope.$evalAsync();

		self.lastCheck = Math.floor(scrollTop/self.options.choiceHeight) * self.options.choiceHeight;
	};

	LazyScroller.prototype.initialize = function(tpl){
		var self = this;

		for(var i = 0; i < self.numLazyContainers; i++){
			var $choice = tpl.clone();

			// HACK
			var lazyScope = self.$scope.$new();
				lazyScope.$options = self.$scope.$options;
				lazyScope[self.options.scopeName] = {};

			$compile($choice)(lazyScope);

			self.lazyContainers.push(new LazyContainer({
				containerId : i,
				element     : $choice,
				scope       : lazyScope
			}));

			self.$list.append($choice);
		}

		self.bindScroll();
	};

	return LazyScroller;

}]);

Reselect.service('LazyContainer', [function(){

	var LazyContainer = function(options){
		var self = this;

		self.containerId = null;
		self.element     = null;
		self.index       = null;
		self.scope       = null;

		angular.extend(self, options);
	};

	LazyContainer.prototype.render = function(containerHeight){
		var self = this;

		if(!self.element && self.index === null){
			return;
		}

		self.element.css('top', (self.index * containerHeight) + 'px');
	};

	return LazyContainer;

}]);

Reselect.directive('reselectNoChoice', function(){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        templateUrl: 'templates/reselect-no-choice.directive.tpl.html'
    };
});

Reselect.value('reselectChoicesOptions', {
	noOptionsText: 'No Options'
});

Reselect.directive('triggerAtBottom', ['$parse', 'ReselectUtils', function($parse, ReselectUtils) {

	var height = function(elem) {
		elem = elem[0] || elem;
		if (isNaN(elem.offsetHeight)) {
			return elem.document.documentElement.clientHeight;
		} else {
			return elem.offsetHeight;
		}
	};

	return {
		restrict: 'A',
		link: function($scope, $element, $attrs) {

			var scrolling = false;

			var triggerFn = ReselectUtils.debounce(function(){
				$parse($attrs.triggerAtBottom)($scope);
			}, 150);

			function checkScrollbarPosition() {
				if (height($element) + $element[0].scrollTop === 0 && $element[0].scrollHeight === 0) {
					return;
				}

				if (height($element) + $element[0].scrollTop >= $element[0].scrollHeight - 30) {
					triggerFn();
				}
				scrolling = false;
			}

			$element.on('scroll', function() {
				if (!scrolling) {
					if (!window.requestAnimationFrame) {
						setTimeout(checkScrollbarPosition, 300);
					} else {
						window.requestAnimationFrame(checkScrollbarPosition);
					}
					scrolling = true;
				}
			});

			checkScrollbarPosition();
		}
	};
}]);

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile',
	'LazyScroller', 'LazyContainer', 'ReselectUtils', 'reselectChoicesOptions',
	function(ChoiceParser, $compile, LazyScroller, LazyContainer, ReselectUtils, reselectChoicesOptions) {
		return {
			restrict: 'AE',
			templateUrl: 'templates/reselect.options.directive.tpl.html',
			require: ['reselectChoices', '?^reselect'],
			transclude: true,
			replace: true,
			compile: function(element, attrs) {

				if (!attrs.options) {
					console.warn('[reselect-options] directive requires the [options] attribute.');
					return;
				}

				return function($scope, $element, $attrs, $ctrls, transcludeFn) {
					var $reselectChoices = $ctrls[0];
					var $Reselect = $ctrls[1];

					/**
					 * Manipulating the transluded html template taht is used to display
					 * each choice in the options list
					 */

					transcludeFn(function(clone, scope) {
						$reselectChoices.CHOICE_TEMPLATE.append(clone);
					});

					$reselectChoices.LazyDropdown.initialize($reselectChoices.CHOICE_TEMPLATE);
					$reselectChoices.LazyDropdown.renderContainer();
				};
			},
			controllerAs: '$options',
			controller: ['$scope', '$element', '$attrs', '$parse', '$http',
				'ReselectDataAdapter', 'ReselectAjaxDataAdapter',
				function($scope, $element, $attrs, $parse, $http, ReselectDataAdapter,
					ReselectAjaxDataAdapter) {
					var self = this;

					self.element = $element[0];
					self.$container = angular.element(self.element.querySelectorAll(
						'.reselect-options-container'));
					self.$list = angular.element(self.element.querySelectorAll(
						'.reselect-options-list'));

					self.choiceHeight = 36;
					self.listHeight = 300;

					self.search_term = '';
					self.remotePagination = {};

					self.haveChoices = false;

					self.CHOICE_TEMPLATE = angular.element(
						'<li class="reselect-option reselect-option-choice" ng-click="$options._selectChoice($containerId)"></li>'
					);
					self.CHOICE_TEMPLATE.attr('ng-class',
						'{\'reselect-option-choice--highlight\' : $options.activeIndex === $index }'
					);
					self.CHOICE_TEMPLATE.attr('ng-mouseenter',
						'$options.activeIndex = $index');
					self.CHOICE_TEMPLATE.attr('ng-mouseleave',
						'$options.activeIndex = null');

					var $Reselect = $element.controller('reselect');

					/**
					 * Options
					 */

					self.options = angular.extend({}, reselectChoicesOptions, $attrs.reselectChoices || {});

					self.options.noOptionsText = $attrs.noOptionsText || self.options.noOptionsText;

					/**
					 * Choices Functionalities
					 */

					self.DataAdapter = null;

					self.parsedOptions = ChoiceParser.parse($attrs.options);

					if ($attrs.remote) {
						self.remoteOptions = $parse($attrs.remote)($scope.$parent);

						self.DataAdapter = new ReselectAjaxDataAdapter(self.remoteOptions, self.parsedOptions);

						self.DataAdapter.prepareGetData = function(){
							self.DataAdapter.page = 1;
							self.DataAdapter.pagination = {};
							self.DataAdapter.updateData([]);
							self.render();
						};
					} else {
						self.DataAdapter = new ReselectDataAdapter();
						self.DataAdapter.updateData(self.parsedOptions.source($scope.$parent));

						self.DataAdapter.observe = function(onChange) {
							$scope.$watchCollection(function() {
								return self.parsedOptions.source($scope.$parent);
							}, function(newChoices) {
								self.DataAdapter.updateData(newChoices);
							});
						};

					}

					self.DataAdapter.init();

					self.getData = function(reset, loadingMore) {
						if(reset === true){
							self.DataAdapter.prepareGetData();
						}

						self.is_loading = true;

						self.DataAdapter.getData(self.search_term)
							.then(function(choices) {
								if(!self.search_term){
									self.DataAdapter.updateData(choices.data, loadingMore);
									self.render();
								}else{
									self.render(choices.data);
								}
							})
							.finally(function(){
								self.is_loading = false;
							});
					};

					self.loadMore = function() {
						if(!self.DataAdapter.pagination || !self.DataAdapter.pagination.more){
							return;
						}
						self.getData(false, true);
					};

					self.search = ReselectUtils.debounce(function(){
						self.getData(true, false);
					}, 300, false, function(){
						self.is_loading = true;
					});

					/**
					 * Lazy Containers
					 *
					 * The goal is to used the minimum amount of DOM elements (containers)
					 * to display large amounts of data. Containers are shuffled and repositioned
					 * whenever the options list is scrolled.
					 */

					self.LazyDropdown = new LazyScroller($scope, {
						scopeName: self.parsedOptions.itemName,
						container: self.$container,
						list: self.$list,
						choiceHeight: 36,
						listHeight: 300
					});

					/**
					 * An index to simply track the highlighted or selected option
					 */

					self.activeIndex = null;

					self._setActiveIndex = function(index) {
						self.activeIndex = index;
					};

					/**
					 * Using the container id that is passed in, find the actual value by $eval the [value=""]
					 * from the directive with the scope of the lazy container
					 */

					self._selectChoice = function(containerId) {
						var selectedScope = self.LazyDropdown.lazyContainers[containerId].scope;

						var value = angular.copy(self.parsedOptions.modelMapper(selectedScope));

						$Reselect.selectValue(value, selectedScope[self.parsedOptions.itemName]);
					};

					/**
					 * Rendering
					 */

					self.$parent = $element.parent();

					self.render = function(choices) {
						self.LazyDropdown.choices = choices || self.DataAdapter.data;


						if(self.LazyDropdown.choices && self.LazyDropdown.choices.length >= 0){
							// Check if choices is empty
							self.haveChoices = !!self.LazyDropdown.choices.length;

							var dimensions = self.LazyDropdown.renderContainer();
							self.LazyDropdown._calculateLazyRender(true);

							/**
							 * If the result's first page does not fill up
							 * the height of the dropdown, automatically fetch
							 * the next page
							 */

							if(self.LazyDropdown.choices && self.LazyDropdown.choices.length && (dimensions.containerHeight >= dimensions.choiceHeight)){
								self.loadMore();
							}
						}else{
							self.haveChoices = false;
						}
					};
				}
			]
		};
	}
]);

angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/lazy-container.tpl.html","<div class=\"reselect-dropdown\"><div class=\"reselect-options-container\"><div class=\"reselect-option reselect-option-choice\" ng-show=\"!$reselect.choices.length\">No Options</div><ul class=\"reselect-options-list\"></ul></div></div>");
$templateCache.put("templates/reselect-no-choice.directive.tpl.html","<div class=\"reselect-no-choice\" ng-transclude=\"\"></div>");
$templateCache.put("templates/reselect.choice.tpl.html","");
$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container reselect\" ng-keydown=\"$reselect.handleKeyDown($event)\"><input type=\"hidden\" value=\"{{ngModel}}\"><div class=\"reselect-selection\" tabindex=\"0\" focus-on=\"reselect.input.focus\" ng-class=\"{\'reselect-selection--active\' : $reselect.opened }\" ng-click=\"$reselect.toggleDropdown()\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-show=\"$reselect.value\"></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-show=\"!$reselect.value\" ng-bind=\"$reselect.rendered_placeholder\"></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div><div class=\"reselect-dropdown\" ng-class=\"{\'reselect-dropdown--opened\' : $reselect.opened }\"></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-choices\"><div class=\"reselect-search-container\"><input class=\"reselect-search-input\" type=\"text\" focus-on=\"reselect.search.focus\" placeholder=\"Type to search...\" ng-model=\"$options.search_term\" ng-change=\"$options.search()\"></div><div class=\"reselect-options-container\" ng-class=\"{\'reselect-options-container--autoheight\': !$options.DataAdapter.data.length && !$options.is_loading }\" trigger-at-bottom=\"$options.loadMore()\"><ul class=\"reselect-options-list\" ng-show=\"$options.DataAdapter.data.length\"></ul><div class=\"reselect-static-option reselect-empty-container\" ng-show=\"!$options.haveChoices && !$options.is_loading\"><div class=\"reselect-option reselect-option--static reselect-option-choice\">{{$options.options.noOptionsText}}</div></div><div class=\"reselect-option reselect-static-option reselect-option-loading\" ng-show=\"$options.is_loading\">Loading More</div></div></div>");}]);
/**
 * Service to parse choice "options" attribute
 *
 * Services credited to angular-ui team
 * https://github.com/angular-ui/ui-select/blob/master/src/uisRepeatParserService.js
 *
 */

Reselect.service('ChoiceParser', ['$parse', function($parse) {

	var self = this;

	/**
	 * Example:
	 * expression = "address in addresses | filter: {street: $select.search} track by $index"
	 * itemName = "address",
	 * source = "addresses | filter: {street: $select.search}",
	 * trackByExp = "$index",
	 */
	self.parse = function(expression) {


		var match;
		//var isObjectCollection = /\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)/.test(expression);
		// If an array is used as collection

		// if (isObjectCollection){
		// 000000000000000000000000000000111111111000000000000000222222222222220033333333333333333333330000444444444444444444000000000000000055555555555000000000000000000000066666666600000000
		match = expression.match(
			/^\s*(?:([\s\S]+?)\s+as\s+)?(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(\s*[\s\S]+?)?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/
		);

		// 1 Alias
		// 2 Item
		// 3 Key on (key,value)
		// 4 Value on (key,value)
		// 5 Source expression (including filters)
		// 6 Track by

		if (!match) {
			throw uiSelectMinErr('iexp',
				"Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
				expression);
		}

		var source = match[5],
			filters = '';

		// When using (key,value) ui-select requires filters to be extracted, since the object
		// is converted to an array for $select.items
		// (in which case the filters need to be reapplied)
		if (match[3]) {
			// Remove any enclosing parenthesis
			source = match[5].replace(/(^\()|(\)$)/g, '');
			// match all after | but not after ||
			var filterMatch = match[5].match(
				/^\s*(?:[\s\S]+?)(?:[^\|]|\|\|)+([\s\S]*)\s*$/);
			if (filterMatch && filterMatch[1].trim()) {
				filters = filterMatch[1];
				source = source.replace(filters, '');
			}
		}

		return {
			itemName: match[4] || match[2], // (lhs) Left-hand side,
			keyName: match[3], //for (key, value) syntax
			source: $parse(source),
			sourceItem: source,
			filters: filters,
			trackByExp: match[6],
			modelMapper: $parse(match[1] || match[4] || match[2]),
			repeatExpression: function(grouped) {
				var expression = this.itemName + ' in ' + (grouped ? '$group.items' :
					'$select.items');
				if (this.trackByExp) {
					expression += ' track by ' + this.trackByExp;
				}
				return expression;
			}
		};

	};

}]);


Reselect.factory('ReselectUtils', function(){
    var ReselectUtils = {
        debounce: function(func, wait, immediate, immediateFn) {
    		var timeout;
    		return function() {
    			var context = this, args = arguments;
    			var later = function() {
    				timeout = null;
    				if (!immediate) func.apply(context, args);
    			};
    			var callNow = immediate && !timeout;
    			clearTimeout(timeout);
    			timeout = setTimeout(later, wait);
    			if (callNow) func.apply(context, args);
                if (!timeout, immediateFn) immediateFn.apply(context, args);
    		};
    	}
    };

    return ReselectUtils;
});

Reselect.filter('rshighlight', ['$sce', function($sce){
    return function(target, str){
        var result, matches, re;
        var match_class = "reselect-text-match";

		re = new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
		if (!target) {
			return;
		}

		if (!str) {
			return target;
		}

		if (!target.match || !target.replace) {
			target = target.toString();
		}
		matches = target.match(re);
		if (matches) {
			result = target.replace(re, '<span class="' + match_class + '">' + matches[0] + '</span>');
		} else {
			result = target;
		}

		return $sce.trustAsHtml(result);
    };
}]);

Reselect.directive('focusOn', ['$timeout', function($timeout){
    return {
        restrict: 'A',
        link: function($scope, $elem, $attrs){
            $scope.$on($attrs.focusOn, function(){
                $timeout(function(){
                    $elem[0].focus();
                });
            });
        }
    };
}]);

/**
 * Common shared functionalities
 */

 Reselect.constant('KEYS', {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    CTRL: 17,
    ESC: 27,
    SPACE: 32,
    PAGEUP: 33,
    PAGEDOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    DELETE: 46
 });

}).apply(this);