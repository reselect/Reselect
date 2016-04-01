
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

    DataAdapter.prototype.getData = function(){
        var defer = $q.defer();

        defer.resolve({
            data: this.data
        });

        return defer.promise;
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
        this.observe(this.updateData.bind(this));
    };

    return DataAdapter;
}]);

Reselect.service('ReselectAjaxDataAdapter', ['$http', function($http){

    var DataAdapter = function(remoteOptions){
        this.data = [];
        this.page = 1;
        this.pagination = {};

        this.options = remoteOptions;
    };

    DataAdapter.prototype.observe = function(){
        return;
    };

    DataAdapter.prototype.prepareGetData = function(){
        return;
    };

    DataAdapter.prototype.getData = function(search_term){
        var self = this;

        var params = this.options.params({
            page       : this.page,
            search_term: search_term
        }, self.pagination);

        return $http.get(this.options.endpoint, {
            params: params
        })
            .then(function(res){
                return res.data;
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

    DataAdapter.prototype.updateData = function(existingData, newData, push){
        if(push === true){
            existingData = existingData.concat(newData);
        }else{
            existingData = newData;
        }

        return existingData;
    };

    DataAdapter.prototype.init = function(){
    };

    return DataAdapter;
}]);
