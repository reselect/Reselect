
Reselect.service('ReselectDataAdapter', ['$q', function($q){

    var DataAdapter = function(){
        this.data = [];
        this.groupByFn = null;
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

        if(self.cached){
            choices = this.cached;
        }else{
            choices = self.groupData(this.data);
        }

        defer.resolve({
            data: choices
        });

        self.cached = choices;

        return defer.promise;
    };

    DataAdapter.prototype.groupData = function(choices){
        var self = this;

        // Filter choices by group by function
        // TODO: Optmize this to run once per unique data collection
        if(self.groupByFn && typeof self.groupByFn === 'function'){
            var groupMap = {};
            var groupedChoices = [];
            var finalChoices = [];

            angular.forEach(choices, function(choice){
                if(choice.$$group){
                    return;
                }
                var groupId = self.groupByFn(choice);
                var groupIndex;

                if(!angular.isDefined(groupMap[groupId])){
                    groupIndex = groupedChoices.length;
                    groupMap[groupId] = groupIndex;
                    groupMap[groupIndex] = groupId;

                    groupedChoices[groupIndex] = [];
                    groupedChoices[groupIndex].push(choice);
                }else{
                    groupIndex = groupMap[groupId];
                    groupedChoices[groupIndex].push(choice);
                }
            });

            angular.forEach(groupedChoices, function(groupedChoice, index){
                if(groupMap[index] !== undefined){
                    finalChoices.push({
                        $$group: groupMap[index]
                    });
                }

                finalChoices = finalChoices.concat(groupedChoice);
            });

            choices = finalChoices;
        }

        return choices;
    };

    DataAdapter.prototype.updateData = function(newData){
        this.cached = false;
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
        this.groupByFn = null;
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
            .then(function (choices) {
                return self.options.onData(choices, params);
            })
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
