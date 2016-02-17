Websites._ensureIndex({"title":"text","description":"text","url":"text"});
Meteor.methods({
    'getInfo' : function(url,options){
        return HTTP.call('GET',url,options);
    }
});


Meteor.publish("searchSite", function(searchValue) {
  if (!searchValue) {
    return Websites.find({});
  }else{
    return Websites.find({ $text: {$search: searchValue}});    
  }
  
});
