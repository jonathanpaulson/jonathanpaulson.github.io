// TODO:
// more units
// more abilities
// spells
// teching
// multiplayer
// multiple boards
// generals
// team chat

var size = 40;
var n = 5;
var height = size*2;
var width = Math.sqrt(3)/2 * height;

var necromancer = {
  name: 'N',
  move: 1,
  attack: 1,
  defense: 7,
  range: 1,
  cost: 1000,
  rebate: 0,
  abilities: new Set(['spawn', 'unsummon', 'persistent'])
};

var zombie = {
  name: 'Z',
  move: 1,
  attack: 1,
  defense: 2,
  range: 1,
  cost: 2,
  rebate: 0,
  abilities: new Set(['slow'])
};

var skeleton = {
  name: 'S',
  move: 1,
  attack: 5,
  defense: 2,
  range: 1,
  cost: 4,
  rebate: 2,
  abilities: new Set([]),
};

var bat = {
  name: 'B',
  move: 3,
  attack: 1,
  defense: 1,
  range: 1,
  cost: 3,
  rebate: 1,
  abilities: new Set(['flying']),
};


units = new Map();
[necromancer, zombie, skeleton, bat].forEach(function (u) {
  units.set(u.name, u);
});
unit_names = [zombie.name, necromancer.name, skeleton.name, bat.name];

