/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2016-06-08T00:39:10.797Z
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

Reselect.value('reselectDefaultOptions', {

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

			function transcludeAndAppend(target, destination, store, ctrl, replace){
				var $transcludeElement = $transcludeElems[0].querySelectorAll('.'+target+','+ '['+target+'],' + target);

				if($transcludeElement.length === 1){
					if(replace === true){
						angular.element($element[0].querySelector('.'+target)).replaceWith($transcludeElement);
					}else{
						angular.element($element[0].querySelectorAll(destination)).append($transcludeElement);
					}
				}else{
                    $transcludeElement = $element[0].querySelectorAll('.'+target);
                }

                if(store && ctrl){
                    $Reselect.transcludeCtrls[store] = angular.element($transcludeElement).controller(ctrl);
                    $Reselect.transcludeScopes[store] = angular.element($transcludeElement).scope();
                }
			}

			// Wrap array of transcluded elements in a <div> so we can run css queries
			$transcludeElems = angular.element('<div>').append($transcludeElems);

			// Transclude [reselect-choices] directive
			transcludeAndAppend('reselect-choices', '.reselect-dropdown', '$ReselectChoice', 'reselectChoices');
			transcludeAndAppend('reselect-no-choice', '.reselect-empty-container', null, null, true);
			transcludeAndAppend('reselect-placeholder', '.reselect-rendered-placeholder', '$ReselectPlaceholder', 'reselectPlaceholder', true);
			transcludeAndAppend('reselect-selection', '.reselect-rendered-selection', '$ReselectSelection', 'reselectSelection', true);

			// Transclude [reselect-no-choice] directive
            var $choice = $transcludeElems[0].querySelectorAll('.reselect-choice, [reselect-choice], reselect-choice');

            $Reselect.transcludeCtrls.$ReselectChoice.registerChoices($choice);

            $Reselect.$dropdown = angular.element($element[0].querySelector('.reselect-dropdown')).detach();
            $Reselect.$dropdown[0].style.top = '-999999px'; //

		},
		controllerAs: '$reselect',
		controller: ['$scope', '$element', '$attrs', '$parse', 'ReselectUtils', 'reselectDefaultOptions', '$timeout', '$window', 'KEYS', function($scope, $element, $attrs, $parse, ReselectUtils, reselectDefaultOptions, $timeout, $window, KEYS){

			var ctrl = this;
			var $ngModel = $element.controller('ngModel');

			// Options
			ctrl.options = angular.extend({}, reselectDefaultOptions, $parse($attrs.reselectOptions)($scope));

			// Variables
			ctrl.value = null;
			ctrl.opened = false;
			ctrl.isDropdownAbove = false;
			ctrl.transcludeCtrls = {};
			ctrl.transcludeScopes = {};

			ctrl.parsedChoices = null;
			ctrl.DataAdapter = null;

			ctrl.search_term = '';
			ctrl.isDisabled = false; // TODO
			ctrl.isFetching = false; // TODO
            ctrl.dropdownBuffer = 50; // Minimum distance between dropdown and viewport

            ctrl.$element  = $element[0];
            ctrl.$dropdown = null;

			/**
			 * Selection
			 */

			ctrl.selection_scope = {};
			ctrl.selection_scope.$selection = null;

			ctrl.renderSelection = function(state, $choice){
				ctrl.selection_scope.$selection = state;
				ctrl.selection_scope.$choice = $choice;

                $scope.$broadcast('reselect.renderselection', ctrl.selection_scope);
			};

			/**
			 * Controller Methods
			 */

			ctrl.selectValue = function(value, $choice){
				$ngModel.$setViewValue(value);

				ctrl.value = value;

				ctrl.renderSelection(ctrl.value, $choice || value);

                if(ctrl.opened) {
                    ctrl.hideDropdown();
                }
			};

			ctrl.clearSearch = function(){
				ctrl.search_term = '';
			};

			// Override ng-model render function
			$ngModel.$render = function(){
				var valueSelected = $ngModel.$viewValue;
				var valueToBeSelected;

                function mapModelValue(value){
                    var scp = {};
                    scp[ctrl.parsedOptions.itemName] = value;

                    return ctrl.parsedOptions.modelMapper(scp);
                }

				if(angular.isDefined(valueSelected)){
					var choices = ctrl.DataAdapter.data;
					var trackBy = ctrl.parsedOptions.trackByExp;

					var choiceMatch, valueSelectedMatch;

					if(choices && choices.length >= 0){
						for(var i = 0; i < choices.length; i++){
							if(!angular.isDefined(choices[i])){
								continue;
							}

							choiceMatch = mapModelValue(choices[i]);

							valueSelectedMatch = valueSelected;

							if(choiceMatch === valueSelectedMatch){
								valueToBeSelected = choices[i];
								break;
							}
						}
					}
				}


				if(valueToBeSelected){
					ctrl.selectValue($ngModel.$viewValue, valueToBeSelected);
				}else{
					/**
					 * Allow Invalid
					 *
					 * This options allows the select to try and resolve a possible
					 * value when an invalid value is set to the ng-model
					 */
					if(ctrl.options.allowInvalid === true){
						ctrl.selectValue(valueSelected);
					}else if(ctrl.options.allowInvalid && typeof ctrl.options.allowInvalid === 'function'){
						var validateDone = function(value){
							if(value !== undefined){
								ctrl.selectValue(mapModelValue(value), value);
							}else{
								ctrl.selectValue(undefined);
							}
						};

						ctrl.options.allowInvalid(valueSelected, validateDone);
					}else{
						ctrl.selectValue(undefined);
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
                   if (key === KEYS.ENTER || key === KEYS.SPACE || key === KEYS.UP || key === KEYS.DOWN) {
                     ctrl.showDropdown();

                     evt.preventDefault();
                   } else if(key === KEYS.ESC) {
                     $scope.$emit('reselect.input.blur');

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

                $scope.$safeApply(function() {
                    ctrl.hideDropdown(true);
                });

				angular.element(document).off('click', hideDropdownOnClick);
			}

			ctrl.showDropdown = function(){
				ctrl.opened = true;

				ctrl.transcludeCtrls.$ReselectChoice.getData(true).then(function() {
                    ctrl._positionDropdown();
                    ctrl._appendDropdown();
                });

				$scope.$emit('reselect.search.focus');

				angular.element(document).on('click', hideDropdownOnClick);
			};

			ctrl.hideDropdown = function(blurInput){
				ctrl.opened = false;

				// Clear search
				ctrl.clearSearch();

                if(!blurInput) {
                    $scope.$emit('reselect.input.focus');
                }
			};

            /**
            * Event Listeners
            */

            ctrl.bindEventListeners = function() {
                $scope.$on('reselect.hide', function(){
                    $scope.$safeApply(function(){
    					ctrl.hideDropdown();
    				});
                });
            };

            /**
			 * Position Dropdown
			 */

             ctrl._calculateDropdownPosition = function(dropdownHeight) {
                var $element  = ctrl.$element;
                var $dropdown = ctrl.$dropdown[0];

                var offset    = {
                    top: $element.offsetTop,
                    left: $element.offsetLeft,
                    bottom: $element.offsetTop + $element.clientHeight,
                    width: $element.offsetWidth
                };
                var input     = {
                    height: $element.clientHeight
                };
                var dropdown  = {
                    height: dropdownHeight
                };
                var viewport  = {
                  top: $window.scrollY,
                  bottom: $window.scrollY + $window.outerHeight
                };

                var enoughRoomAbove = viewport.top < ((offset.top - dropdown.height) + ctrl.dropdownBuffer);
                var enoughRoomBelow = viewport.bottom > (offset.bottom + dropdown.height + input.height + ctrl.dropdownBuffer);

                ctrl.isDropdownAbove = false;

                if (!enoughRoomBelow && enoughRoomAbove && !ctrl.isDropdownAbove) {
                  ctrl.isDropdownAbove = true;
                } else if (!enoughRoomAbove && enoughRoomBelow && ctrl.isDropdownAbove) {
                  ctrl.isDropdownAbove = false;
                }

                return offset;
             };
             ctrl._calculateDropdownHeight = function() {
                 var searchHeight   = ctrl.transcludeCtrls.$ReselectChoice.choiceHeight;
                 var listHeight     = ctrl.transcludeCtrls.$ReselectChoice.listHeight + searchHeight;
                 var choicesHeight  = ctrl.$dropdown[0].clientHeight;

                 return (choicesHeight >= listHeight) ? listHeight : choicesHeight;
             };
             ctrl._positionDropdown = function() {
                 var animationFrame = ReselectUtils.requstAnimFrame();

                 animationFrame(function() {
                     var dropdownHeight = ctrl._calculateDropdownHeight();
                     $scope.$safeApply(function() {
                         var element_offset = ctrl._calculateDropdownPosition(dropdownHeight);

                         ctrl.$dropdown[0].style.width = element_offset.width + 'px';
                         ctrl.$dropdown[0].style.top   = ctrl.isDropdownAbove ? element_offset.top - dropdownHeight + 'px' : element_offset.bottom + 'px';
                         ctrl.$dropdown[0].style.left  = element_offset.left + 'px';
                     });
                 });
             };
             ctrl._appendDropdown = function() {
                 return document.querySelector('body').appendChild(ctrl.$dropdown[0]);
             };

			/**
			 * Initialization
			 */

			ctrl.initialize = function(){
                ctrl.bindEventListeners();
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

                self.$scope.$apply();
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
						$index       : i,
                        cssClass     : self.choices[i] ? self.choices[i].class : ''
					});

                    if(self.choices[i] && self.choices[i].$sticky === true){
                        container.scope[self.options.scopeName] = self.choices[i].text;
                        container.scope.$onClick       = self.choices[i].onClick;
                        container.scope.$sticky        = self.choices[i].$sticky;
                        container.scope.$stickyContent = self.choices[i].$stickyContent;
                    }else{
                        container.scope[self.options.scopeName] = self.choices[i];
                        container.scope.$sticky        = false;
                    }

				}
			}
		}

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
	noOptionsText: 'No Options',
    choiceHeight: 36,
    listHeight:300
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
                    var animationFrame = ReselectUtils.requstAnimFrame();
                    animationFrame(checkScrollbarPosition);
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
						angular.element($reselectChoices.CHOICE_TEMPLATE[0].querySelectorAll('.reselect-option-choice-container')).append(clone);
					});

					$reselectChoices.LazyDropdown.initialize($reselectChoices.CHOICE_TEMPLATE);
					$reselectChoices.LazyDropdown.renderContainer();
				};
			},
			controllerAs: '$options',
			controller: ['$scope', '$element', '$attrs', '$parse', '$http', '$timeout',
				'ReselectDataAdapter', 'ReselectAjaxDataAdapter', 'KEYS',
				function($scope, $element, $attrs, $parse, $http, $timeout, ReselectDataAdapter,
					ReselectAjaxDataAdapter, KEYS) {

					var $Reselect = $element.controller('reselect');

					var self = this;

                    /**
					 * Options
					 */
					self.options = angular.extend({}, reselectChoicesOptions, $parse($attrs.reselectChoices)($scope) || {});

					self.options.noOptionsText = $attrs.noOptionsText || self.options.noOptionsText;

                    /**
                     * Variables
                     */
					self.element = $element[0];
					self.$container = angular.element(self.element.querySelectorAll(
						'.reselect-options-container'));
					self.$list = angular.element(self.element.querySelectorAll(
						'.reselect-options-list'));
                    self.$search = angular.element(self.element.querySelectorAll(
						'.reselect-search-input'));

					self.choiceHeight = self.options.choiceHeight;
					self.listHeight = self.options.listHeight;

					self.remotePagination = {};

					self.haveChoices = false;

					self.CHOICE_TEMPLATE = angular.element(
						'<li class="reselect-option reselect-option-choice" style="height: {{$options.choiceHeight}}px" ng-click="$options._selectChoice($index, $onClick)"></li>'
					);
                    self.CHOICE_TEMPLATE.append('<div class="reselect-option-choice-sticky" ng-show="$sticky === true" ng-bind-html="$stickyContent"></div>');
                    self.CHOICE_TEMPLATE.append('<div class="reselect-option-choice-container" ng-show="!$sticky"></div>');
					self.CHOICE_TEMPLATE.attr('ng-class',
						'[{\'reselect-option-choice--highlight\' : $options.activeIndex === $index, \'reselect-option-choice--selected\' : $options.selectedIndex === $index }, cssClass]'
					);
					self.CHOICE_TEMPLATE.attr('ng-mouseenter',
						'$options.activeIndex = $index');
					self.CHOICE_TEMPLATE.attr('ng-mouseleave',
						'$options.activeIndex = null');

                    /**
                     * Single Choice - Sticky Choices
                     */

                    self.stickyChoices = [];

                    self.registerChoices = function($choices){
                        angular.forEach($choices, function(choice){

                            choice = angular.element(choice);

                            var sticky = {
                                class         : choice.attr('class'),
                                $sticky       : true,
                                $stickyContent: choice.html()
                            };

                            if(choice.attr('ng-click')){
                                sticky.onClick = choice.attr('ng-click');
                            }

                            self.stickyChoices.push(sticky);
                        });
                    };

                    /**
                    * Keyboard Support
                    */

                    self.keydown = function(evt) {
                       var key = evt.which;

                       if (!key || evt.shiftKey || evt.altKey) {
                           return;
                       }

                       switch (key) {
                           case KEYS.ENTER:
                               $scope.$emit('reselect.select');

                               evt.stopPropagation();
                               evt.preventDefault();
                               break;
                           case KEYS.SPACE:
                               $scope.$emit('reselect.select');

                               evt.stopPropagation();
                               evt.preventDefault();
                               break;
                           case KEYS.UP:
                               $scope.$emit('reselect.previous');

                               evt.stopPropagation();
                               evt.preventDefault();
                               break;
                           case KEYS.DOWN:
                               $scope.$emit('reselect.next');

                               evt.stopPropagation();
                               evt.preventDefault();
                               break;
                           default:
                               break;
                       }
                    };

					/**
					 * Choices Functionalities
					 */

					$Reselect.parsedOptions = ChoiceParser.parse($attrs.options);

					if ($attrs.remote) {
						self.remoteOptions = $parse($attrs.remote)($scope.$parent);

						$Reselect.DataAdapter = new ReselectAjaxDataAdapter(self.remoteOptions, $Reselect.parsedOptions);

						$Reselect.DataAdapter.prepareGetData = function(){
							$Reselect.DataAdapter.page = 1;
							$Reselect.DataAdapter.pagination = {};
							$Reselect.DataAdapter.updateData([]);
							self.render();
						};
					} else {
						$Reselect.DataAdapter = new ReselectDataAdapter();
						$Reselect.DataAdapter.updateData($Reselect.parsedOptions.source($scope.$parent));

						$Reselect.DataAdapter.observe = function(onChange) {
							$scope.$watchCollection(function() {
								return $Reselect.parsedOptions.source($scope.$parent);
							}, function(newChoices) {
								$Reselect.DataAdapter.updateData(newChoices);
							});
						};

					}

					$Reselect.DataAdapter.init();

					self.getData = function(reset, loadingMore) {
						if(reset === true){
							$Reselect.DataAdapter.prepareGetData();
						}

						self.is_loading = true;

						return $Reselect.DataAdapter.getData($Reselect.search_term)
							.then(function(choices) {
								if(!$Reselect.search_term){
									$Reselect.DataAdapter.updateData(choices.data, loadingMore);
									self.render();
								}else{
									self.render(choices.data);
								}
							})
							.finally(function(){
								self.is_loading = false;
							});
					};

					/**
					 * Load More function
					 *
					 * This function gets run when the user scrolls to the bottom
					 * of the dropdown OR the data returned to reselect does not
                     * fill up the full height of the dropdown.
					 *
					 * This function also checks if remote option's onData
					 * returns pagination.more === true
					 */

					self.loadMore = function() {
						if(!$Reselect.DataAdapter.pagination || !$Reselect.DataAdapter.pagination.more){
							return;
						}
						self.getData(false, true);
					};

					/**
					 * Search
					 */

					self.search = ReselectUtils.debounce(function(){
						self.getData(true, false);
					}, 300, false, function(){
						self.is_loading = true;
					});

					/**
					 * Lazy Containers
					 *
					 * The goal is to use the minimal amount of DOM elements (containers)
					 * to display large amounts of data. Containers are shuffled and repositioned
					 * whenever the options list is scrolled.
					 */

					self.LazyDropdown = new LazyScroller($scope, {
						scopeName: $Reselect.parsedOptions.itemName,
						container: self.$container,
						list: self.$list,
						choiceHeight: self.choiceHeight,
						listHeight: self.listHeight
					});

					/**
					 * An index to simply track the highlighted or selected option
					 */

					self.activeIndex = null;
					self.selectedIndex = null;

					/**
					 * Using the container id that is passed in, find the actual value by $eval the [value=""]
					 * from the directive with the scope of the lazy container
					 */

                    self._selectChoice = function(choiceIndex, choiceOnClick) {

                        if(choiceOnClick){
                            $parse(choiceOnClick)($scope.$parent);
                            $Reselect.hideDropdown();
                        }else{
                            self.selectedIndex = choiceIndex;

                            var selectedChoiceIndex = choiceIndex;

                            var selectedScope = {};
                            selectedScope[$Reselect.parsedOptions.itemName] = self.LazyDropdown.choices[selectedChoiceIndex];
                            var value = angular.copy($Reselect.parsedOptions.modelMapper(selectedScope));
                            $Reselect.selectValue(value, selectedScope[$Reselect.parsedOptions.itemName]);
                        }
                    };

                    self.bindEventListeners = function() {

                        $scope.$on('reselect.select', function() {
                            self._selectChoice(self.activeIndex);
                        });

                        $scope.$on('reselect.next', function() {
                            var container_height = self.$container[0].offsetHeight;
                            var container_top    = self.$container[0].scrollTop;

                            if(self.activeIndex !== null) {
                                if(self.activeIndex < $Reselect.DataAdapter.data.length - 1) {
                                    self.activeIndex++;
                                }
                            } else {
                                self.activeIndex = 0; // Start at the first element
                            }

                            if((container_top + container_height) < ((self.activeIndex * self.choiceHeight) + self.choiceHeight)) {
                                self.$container[0].scrollTop = ((self.activeIndex * self.choiceHeight) - container_height) + self.choiceHeight;
                            }
                        });

                        $scope.$on('reselect.previous', function() {

                            var container_top = self.$container[0].scrollTop;

                            if(self.activeIndex) {
                                self.activeIndex--;
                            } else {
                                self.activeIndex = 0;
                            }

                            if(container_top > ((self.activeIndex * self.choiceHeight))) {
                                self.$container[0].scrollTop = container_top - self.choiceHeight;
                            }
                        });

                        self.$search.on('keydown', function (evt) {
                            if(evt.which === KEYS.SPACE) {
                                evt.stopPropagation();
                            }
                        });
                    };

					/**
					 * Rendering
					 *
					 * This function handles rendering the dropdown.
					 * Choices are passed along to LazyContainer which will
					 * handle the rendering of the data.
					 */

					self.render = function(choices) {
						self.LazyDropdown.choices = choices || $Reselect.DataAdapter.data;

                        self.LazyDropdown.choices = self.stickyChoices.concat(self.LazyDropdown.choices);

						if(self.LazyDropdown.choices && self.LazyDropdown.choices.length >= 0){
							// Check if choices is empty
							self.haveChoices = !!self.LazyDropdown.choices.length;

							// Render the dropdown depending on the numbers of choices
							var dimensions = self.LazyDropdown.renderContainer();

							/**
							 * LazyContainer's render function
							 * @param {Boolean} Force - force the LazyContainer to re-render
							 */
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

                    self.bindEventListeners();
				}
			]
		};
	}
]);

