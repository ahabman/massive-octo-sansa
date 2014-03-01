/*

TODO
=========================
edge autocomplete search
update node arbitrary structure
node type
delete cleanup dependent things 

*/

Nodes = new Meteor.Collection("nodes");
Edges = new Meteor.Collection("edges");

if (Meteor.isClient) {

  $('#create_node_add_kv_pair').live('click', function(){
    console.log('cl');
    $('#kv_pair_template').clone().removeAttr('id').show().prependTo( $('.kv_pairs_container') )
    return false;
  })

  var nodes_for_graph
  var edges_for_graph

  Meteor.startup(function () {
    Meteor.setTimeout(draw_graph, 1000) 
  });

  Meteor.subscribe("all-nodes", function() {});
  Meteor.subscribe("all-edges", function() {});

  Template.create_node.events({
    'click input[type=submit]' : function () { 

      new_node_name = $('#new_node_name')
      node_object = {
        name: new_node_name.val(),
        time: Date.now()
      }

      key_value_pairs = $('.kv_pairs_container .kv_pair')
      for (var i = 0, len = key_value_pairs.length-1; i <= len; i++) {
        kv_pair = key_value_pairs.eq(i)
        key = kv_pair.find('.create_node_add_key').val()
        value = kv_pair.find('.create_node_add_value').val()
        console.log(key, value);
        node_object[key] = value;
      };



      Nodes.insert( node_object );

      new_node_name.val('')
      draw_graph();
    } 
  });

  Template.nodes.nodes = function(){
      return Nodes.find({}, { sort: { time: -1 }});
  }

  Template.node.events({
    'click .update' : function(){
      new_name = $('#'+this._id+ ' .name').html()
      Nodes.update( { '_id' : this._id}, {$set: {name: new_name}} );
      draw_graph();
      return false;
    },

    'click .delete' : function(){
      Nodes.remove( { '_id' : this._id} )
      draw_graph();
      return false;
    },

    'click .full' : function(){
      node = Nodes.findOne( { '_id' : this._id} )
      full(node);
      return false;
    } 
  })



  Template.create_edge.events({
    'click input[type=submit]' : function () { // template data, if any, is available in 'this'

      create_edge_n1_id = $('#create_edge_n1_id')
      create_edge_n2_id = $('#create_edge_n2_id')
      create_edge_name = $('#create_edge_name')

      Edges.insert({
        n1: create_edge_n1_id.val(),
        n2: create_edge_n2_id.val(),
        name: create_edge_name.val(),
        time: Date.now()
      });

      create_edge_n1_id.val('')
      create_edge_n2_id.val('')
      create_edge_name.val('')
      draw_graph();
    },

  });

  Template.edges.edges = function(){
      return Edges.find({}, { sort: { time: -1 }});
  }
  Template.edges.events({
    'click .update' : function(){
      new_name = $('#'+this._id+ ' .name').html()
      Edges.update( { '_id' : this._id}, {$set: {name: new_name}} );
      draw_graph();
      return false;
    },

    'click .delete' : function(){
      Edges.remove( { '_id' : this._id} );
      draw_graph();
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




function full(node){
  s = ''
  for (var key in node) {
      if (node.hasOwnProperty(key)) {
        s += key + ' : ' + node[key] + '<br>';
      }
  }
  $('tr#'+node._id).after('<tr id="'+node._id+'-full"><td colspan="5" style="padding:30px;"></td></tr>')
  $('tr#'+node._id+'-full td').html(s)
}




 function draw_graph(){

  nodes_cursor = Nodes.find()
  nodes_for_graph = nodes_cursor.map(function(node, index, cursor){
    return {data: {id: node._id, name: node.name}}
  })
  
  edges_cursor = Edges.find()
  edges_for_graph = edges_cursor.map(function(edge, index, cursor){
    return {data: {name: edge.name, source: edge.n1, target: edge.n2}}
  })


  $('#cy').cytoscape({
    style: cytoscape.stylesheet()
      .selector('node')
        .css({
          'content': 'data(name)',
          'text-valign': 'center',
          'color': 'white',
          'text-outline-width': 2,
          'text-outline-color': '#888'
        })
      .selector('edge')
        .css({
          'content':'data(name)',
          'text-valign': 'center',
          'font-size' : '10px',
          'color': 'gray',
          'target-arrow-shape': 'triangle'
        })
      .selector(':selected')
        .css({
          'background-color': 'black',
          'line-color': 'black',
          'target-arrow-color': 'black',
          'source-arrow-color': 'black'
        })
      .selector('.faded')
        .css({
          'opacity': 0.25,
          'text-opacity': 0
        }),
    
    elements: {
      nodes: nodes_for_graph,
      edges: edges_for_graph
    },
    
    ready: function(){
      window.cy = this;
      
      // giddy up...
      
      cy.elements().unselectify();
      
      cy.on('tap', 'node', function(e){
        var node = e.cyTarget; 
        var neighborhood = node.neighborhood().add(node);
        
        cy.elements().addClass('faded');
        neighborhood.removeClass('faded');
      });
      
      cy.on('tap', function(e){
        if( e.cyTarget === cy ){
          cy.elements().removeClass('faded');
        }
      });
    }
  });






 }