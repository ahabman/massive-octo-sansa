Nodes = new Meteor.Collection("nodes");
Edges = new Meteor.Collection("edges");

if (Meteor.isClient) {

  Meteor.startup(function () {
  });

  Template.create_node.events({
    'click input[type=submit]' : function () { // template data, if any, is available in 'this'

      new_node_name = $('#new_node_name')
      Nodes.insert({
        name: new_node_name.val(),
        time: Date.now()
      });

      new_node_name.html('')
    }
  });

  Template.nodes.nodes = function(){
      return Nodes.find({}, { sort: { time: -1 }});
  }

  Template.node.events({
    'click .update' : function(){
      new_name = $('#'+this._id+ ' .name').html()
      Nodes.update( { '_id' : this._id}, {$set: {name: new_name}} );
      return false;
    },

    'click .delete' : function(){
      Nodes.remove( { '_id' : this._id} )
      return false;
    }
  })
}

if (Meteor.isServer) {

  Meteor.publish("all-nodes", function () {
    return Nodes.find(); // everything
  });
  Meteor.publish("all-edges", function () {
    return Edges.find(); // everything
  });
}