//Router
Router.configure({
    layoutTemplate: 'ApplicationLayout'
});

Router.route('/',function(){
    this.render('navbar', {
        to:"navbar"
    });
    
    this.render('website_list',{
        to:"main"
    });
});

Router.route('/website/:_id', function(){
    this.render('navbar', {
        to:"navbar"
    });
    this.render('website_detail',{
        to:"main",
        data:function(){
            return Websites.findOne({_id:this.params._id});
        }
    });
});


// Accounts config
Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
});


/////
// template helpers 
/////

// helper function that returns all available websites


Template.website_list.helpers({
    websites: function () {

        Meteor.subscribe("searchSite", Session.get("search/keyword"));
        
        return Websites.find({}, {sort: {up: -1, down:1, title:-1}});    

    },
    
 
});

Template.website_item.helpers({
    formatDate:function(date){
        if(date)
            return moment(date).format("HH:mm MMM-DD-YYYY");
        else{return undefined;}
    },
    
    getOP: function(user_id){
        var u = Meteor.users.findOne({_id:user_id});
        if(u){
            return u.username;
        }
        else{
            return "DEFAULT";
        }
    }
});

Template.website_detail.helpers({
    
    getComments:function(website_id){
        Meteor.subscribe("searchSite", null);
        var w = Websites.findOne({_id:website_id});
        if(w && w.comments && w.comments != []){
            return w.comments;
        }else{
            return [{user:" ",comment:"No comments"}];    
        }
        
    },
    
    getOP:function(user_id){
        var u = Meteor.users.findOne({_id:user_id});
        if(u){
            return u.username;    
        }else{
            return "DEFAULT";
        }
        
    },
    
    getUsername:function(user_id){
        var u = Meteor.users.findOne({_id:user_id});
        if(u){
            return u.username;    
        }
        
    },
    
    formatDate:function(date){
        if(date)
            return moment(date).format("HH:mm MMM-DD-YYYY");
        else{return undefined;}
    },
    
    commentDate:function(date){
        if(date){
            return moment(date).format("MMM-DD HH:mm");
        }else{
            return undefined;
        }
    }
});

Template.recommended.helpers({
    recommendedWebsites:function(){
        var currentUser = Meteor.user();
        if(currentUser && currentUser.profile){
            var upSites = currentUser.profile.upvotedSites;
            if(upSites != []){
                var keywords = "";
                upSites.forEach(function(site_id){
                    
                    var aSite = Websites.findOne({_id:site_id});
                    if(aSite){
                        keywords =  keywords + aSite.title + " ";
                      
                    }
                    
                });
                
                keywords = keywords.trim();
                
                var keywordsList = keywords.split(" ");
                //console.log(keywordsList);
                var reKeywords = new RegExp(keywordsList.join("|"), "i");
               
               
                var queryResult = Websites.find({$or:
                                      [
                                          {title:reKeywords},
                                          {description:reKeywords}
                                      ]}).fetch();
                return  queryResult;
            }
        }
    }
});


/////
// template events 
/////


Template.website_item.events({

    "click .js-upvote": function (event) {
        
        // If user is logged in
        if (Meteor.user()) {
            var website_id = this._id;
            // put the code in here to add a vote to a website!
            var w = Websites.findOne({_id:website_id});

            var userprofile = Meteor.user().profile;
            
            if(!userprofile){
                Meteor.users.update({_id:Meteor.user()._id},{$set:{profile:{upvotedSites:[website_id]}}});    
            }
            else{
                
                var allUpSites = userprofile.upvotedSites;
                
                if(allUpSites.indexOf(website_id) == -1){
                    allUpSites.unshift(website_id);
                
                    Meteor.users.update({_id:Meteor.user()._id},{$set:{"profile.upvotedSites":allUpSites}}); 
                }
            }            
            
            Websites.update({_id:website_id}, {$set:{up:w.up + 1}});
            
        }
        
        
        return false;// prevent the button from reloading the page
    }, 
    
    "click .js-downvote":function(event){

        // example of how you can access the id for the website in the database
        // (this is the data context for the template)
        if(Meteor.user()){
            var website_id = this._id;
            // put the code in here to remove a vote from a website!

            var w = Websites.findOne({_id:website_id});
           
            Websites.update({_id:website_id}, {$set:{down:w.down+1}});
        }
       
        
        return false;// prevent the button from reloading the page
    },

})

Template.navbar.events({
    'submit .js-nav-search':function(event){
        
        var search = event.target.search.value;
        if(search.trim() != ""){
            Router.go('/');
            $("#search").val('');
            search = search.replace(/\s\s+/g, ' ');    
            
            Session.set('search/keyword', search);

            $('#clear').html('<a href="#" class="js-clear-search">Clear Search <span class="glyphicon glyphicon-remove"></span></a>');

        
        }
        return false;
    },
    
    "click .js-clear-search":function(event){
        
        Session.set('search/keyword', null);
        
        $('#clear').html('');

    },
});

Template.website_form.events({
    "click .js-toggle-website-form":function(event){
        $("#website_form").toggle('slow');
    }, 
    "submit .js-save-website-form":function(event){
        
        //  put your website saving code in here!	

        // If the user is logged in
        if(Meteor.user()){
            var url = event.target.url.value;
            var title = event.target.title.value;
            var des = event.target.description.value;
            
            try{   
                // Get website header/content via http request
                Meteor.call('getInfo',url,{},function(error,response){
                    if(error){
                        $('#err').text("Invalid URL.");
                    }
                    else{

                        var content = response.content;
                        if(title.trim() == ""){
                            title = $(content).filter('title').text();       
                        }

                        if(des.trim() == ""){
                            var meta = $(content).filter('meta[name=description]');

                            if(meta[0]){ des = meta[0].content; }
                            else{ des = "No description." }

                        }

                        // Add website to database
                        Websites.insert({
                            url:url,
                            title:title,
                            description:des,
                            up:0,
                            down:0,
                            comments:[],
                            createdOn:new Date(),
                            createdBy:Meteor.user()._id
                        });

                        $('#err').text("");

                        $("#website_form").toggle('slow');
                    }
                }); // Meteor call 
           
            } catch(e){};
        }
        return false;// stop the form submit from reloading the page

    }
});


Template.website_detail.events({
    'submit .js-post-comment':function(event){
        var comment;
        var website_id = this._id;
        comment = event.target.aComment.value;
        
        // If the user is logged in
        if(Meteor.user() && comment.trim() != ""){      
            
            var commenter = Meteor.user()._id;
              
            var commentData = {comment:comment, user:commenter, date:new Date()};
            
            var w = Websites.findOne({_id:website_id});           
                     
            var allComments = w.comments;
            if(allComments){
                allComments.unshift(commentData);   
                Websites.update({_id:website_id},{$set:{comments:allComments}});
            }
            else{
                Websites.update({_id:website_id},{$set:{comments:[commentData]}});
            }
         
        }
        
        $('#aComment').val("");

       return false;
    }
});