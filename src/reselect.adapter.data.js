
Reselect.service('ReselectDataAdapter', [function(){

    var DataAdapter = function(){
        this.data = [];
    };

    DataAdapter.prototype.observe = function(){
        console.error('Not implemented');
        return;
    };

    DataAdapter.prototype.getData = function(){
        return this.data;
    };

    DataAdapter.prototype.updateData = function(newData, push){
        if(push === true){
            this.data.concat(newData);
        }else{
            this.data = newData;
        }

        return this.data;
    };

    return DataAdapter;
}]);

Reselect.service('ReselectAjaxDataAdapter', [function(){

    var DataAdapter = function(){
        this.data = [];

        this.observe();
    };

    DataAdapter.prototype.observe = function(){
        return;
    };

    DataAdapter.prototype.getData = function(){
        return this.data;
    };

    DataAdapter.prototype.updateData = function(newData, push){
        if(push === true){
            this.data.concat(newData);
        }else{
            this.data = newData;
        }

        return this.data;
    };

    return DataAdapter;
}]);
