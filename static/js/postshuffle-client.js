// postShuffle -- web forum software for node.js
// Copyright (c) 2012 Mooneer Salem

// Set up AJAX spinner.
$.ajaxSetup({
    beforeSend:function(){
        // show gif here, eg:
        $("#spinner").show();
    },
    complete:function(){
        // hide gif here, eg:
        $("#spinner").hide();
    }
});

$(function(){
    
    var Post = Backbone.Model.extend({
        
        defaults: function() {
            return {
                'tags': [],
                'title': '',
                'author': {
                    'username': '',
                    'title': '',
                    'is_moderator': false,
                    'is_admin': false,
                    'joined': new Date()
                },
                'body': '',
                'id': '',
                'create_date': new Date(),
                'update_date': new Date(),
                'num_comments': 0
            };
        },
        
        parse: function(resp, xhr) {
            return resp.result || resp;
        },
        
        initialize: function() { },
        
    });
    
    var Comment = Backbone.Model.extend({
        
        defaults: function() {
            return {
                'author': {
                    'username': '',
                    'title': '',
                    'is_moderator': false,
                    'is_admin': false,
                    'joined': new Date()
                },
                'body': '',
                'id': '',
                'create_date': new Date(),
                'update_date': new Date()
            };
        },
        
        parse: function(resp, xhr) {
            return resp.result || resp;
        },
        
        initialize: function() { },
        
    });
    
    var PostList = Backbone.Collection.extend({
        
        model: Post,
        
        url: '/post',
        
        parse: function(resp, xhr) {
            return resp.result.posts;
        },
        
        comparator: function(obj, obj2) {
            var d1 = new Date(obj.get('create_date')).valueOf();
            var d2 = new Date(obj2.get('create_date')).valueOf();
            if (d1 == d2) return 0;
            else if (d1 < d2) return 1;
            else return -1;
        }
    });
    
    var CommentList = Backbone.Collection.extend({
        
        model: Comment,
        
        url: function() {
            return "/comment/" + this.post_id;
        },
        
        parse: function(resp, xhr) {
            return resp.result.comments;
        },
        
        comparator: function(obj, obj2) {
            var d1 = new Date(obj.get('create_date')).valueOf();
            var d2 = new Date(obj2.get('create_date')).valueOf();
            if (d1 == d2) return 0;
            else if (d1 < d2) return 1;
            else return -1;
        }
    });
    
    window.Posts = new PostList();
    
    var CommentView = Backbone.View.extend({
        tagName: 'li',
        
        className: 'comment',
        
        events: { /* TBD */ },
        
        template: _.template($('#commentTemplate').html()),
        
        initialize: function() {
          this.model.bind('change', this.render, this);
          this.model.bind('destroy', this.remove, this);
        },
        
        clear: function() {
          this.model.clear();
        },
        
        render: function() {
          this.$el.html(this.template(this.model.toJSON()));
          return this;
        }
    });
    
    var PostView = Backbone.View.extend({
        
        tagName: 'li',
        
        className: 'post',
        
        events: {
            'click .postTitle': 'expandBody',
            'click .editPost': 'showEditUI',
            'click .deletePost': 'deletePost'
        },
        
        template: _.template($('#postTemplate').html()),
    
        editTemplate: _.template($('#postEditTemplate').html()),
        
        postBodyOnlyTemplate: _.template("<%- body %>"),
        
        initialize: function() {
          this.model.bind('change', this.render, this);
          this.model.bind('destroy', this.remove, this);
        },
        
        clear: function() {
          this.model.clear();
        },
        
        render: function() {
            if (!this.isExpanded)
            {
                // Suppress re-render if expanded.
                this.$el.html(this.template(this.model.toJSON()));
            }
            return this;
        },
        
        deletePost: function() {
            // TODO: localization
            if (window.confirm("Are you sure?"))
            {
                this.model.destroy({
                    sync: true,
                    error: function() { $('.internalErrorDialog').dialog("open"); }
                });
            }
        },
        
        showEditUI: function() {
            this.$('.bodyText').empty();
            this.$('.bodyText').append(this.editTemplate(this.model.toJSON()));
            this.events['click .saveEditPostButton'] = 'savePost';
            this.events['click .cancelEditPostButton'] = 'cancelEditPost';
            this.delegateEvents();
        },
        
        savePost: function() {
            var self = this;
            var newBody = self.$('.editPostBody').val();
            self.model.save('body', newBody, {
                sync: true,
                success: function() {
                    // Close functionality shared.
                    self.cancelEditPost();
                },
                error: function() { $('.internalErrorDialog').dialog("open"); }
            });
        },
        
        cancelEditPost: function() {
            delete this.events['click .saveEditPostButton'];
            delete this.events['click .cancelEditPostButton'];
            this.delegateEvents();
            this.$('.bodyText').empty();
            this.$('.bodyText').append(this.postBodyOnlyTemplate(this.model.toJSON()));
        },
        
        expandBody: function() {
            if (!this.commentView)
            {
                this.commentView = new CommentListView({
                    el: this.$('.commentBlock')
                });
                this.commentView.comments.post_id = this.model.id;
            }
            this.commentView.comments.fetch({wait: true});
            
            this.$('.postBody').css('display', 'block');
            
            if (window.app.user)
            {
                if (
                    this.model.get('author').username == window.app.user.username ||
                    window.app.user.is_moderator ||
                    window.app.user.is_administrator)
                {
                    this.$('.postTools').css('display', 'block');
                }
            }
            
            this.events['click .postTitle'] = 'hideBody';
            this.delegateEvents();
            this.isExpanded = true;
        },
        
        hideBody: function() {
            this.$('.postBody').css('display', 'none');
            this.$('.postTools').css('display', 'none');
            this.events['click .postTitle'] = 'expandBody';
            this.delegateEvents();
            this.isExpanded = false;
        }
    });
    
    var CommentListView = Backbone.View.extend({
        
        initialize: function() {            
            this.comments = new CommentList;
            this.comments.bind('add', this.addOne, this);
            this.comments.bind('reset', this.addAll, this);
            this.comments.bind('all', this.render, this);
        },
    
        events: {
            'click .addCommentButton': 'submitNewComment',
            'click .moreLink': 'loadMore',
        },
        
        render: function() {
            if (!window.app.user)
            {
                this.$(".commentForm").css("display", "none");
            }
            return this;
        },
        
        loadMore: function() {
            this.comments.fetch({
                data: {offset: this.comments.length},
                add: true});
        },
        
        submitNewComment: function() {
            var commentBodyField = this.$(".commentForm .commentBodyField");
            this.comments.create({
                body: commentBodyField.val(),
                create_date: new Date(), // needed to ensure correct ordering
            }, {wait: true});
        },
        
        addOne: function(item) {
            var self = this;
            var view = new CommentView({model: item});
            self.$(".comments").append(view.render().el);
        },
        
        addAll: function() {
            var self = this;
            
            self.$(".comments").empty();
            if (self.comments.length > 0)
            {
                for (var i = 0; i < self.comments.length; i++)
                {
                    self.addOne(self.comments.at(i));
                }
            }
            else
            {
                //this.$("#postList").append(_.template($('#noPostTemplate').html()));
            }
        },
        
        clearCompleted: function() {
          _.each(this.comments.done(), function(post){ post.clear(); });
          return false;
        }
    
    });
    
    var UnauthenticatedTopView = Backbone.View.extend({
        el: $("#topbar"),
        
        template: _.template($('#loginBarTemplate').html()),
        
        initialize: function() {
            this.render();
        },
        
        events: {
            'click .loginButton': 'submitLoginRequest',
            'click .registerLink': 'toggleRegisterBox',
            'click .registerButton': 'submitRegistrationRequest',
            'keydown .usernameField': 'formKeyDown',
            'keydown .passwordField': 'formKeyDown'
        },
        
        render: function() {
          this.$el.html(this.template());
          return this;
        },
        
        formKeyDown: function(e) {
            if (e.which == 13)
            {
                this.submitLoginRequest();
            }
        },
        
        toggleRegisterBox: function() {
            if (this.$('.registerDialog').css("display") != "block")
            {
                this.$('.registerDialog').css("display", "block");
            }
            else
            {
                this.$('.registerDialog').css("display", "none");
            }
        },
        
        submitRegistrationRequest: function() {
            var username = this.$(".registerUsernameField").val();
            var password = this.$(".registerPasswordField").val();
            var email = this.$(".registerEmailField").val();
            var confirmPassword = this.$(".registerConfirmPasswordField").val();
            var confirmEmail = this.$(".registerConfirmEmailField").val();
            
            if (!username || !password || !email || !confirmPassword ||
                !confirmEmail)
            {
                $( "#registrationMissingFieldsError" ).dialog("open");
            }
            else if (confirmEmail != email || confirmPassword != password)
            {
                $( "#registrationMatchingFieldsError" ).dialog("open");
            }
            else
            {
                $.ajax('/user/register', {
                    type: "POST",
                    data: {
                        username: username,
                        password: password,
                        email: email
                    },
                    cache: false
                }).success(function(data, textStatus, xhr) {
                    if (data.status == "ok")
                    {
                        // register successful
                        $( "#registrationSuccessfulMessage" ).dialog("open");
                    }
                    else
                    {
                        $( "#internalErrorDialog" ).dialog("open");
                    }
                }).error(function(xhr, textStatus, errorThrown) {
                    $( "#communicationErrorDialog" ).dialog("open");
                });
            }
        },
        
        submitLoginRequest: function() {
            var username = this.$(".usernameField").val();
            var password = this.$(".passwordField").val();
            
            if (!username || !password)
            {
                // TODO: correct dialog template.
                $( "#registrationMissingFieldsError" ).dialog("open");
            }
            else
            {
                $.ajax('/user/login', {
                    type: "GET",
                    data: {
                        username: username,
                        password: password
                    },
                    cache: false
                }).success(function(data, textStatus, xhr) {
                    if (data.status == "ok")
                    {
                        // login successful, reload page.
                        window.location.reload();
                    }
                    else
                    {
                        $( "#loginErrorDialog" ).dialog("open");
                    }
                }).error(function(xhr, textStatus, errorThrown) {
                    $( "#communicationErrorDialog" ).dialog("open");
                });
            }
        },
        
        submitPasswordResetRequest: function() {
            var username = this.$(".usernameField").val();
            
            if (!username)
            {
                // TODO: correct dialog template.
                $( "#registrationMissingFieldsError" ).dialog("open");
            }
            else
            {
                $.ajax('/user/reset_password', {
                    type: "POST",
                    data: {
                        username: username
                    },
                    cache: false
                }).success(function(data, textStatus, xhr) {
                    if (data.status == "ok")
                    {
                        // reset successful.
                        $( "#resetSuccessfulMessage" ).dialog("open");
                    }
                    else
                    {
                        $( "#internalErrorDialog" ).dialog("open");
                    }
                }).error(function(xhr, textStatus, errorThrown) {
                    $( "#communicationErrorDialog" ).dialog("open");
                });
            }
        }
    });
    
    var AuthenticatedTopView = Backbone.View.extend({
        el: $("#topbar"),
        
        template: _.template($('#userBarTemplate').html()),
        
        initialize: function() {
            this.render();
        },
        
        events: {
            'click .logoutLink': 'submitLogoutRequest'
        },
        
        render: function() {
          this.$el.html(this.template(window.app.user));
          return this;
        },
        
        submitLogoutRequest: function() {
            $.ajax('/user/logout', {
                type: "GET",
                cache: false
            }).success(function(data, textStatus, xhr) {
                if (data.status == "ok")
                {
                    // logout successful, reload page.
                    window.location.reload();
                }
                else
                {
                    $( "#internalErrorDialog" ).dialog("open");
                }
            }).error(function(xhr, textStatus, errorThrown) {
                $( "#communicationErrorDialog" ).dialog("open");
            });
        }
    });
    
    var PostListView = Backbone.View.extend({
        
        el: $("#app"),
        
        initialize: function() {
    
            window.Posts.bind('add', this.addOne, this);
            window.Posts.bind('reset', this.addAll, this);
            window.Posts.bind('all', this.render, this);
    
            // Default to unauthenticated view unless bootstrapped otherwise.
            this.topView = new UnauthenticatedTopView();
        },
    
        events: {
            'click .addPostButton': 'submitNewPost',
            'click .moreLink': 'loadMore',
        },
        
        render: function() {
            if (!window.app.user)
            {
                this.$("#newPostForm").css("display", "none");
            }
            return this;
        },
        
        loadMore: function() {
            window.Posts.fetch({
                data: {offset: window.Posts.length},
                add: true});
        },
        
        submitNewPost: function() {
            var tag_list_html = $("#newPostForm .postTags li");
            var tags = [];
            for (var i in tag_list_html)
            {
                tags.push(tag_list_html[i].innerText);
            }
            
            window.Posts.create({
                title: $('#newPostForm #title').val(),
                body: $('#newPostForm #body').val(),
                create_date: new Date(), // needed to ensure correct ordering
                tags: tags
            }, {wait: true});
        },
        
        addOne: function(item) {
          var view = new PostView({model: item});
          this.$("#postList").append(view.render().el);
        },
        
        addAll: function() {
            if (window.Posts.length > 0)
            {
                window.Posts.each(this.addOne);
            }
            else
            {
                this.$("#postList").append(_.template($('#noPostTemplate').html()));
            }
        },
        
        clearCompleted: function() {
          _.each(window.Posts.done(), function(post){ post.clear(); });
          return false;
        },
    
        loadAuthenticatedView: function() {
            this.topView.$el.empty();
            this.topView = new AuthenticatedTopView();
        }
    });

    window.app = new PostListView();
});

function loadInitialPosts(jsonData)
{
    window.Posts.reset(jsonData.posts);
}

function loadUserData(jsonData)
{
    if (jsonData)
    {
        window.app.user = jsonData;
        window.app.loadAuthenticatedView();
    }
}