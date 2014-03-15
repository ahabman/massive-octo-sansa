/*

TODO
=========================
graph instances, sets
graph icon buttons
redraw graph when data is updated locally
redraw graph when data is updated remotely
end user build dynamic queries
node type
delete cleanup dependent things 
text export (.dot ?)
text import 

*/

Graphs = new Meteor.Collection('graphs');
Nodes = new Meteor.Collection('nodes');
Edges = new Meteor.Collection('edges');

if (Meteor.isClient) {

  var nodes_for_graph
  var edges_for_graph

  Meteor.startup(function () {
    Meteor.setTimeout(draw_graph, 1000) 
    Meteor.setTimeout(autocomplete, 1000) 
  });

  Meteor.subscribe('all-graphs');
  Meteor.subscribe('all-nodes');
  Meteor.subscribe('all-edges');
  // Meteor.subscribe('current-graph-nodes', { graph_id: Session.get('currentGraphId') });

  $('#create_node_add_kv_pair').live('click', function(){
    $('#kv_pair_template').clone().removeAttr('id').show().prependTo( $('.kv_pairs_container') )
    return false;
  })
  $('#edit_node_add_kv_pair').live('click', function(){
    $('#kv_pair_template').clone().removeAttr('id').show().prependTo( $('.edit_kv_pairs_container') )
    return false;
  })


  /* GRAPHS */
  /* bind graphs data */
  Template.graphs.graphs = function(){
      return Graphs.find({}, { sort: { time: -1 }});
  }
  Template.graphs.current_graph = function(){
    return Graphs.findOne({_id: Session.get('currentGraphId') });
  }

  Template.graphs.events({
    'click #create_graph' : function(){

      new_graph_name = $('#new_graph_name')
      graph_object = {
        name: new_graph_name.val(),
        time: Date.now()
      }

      Graphs.insert( graph_object );
      new_graph_name.val('');
      return false;
    }
  })

  Template.graph.events({
    'click .show' : function(){

      Deps.autorun(function () {
        // Meteor.subscribe("chat-history", {room: Session.get("currentRoomId")});
        Meteor.subscribe("current-graph", {_id: Session.get("currentGraphId")});
        autocomplete();
      });

      // Causes the function passed to Deps.autorun to be re-run, so
      // that the chat-history subscription is moved to the room "home".
      Session.set("currentGraphId", this._id);

      draw_graph(); 
      return false;
    },

    'click .delete' : function(){

      Graphs.remove( { '_id' : this._id} );
      draw_graph(); // ?
      return false;
    },
  })


  Template.nav.graphs = function(){
      return Graphs.find({}, { sort: { time: -1 }});
  }
  Template.nav.current_graph = function(){
    return Graphs.findOne({_id: Session.get('currentGraphId') });
  }
  Template.nav.events({
    'click a' : function(){

      Deps.autorun(function () {
        // Meteor.subscribe("chat-history", {room: Session.get("currentRoomId")});
        Meteor.subscribe("current-graph", {_id: Session.get("currentGraphId")});
        autocomplete();
      });

      // Causes the function passed to Deps.autorun to be re-run, so
      // that the chat-history subscription is moved to the room "home".
      Session.set("currentGraphId", this._id);

      draw_graph(); 
      return false;
    }
  })




  /* NODES */
  /* bind node data */
  Template.nodes.nodes = function(){
      return Nodes.find({graph_id: Session.get('currentGraphId')}, { sort: { time: -1 }});
  }

  /* bind node events */
  Template.node.events({
    // 'click .update' : function(){
    //   new_name = $('#'+this._id+ ' .name').html()
    //   Nodes.update( { '_id' : this._id}, {$set: {name: new_name}} );
    //   draw_graph();
    //   return false;
    // },

    'click .edit' : function(){

      // reset
      $('.edit_kv_pairs_container').html('');
      $('#edit_node_name').val('');
      $('#create_node_container').hide();
      $('#edit_node_container').show();

      node_name = $('#'+this._id+ ' .name').html()
      $('#edit_node_name').val( node_name )

      for (var key in this) {
          if (this.hasOwnProperty(key)) {

            // name is special, handled separately
            if(key=='name') continue;

            kv_template = $('#kv_pair_template').clone().removeAttr('id').show().prependTo( $('.edit_kv_pairs_container') )
            kv_template.find('.create_node_add_key').val( key )
            kv_template.find('.create_node_add_value').val( this[key] )
            
            // don't allow id to changed
            if(key=='_id'){
              kv_template.hide();
            }
          }
      }
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

  /* bind node create events */
  Template.create_node.events({
    'click input[type=submit]' : function () { 

      new_node_name = $('#new_node_name')
      node_object = {
        graph_id: Session.get('currentGraphId'),
        name: new_node_name.val(),
        time: Date.now()
      }

      key_value_pairs = $('.kv_pairs_container .kv_pair')
      for (var i = 0, len = key_value_pairs.length-1; i <= len; i++) {
        kv_pair = key_value_pairs.eq(i)
        key = kv_pair.find('.create_node_add_key').val()
        value = kv_pair.find('.create_node_add_value').val()
        node_object[key] = value;
      };

      Nodes.insert( node_object );

      new_node_name.val('')
      draw_graph();
      autocomplete();
    } 
  });

  /* bind node edit events */
  Template.edit_node.events({
    'click #update_node': function(){

      // start with name
      node_object = {name: $('#edit_node_name').val()}

      // gather fileds to remove (if value is '')
      unset = {}

      key_value_pairs = $('.edit_kv_pairs_container .kv_pair')
      for (var i = 0, len = key_value_pairs.length-1; i <= len; i++) {
        kv_pair = key_value_pairs.eq(i);
        key = kv_pair.find('.create_node_add_key').val();
        value = kv_pair.find('.create_node_add_value').val();

        // remove attr if value is emtpy string
        if(value==''){ 
          unset[key] = '';
        }
        // update field
        else{
          node_object[key] = value;
        }
      };

      // save and remove id. mongo doesn't want it in node_object
      node_id = node_object._id;
      delete node_object._id;

      Nodes.update( { '_id' : node_id}, {$set: node_object, $unset: unset} );

      // reset
      draw_graph();
      $('.edit_kv_pairs_container').html('');
      $('#edit_node_name').val('');
      $('#edit_node_container').hide();
      $('#create_node_container').show();
      return false;
    }
  });

  /* EDGES */
  /* bind edge data */
  Template.edges.edges = function(){
      return Edges.find({graph_id: Session.get('currentGraphId')}, { sort: { time: -1 }});
  }

  /* bind edge events */
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

  /* bind edge create events */
  Template.create_edge.events({
    'click input[type=submit]' : function () { // template data, if any, is available in 'this'

      create_edge_n1_id = $('#create_edge_n1_id')
      create_edge_n2_id = $('#create_edge_n2_id')
      create_edge_name = $('#create_edge_name')

      Edges.insert({
        graph_id: Session.get('currentGraphId'),
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
}

if (Meteor.isServer) {

  Meteor.publish("all-graphs", function () {
    return Graphs.find(); // everything
  });
  Meteor.publish("current-graph", function (graph_id) {
    return Graphs.find( {_id: graph_id} ); // current
  });
  Meteor.publish("all-nodes", function () {
    return Nodes.find(); // everything
  });
  // Meteor.publish("current-graph-nodes", function (graph_id) {
  //   return Nodes.find( { 'graph_id': graph_id } );
  // });
  Meteor.publish("all-edges", function () {
    return Edges.find(); // everything
  });
}


function autocomplete(){

  nodes_cursor = Nodes.find({graph_id: Session.get('currentGraphId')})
  nodes_for_autocomplete = nodes_cursor.map(function(node, index, cursor){
    return {data: node._id, value: node.name}
  })

  options = { 
    lookup: nodes_for_autocomplete,
    onSelect: function (suggestion) {
      $(this).val( suggestion.data )
    }
  };
  $('#create_edge_n1_id, #create_edge_n2_id').autocomplete(options);
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

  nodes_cursor = Nodes.find({graph_id: Session.get('currentGraphId')})
  nodes_for_graph = nodes_cursor.map(function(node, index, cursor){
    return {data: {id: node._id, name: node.name}}
  })

  edges_cursor = Edges.find({graph_id: Session.get('currentGraphId')})
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


  layouts = ['random', 'grid', 'circle', 'breadthfirst', 'arbor', 'cose'];
  random_layout = layouts[Math.floor(Math.random()*layouts.length)];
  setTimeout("cy.layout({ name: '"+random_layout+"' });", 100)
}