Reselect.directive('reselectPlaceholder', function(){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        templateUrl: 'templates/reselect.placeholder.tpl.html'
    };
});

Reselect.directive('reselectSelection', function(){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        templateUrl: 'templates/reselect.selection.tpl.html',
        scope: {},
        link: function($scope, $element, $attrs, ctrls, transclude){
            transclude($scope, function(clone){
                $element.append(clone);
            });
        },
        controller: ['$scope', function($scope){
            $scope.$selection = null;
            $scope.$choice = null;

            $scope.$on('reselect.renderselection', function(event, selection){
                angular.extend($scope, selection);
            });
        }]
    };
});

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

angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/lazy-container.tpl.html","<div class=\"reselect-dropdown\"><div class=\"reselect-options-container\"><div class=\"reselect-option reselect-option-choice\" ng-show=\"!$reselect.choices.length\">No Options</div><ul class=\"reselect-options-list\"></ul></div></div>");
$templateCache.put("templates/reselect-no-choice.directive.tpl.html","<div class=\"reselect-no-choice\" ng-transclude=\"\"></div>");
$templateCache.put("templates/reselect.choice.tpl.html","");
$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container reselect\" tabindex=\"0\" focus-on=\"reselect.input.focus\" blur-on=\"reselect.input.blur\" ng-keydown=\"$reselect.handleKeyDown($event)\"><input type=\"hidden\" value=\"{{ngModel}}\"><div class=\"reselect-selection-container\" ng-class=\"{\'reselect-selection--active\' : $reselect.opened }\" ng-click=\"$reselect.toggleDropdown()\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-show=\"$reselect.value\"><div class=\"reselect-selection\" reselect-selection=\"\"><span ng-bind=\"$selection\"></span></div></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-show=\"!$reselect.value\"><div class=\"reselect-placeholder\" reselect-placeholder=\"\">Please select an option</div></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div><div class=\"reselect-dropdown\" ng-class=\"{\'reselect-dropdown--opened\' : $reselect.opened, \'reselect-dropdown--above\': $reselect.isDropdownAbove, \'reselect-dropdown--below\': !$reselect.isDropdownAbove }\"></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-choices\" ng-keydown=\"$options.keydown($event)\"><div class=\"reselect-search-container\"><input class=\"reselect-search-input\" tabindex=\"-1\" type=\"text\" focus-on=\"reselect.search.focus\" placeholder=\"Type to search...\" ng-model=\"$reselect.search_term\" ng-change=\"$options.search()\"></div><div class=\"reselect-options-container\" ng-class=\"{\'reselect-options-container--autoheight\': !$options.LazyDropdown.choices.length && !$options.is_loading }\" trigger-at-bottom=\"$options.loadMore()\"><ul class=\"reselect-options-list\" ng-show=\"$options.LazyDropdown.choices.length\"></ul><div class=\"reselect-static-option reselect-empty-container\" ng-show=\"!$options.haveChoices && !$options.is_loading\"><div class=\"reselect-no-choice\" reselect-no-choice=\"\"><div class=\"reselect-option reselect-option--static reselect-option-choice\">{{$options.options.noOptionsText}}</div></div></div><div class=\"reselect-option reselect-static-option reselect-option-loading\" ng-show=\"$options.is_loading\">Loading More</div></div></div>");
$templateCache.put("templates/reselect.placeholder.tpl.html","<div class=\"reselect-placeholder\" ng-transclude=\"\"></div>");
$templateCache.put("templates/reselect.selection.tpl.html","<div class=\"reselect-selection\"></div>");}]);
Reselect.run(['$rootScope', '$http', function ($rootScope, $http) {
    $rootScope.$safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };
}]);

Reselect.factory('ReselectUtils', ['$timeout', function($timeout){
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
    	},
        requstAnimFrame: function() {
            return  (window.requestAnimationFrame   ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                $timeout);
        }
    };

    return ReselectUtils;
}]);

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

Reselect.directive('blurOn', ['$timeout', function($timeout){
    return {
        restrict: 'A',
        link: function($scope, $elem, $attrs){
            $scope.$on($attrs.blurOn, function(){
                $timeout(function(){
                    $elem[0].blur();
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