function rint(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function hash_point(p) {
  return (p.x+2*n)*(10*n) + (p.y+2*n);
}
function unhash_point(hash) {
  var y = hash%(10*n) - 2*n;
  var x = Math.floor(hash/(10*n)) - 2*n;
  return {x,y};
}
function remove_multi(map, k) {
  console.assert(map.has(k));
  if(map.get(k) == 1) {
    map.delete(k);
  } else {
    map.set(k, map.get(k)-1);
  }
}
function add_multi(map, k) {
  if(!map.has(k)) {
    map.set(k, 1);
  } else {
    map.set(k, map.get(k)+1);
  }
}

function make_turn_state(current, other, p1) {
  me = new Map();
  them = new Map();
  for(var [k, v] of current) {
    me.set(k, { opos: unhash_point(k), attacked: false, unit:v});
  }
  for(var [k, v] of other) {
    them.set(k, { defense: v.defense, unit:v});
  }
  var spawn = false;
  return {me, them, p1, spawn};
}
function current(state) {
  return state.turn_state.p1 ? state.p1 : state.p2;
}
function other(state) {
  return state.turn_state.p1 ? state.p2 : state.p1;
}

function terrain_color(terrain) {
  if(terrain == 'water') { return 'blue'; }
  if(terrain == 'mana') { return 'orange'; }
  if(terrain == 'grass') { return 'green'; }
  return 'black';
}

function make_state() {
  map = new Map();
  selected = null;
  p1 = { units:new Map(), reinforcements: new Map(), money: 0};
  p2 = { units:new Map(), reinforcements: new Map(), money: 0};
  for(var x=-n; x<=n; x++) {
    for(var y=-n; y<=n; y++) {
      var z = -(x+y);
      if(Math.abs(z) > n) { continue; }
      var terrain =
        Math.random() < 0.2 ? 'water' :
        Math.random() < 0.05 ? 'mana' :
        'grass';
      map.set(hash_point({x,y}), terrain);
    }
  }

  function add(player, unit) {
    while(true) {
      var p = {x:rint(-n, n), y:rint(-n, n)};
      if(p1.units.has(hash_point(p)) || p2.units.has(hash_point(p)) || !map.has(hash_point(p)) || map.get(hash_point(p))=='water') {
        continue;
      } else {
        player.units.set(hash_point(p), unit);
        break;
      }
    }
  }

  add(p1, zombie);
  add(p1, necromancer);

  add(p2, zombie);
  add(p2, necromancer);

  turn_state = make_turn_state(p1.units, p2.units, true);

  return {map, selected, p1, p2, turn_state};
}

var dirs = [
  {x:1, y:-1},
  {x:1, y:0},
  {x:0, y:1},
  {x:-1, y:1},
  {x:-1, y:0},
  {x:0, y:-1},
]

function moves(unit, state) {
  var pos = unit.opos;
  var seen = new Set();
  if(unit.attacked) { return seen; }
  var q = new Queue();
  q.enqueue({pos:pos, d:0, p:pos});
  while(!q.isEmpty()) {
    var a = q.dequeue();
    if(a.d > unit.unit.move || seen.has(hash_point(a.pos)) || !state.map.has(hash_point(a.pos)) ||
      (!unit.unit.abilities.has('flying') && state.map.get(hash_point(a.pos)) == 'water')
      || state.turn_state.them.has(hash_point(a.pos))) {
      continue;
    }
    seen.add(hash_point(a.pos));
    dirs.forEach(function(dir) {
      q.enqueue({pos:{x:a.pos.x+dir.x, y:a.pos.y+dir.y}, d:a.d+1, p:a.pos});
    });
  }
  for (var [k, _] of state.turn_state.me) {
    seen.delete(k);
  };
  return seen;
}
function attacks(pos, unit, state) {
  var seen = new Set();
  if(unit.attacked) { return seen; }
  if(unit.unit.abilities.has('slow') && hash_point(pos) != hash_point(unit.opos)) { return seen; }
  for(var dx=-unit.unit.range; dx<=unit.unit.range; dx++) {
    for(var dy=-unit.unit.range; dy<=unit.unit.range; dy++) {
      dz = -(dx+dy);
      if(-unit.unit.range <= dz && dz <= unit.unit.range) {
        var p = {x:pos.x+dx, y:pos.y+dy};
        if(state.turn_state.them.has(hash_point(p))) {
          seen.add(hash_point(p));
        }
      }
    }
  }
  return seen;
}
function has_spawner(hex, unit, me) {
  var n = 2;
  for(var dx=-n; dx<=n; dx++) {
    for(var dy=Math.max(-n, -dx-n); dy<=Math.min(n, -dx+n); dy++) {
      var dz = -dx-dy;
      var pos = {x:hex.x + dx, y:hex.y+dy};
      var within_one = Math.abs(dx)<=1 && Math.abs(dy)<=1 && Math.abs(dz)<=1;
      if(me.has(hash_point(pos))) {
        var unit = me.get(hash_point(pos)).unit;
        if(unit.abilities.has('far_spawn')) { return true; }
        if(within_one && unit.abilities.has('spawn')) { return true; }
      }
    }
  }
  return false;
}

function hex_corner(center, size, i) {
  var angle_deg = 60*i + 30;
  var angle_rad = Math.PI/180 * angle_deg;
  return { x : center.x + size*Math.cos(angle_rad), y : center.y + size*Math.sin(angle_rad)}
}
function hex_round(pos) {
  var x = pos.x;
  var y = pos.y;
  var z = -(x+y);
  var rx = Math.round(x);
  var ry = Math.round(y);
  var rz = Math.round(z);
  if (Math.abs(rx - x) > Math.abs(ry - y) && Math.abs(rx - x) > Math.abs(rz - z)) {
    rx = -(ry+rz);
  } else if (Math.abs(ry - y) > Math.abs(rx - x) && Math.abs(ry - y) > Math.abs(rz - z)) {
    ry = -(rx+rz);
  } else if (Math.abs(rz - z) > Math.abs(rx - x) && Math.abs(rz - z) > Math.abs(ry - y)) {
    rz = -(rx+ry);
  }
  return {x:rx, y:ry};
}
function hex_center(pos, origin) {
  return {
    x : origin.x + pos.x*0.5*width + pos.y*-0.5*width,
    y : origin.y + pos.x*0.75*height + pos.y*0.75*height
  };
}

function move(ctx, point) {
  ctx.moveTo(Math.floor(point.x), Math.floor(point.y));
}
function line(ctx, point) {
  ctx.lineTo(Math.floor(point.x), Math.floor(point.y));
}
function text(ctx, text, point, color) {
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = color;
  ctx.fillText(text, Math.floor(point.x), Math.floor(point.y));
}
function clear_hex(ctx, origin, pos) {
  var center = hex_center(pos, origin);
  ctx.fillStyle = 'white';
  ctx.beginPath();
  move(ctx, hex_corner(center, size-3, 0));
  line(ctx, hex_corner(center, size-3, 1));
  line(ctx, hex_corner(center, size-3, 2));
  line(ctx, hex_corner(center, size-3, 3));
  line(ctx, hex_corner(center, size-3, 4));
  line(ctx, hex_corner(center, size-3, 5));
  line(ctx, hex_corner(center, size-3, 0));
  ctx.fill();
  ctx.closePath();
}
function draw_hex(ctx, center, color) {
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  move(ctx, hex_corner(center, size-1, 0));
  line(ctx, hex_corner(center, size-1, 1));
  line(ctx, hex_corner(center, size-1, 2));
  line(ctx, hex_corner(center, size-1, 3));
  line(ctx, hex_corner(center, size-1, 4));
  line(ctx, hex_corner(center, size-1, 5));
  line(ctx, hex_corner(center, size-1, 0));
  ctx.fill();
  ctx.closePath();
}

function show_state(state) {
  var tech = document.getElementById('tech');
  var ctx = tech.getContext('2d');
  var origin = {x:50, y:50};
  ctx.clearRect(0, 0, tech.width, tech.height);
  for(var i=0; i<unit_names.length; i++) {
    var unit = units.get(unit_names[i]);
    var pos = {x:i, y:-i};
    var center = hex_center(pos, origin);
    draw_hex(ctx, hex_center(pos, origin), state.selected==unit_names[i] ? 'yellow' : 'gray');
    text(ctx, unit.name, center, 'black');
    if(state.p1.reinforcements.has(unit.name)) {
      text(ctx, state.p1.reinforcements.get(unit.name), hex_corner(center, size-10, 2), 'red');
    }
    if(state.p2.reinforcements.has(unit.name)) {
      text(ctx, state.p2.reinforcements.get(unit.name), hex_corner(center, size-10, 0), 'blue');
    }
  }

  var board = document.getElementById('board');
  var origin = {x:board.width/2, y:board.height/2};
  var ctx = board.getContext('2d');
  ctx.clearRect(0, 0, board.width, board.height);
  for(var [key, value] of state.map) {
    var key = unhash_point(key);
    draw_hex(ctx, hex_center(key, origin), terrain_color(value));
  }
  // show moves
  if(state.selected != null && state.turn_state.me.has(hash_point(state.selected))) {
    var unit = state.turn_state.me.get(hash_point(state.selected));
    var move_to = moves(unit, state);
    move_to.forEach(function (hex) {
      draw_hex(ctx, hex_center(unhash_point(hex), origin), 'yellow');
    });
  }
  // show attacks
  if(state.selected != null && state.turn_state.me.has(hash_point(state.selected))) {
    var unit = state.turn_state.me.get(hash_point(state.selected));
    attacks(state.selected, unit, state).forEach(function (hex) {
      draw_hex(ctx, hex_center(unhash_point(hex), origin), 'red');
    });
  }
  for(var [k, v] of state.turn_state.me) {
    var k = unhash_point(k);
    text(ctx, v.unit.name, hex_center(k, origin), state.turn_state.p1 ? 'red' : 'blue');
  }
  for(var [k, v] of state.turn_state.them) {
    var k = unhash_point(k);
    text(ctx, v.unit.name, hex_center(k, origin), state.turn_state.p1 ? 'blue' : 'red');
  }

  var info = document.getElementById('info');
  var ctx = info.getContext('2d');
  ctx.clearRect(0, 0, info.width, info.height);

  ctx.font = '24px serif';
  text(ctx, 'P1: $' + state.p1.money, {x:info.width-150, y:50}, 'black');

  ctx.beginPath();
  move(ctx, {x:info.width-200, y:info.height/2});
  line(ctx, {x:info.width-10, y:info.height/2});
  ctx.setLineDash([5, 15]);
  ctx.stroke();
  ctx.closePath();

  text(ctx, 'P2: $' + state.p2.money, {x:info.width-150, y:info.height-50}, 'black');
  ctx.font = '10px serif';
}

var state = make_state();

function main() {
  var end_turn = document.getElementById('end_turn');
  end_turn.textContent = 'Spawn';
  end_turn.addEventListener('click', function () {
    if(!state.turn_state.spawn) {
      state.turn_state.spawn = true;
      state.selected = null;
      end_turn.textContent = 'End';
    } else {
      current(state).money += 3;
      end_turn.textContent = 'Spawn';
      current(state).units.clear();
      other(state).units.clear();
      for(var [k, v] of state.turn_state.me) {
        current(state).units.set(k, v.unit);
        if(map.get(k)=='mana') { current(state).money++; }
      }
      for(var [k, v] of state.turn_state.them) {
        other(state).units.set(k, v.unit);
      }
      state.turn_state = make_turn_state(other(state).units, current(state).units, !state.turn_state.p1);
    }
    show_state(state);
  });

  var board = document.getElementById('board');
  board.addEventListener('mousedown', function(e) {
    var rect = board.getBoundingClientRect();
    var pos = {
      x : e.clientX - rect.left - board.width/2,
      y : -(e.clientY - rect.top - board.height/2)
    };
    var x = (pos.x * Math.sqrt(3)/3 - pos.y/3) / size;
    var z = pos.y*(2/3)/size;
    var y = -(x+z);
    var hex = hex_round({x,y});

    if(!state.turn_state.spawn) {
      if(state.selected != null && hash_point(state.selected) != hash_point(hex) && state.turn_state.me.has(hash_point(state.selected))) {
        var unit = state.turn_state.me.get(hash_point(state.selected));
        if(moves(unit, state).has(hash_point(hex))) {
          state.turn_state.me.set(hash_point(hex), unit);
          state.turn_state.me.delete(hash_point(state.selected));
          state.selected = null;
        } else if(attacks(state.selected, unit, state).has(hash_point(hex))) {
          var their_unit = state.turn_state.them.get(hash_point(hex));
          if(unit.unit.abilities.has('unsummon')) {
            if(!their_unit.unit.abilities.has('persistent')) {
              state.turn_state.them.delete(hash_point(hex));
              add_multi(other(state).reinforcements, their_unit.unit.name);
            }
          } else {
            if(their_unit.defense <= unit.unit.attack) {
              state.turn_state.them.delete(hash_point(hex));
            } else {
              their_unit.defense -= unit.unit.attack;
            }
          }
          unit.attacked = true;
        } else {
          state.selected = null;
        }
      } else {
        state.selected = hex;
      }
    } else {
      // try to spawn units[state.selected] on [hex]
      if(state.selected != null) {
        var unit = units.get(state.selected);
        var terrain_ok = state.map.get(hash_point(hex))!='water' || unit.abilities.has('flying');
        var not_occupied = !state.turn_state.me.has(hash_point(hex)) && !state.turn_state.them.has(hash_point(hex));
        var has_money = current(state).reinforcements.has(unit.name) || current(state).money >= unit.cost;
        var nearby_spawner = has_spawner(hex, unit, state.turn_state.me);
        console.log(terrain_ok+" "+not_occupied+" "+has_money+" "+nearby_spawner);
        if(terrain_ok && not_occupied && has_money && nearby_spawner) {
          if(current(state).reinforcements.has(unit.name)) {
            remove_multi(current(state).reinforcements, unit.name);
          } else {
            current(state).money -= unit.cost;
          }
          state.turn_state.me.set(hash_point(hex), {opos:hex, attacked:false, unit});
        }
      }
    }
    show_state(state);
  }, true);

  var tech = document.getElementById('tech');
  tech.addEventListener('mousedown', function(e) {
    var pos = {
      x : e.clientX - tech.offsetLeft - 50,
      y : -(e.clientY - tech.offsetTop - 50)
    };
    var x = (pos.x * Math.sqrt(3)/3 - pos.y/3) / size;
    var z = pos.y*(2/3)/size;
    var y = -(x+z);
    var hex = hex_round({x, y});
    if(state.turn_state.spawn && hex.y == -hex.x) {
      state.selected = unit_names[hex.x];
    }
    show_state(state);
  });
  show_state(state);
}
