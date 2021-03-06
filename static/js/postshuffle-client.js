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

function htmlRepresentation(text)
{
    // TODO: bbcode?
    return text.replace("<", "&lt;").replace(">", "&gt;").replace(/\r?\n/, "<br/>\r\n");
}

function addTagToQuery(tag)
{
    var new_tags_array = window.app.current_tags.concat([tag]);
    window.app.routes.navigate("t/" + new_tags_array.join("/"), {trigger: true});
}

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
        
        events: {
            'click .editComment': 'showEditUI',
            'click .deleteComment': 'deleteComment'
        },
        
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
          
            if (window.app.user)
            {
                if (
                    this.model.get('author').username == window.app.user.username ||
                    window.app.user.is_moderator ||
                    window.app.user.is_admin)
                {
                    this.$('.commentTools').css('display', 'block');
                    if (window.app.user.is_moderator ||
                        window.app.user.is_admin)
                    {
                        this.$('.userTools').css('display', 'inline');
                        if (window.app.user.is_admin)
                        {
                            this.$('.adminTools').css('display', 'inline');
                        }
                    }
                }
            }
            
            return this;
        },
        
        editTemplate: _.template($('#commentEditTemplate').html()),
        
        commentBodyOnlyTemplate: _.template("<%= htmlRepresentation(body) %>"),
        
        deleteComment: function() {
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
            this.$('.commentBody').empty();
            this.$('.commentBody').append(this.editTemplate(this.model.toJSON()));
            this.events['click .saveEditCommentButton'] = 'saveComment';
            this.events['click .cancelEditCommentButton'] = 'cancelEditComment';
            this.delegateEvents();
        },
        
        saveComment: function() {
            var self = this;
            var newBody = self.$('.editCommentBody').val();
            self.model.save('body', newBody, {
                sync: true,
                success: function() {
                    // Close functionality shared.
                    self.cancelEditComment();
                },
                error: function() { $('.internalErrorDialog').dialog("open"); }
            });
        },
        
        cancelEditComment: function() {
            delete this.events['click .saveEditCommentButton'];
            delete this.events['click .cancelEditCommentButton'];
            this.delegateEvents();
            this.$('.commentBody').empty();
            this.$('.commentBody').append(this.commentBodyOnlyTemplate(this.model.toJSON()));
        },
    });
    
    var PostView = Backbone.View.extend({
        
        tagName: 'li',
        
        className: 'post',
        
        events: {
            'click .postTitle': 'doExpandBody',
            'click .editPost': 'showEditUI',
            'click .deletePost': 'deletePost'
        },
        
        template: _.template($('#postTemplate').html()),
    
        editTemplate: _.template($('#postEditTemplate').html()),
        
        postBodyOnlyTemplate: _.template("<%= htmlRepresentation(body) %>"),
        
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
        
        doExpandBody: function() {
            window.app.routes.navigate("p/" + this.model.id, {trigger: true});    
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
                    window.app.user.is_admin)
                {
                    this.$('.postTools').css('display', 'block');
                }
                
                if (window.app.user.is_moderator ||
                    window.app.user.is_admin)
                {
                    this.$('.userTools').css('display', 'inline');
                    if (window.app.user.is_admin)
                    {
                        this.$('.adminTools').css('display', 'inline');
                    }
                }
            }
            
            this.events['click .postTitle'] = 'hideBody';
            this.delegateEvents();
            this.isExpanded = true;
        },
        
        hideBody: function() {
            this.$('.postBody').css('display', 'none');
            this.$('.postTools').css('display', 'none');
            this.events['click .postTitle'] = 'doExpandBody';
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
            'click .logoutLink': 'submitLogoutRequest',
            'click .selfTitle': 'makeTitleEditable',
            'click .editUserLink': 'toggleProfileEditor',
            'click .editButton': 'submitEditRequest'
        },
        
        render: function() {
          this.$el.html(this.template(window.app.user));
          return this;
        },
        
        toggleProfileEditor: function() {
            if (this.$('.profileDialog').css("display") != "block")
            {
                this.$('.profileDialog').css("display", "block");
            }
            else
            {
                this.$('.profileDialog').css("display", "none");
            }
        },
        
        submitEditRequest: function() {
            var password = this.$(".profilePasswordField").val();
            var email = this.$(".profileEmailField").val();
            var confirmPassword = this.$(".profileConfirmPasswordField").val();
            
            if (!email)
            {
                $( "#registrationMissingFieldsError" ).dialog("open");
            }
            else if (confirmPassword != password)
            {
                $( "#registrationMatchingFieldsError" ).dialog("open");
            }
            else
            {
                $.ajax('/user/set_profile', {
                    type: "POST",
                    data: {
                        password: password,
                        repeat_password: confirmPassword,
                        email: email
                    },
                    cache: false
                }).success(function(data, textStatus, xhr) {
                    if (data.status == "ok")
                    {
                        // register successful
                        $( "#profileEditSuccessfulMessage" ).dialog("open");
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
        
        makeTitleEditable: function() {
            this.$(".selfTitle").wrap(function() {
                return "<input class='selfTitleEditField' type='text' value='" + $(this).text() + "'>";
            });
            delete this.events['click .selfTitle'];
            this.events['keydown .selfTitleEditField'] = 'formKeyDown';
            this.delegateEvents();
        },
        
        formKeyDown: function(e) {
            if (e.which == 13)
            {
                this.submitTitleChangeRequest();
            }
        },
        
        submitTitleChangeRequest: function() {
            var title = $('.selfTitleEditField').val();
            var self = this;
            
            if (!title)
            {
                // TODO: correct dialog template.
                $( "#registrationMissingFieldsError" ).dialog("open");
            }
            else
            {
                $.ajax('/user/title', {
                    type: "POST",
                    data: {
                        title: title
                    },
                    cache: false
                }).success(function(data, textStatus, xhr) {
                    if (data.status == "ok")
                    {
                        // edit successful, unwrap text field
                        $(".selfTitle").unwrap();
                        $(".selfTitle").empty();
                        $(".selfTitle").text(title);
                        self.events['click .selfTitle'] = 'makeTitleEditable';
                        delete self.events['keydown .selfTitleEditField'];
                        self.delegateEvents();
                    }
                    else
                    {
                        $( "#communicationErrorDialog" ).dialog("open");
                    }
                }).error(function(xhr, textStatus, errorThrown) {
                    $( "#communicationErrorDialog" ).dialog("open");
                });
            }
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
            this.dontClear = true; // TBD
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
          window.postViews.push(view);
          this.$("#postList").append(view.render().el);
        },
        
        addAll: function() {
            var self = this;
            if (!self.dontClear)
            {
                self.$("#postList").empty();
            }
            else
            {
                self.dontClear = false;
            }
            window.postViews = [];
            if (window.Posts.length > 0)
            {
                window.Posts.each(self.addOne);
            }
            else
            {
                self.$("#postList").append(_.template($('#noPostTemplate').html()));
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

    var routes = Backbone.Router.extend({
        routes: {
            "": "index",
            "t/*tags": "index_tags",
            "p/:pid": "view_post"
        },
        
        index: function()
        {
            window.app.current_tags = [];
            this.fetch_common();
        },
        
        index_tags: function(tags)
        {
            window.app.current_tags = tags.split("/");
            this.fetch_common();
        },
        
        fetch_common: function()
        {
            window.Posts.fetch({
                data: {
                    offset: 0,
                    tag_list: window.app.current_tags}});
        },
        
        view_post: function(pid)
        {
            for (var postId in window.postViews)
            {
                var post = window.postViews[postId];
                if (post.model.id == pid)
                {
                    post.expandBody();
                    $('html, body').animate({
                        scrollTop: post.$el.offset().top
                    }, 1000);
                }
                else 
                {
                    post.hideBody();
                }
            }
        }
    });
    
    window.app = new PostListView();
    window.app.routes = new routes();
});

function loadInitialPosts(jsonData)
{
    window.Posts.reset(jsonData.posts);
    Backbone.history.start({pushState: true});
}

function loadUserData(jsonData)
{
    if (jsonData)
    {
        window.app.user = jsonData;
        window.app.loadAuthenticatedView();
    }
}