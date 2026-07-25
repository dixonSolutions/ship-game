/*
 * Ship Game — QuakeC definitions for DarkPlaces.
 * Vertical-slice sailing / combat mod (free assets only).
 */

// engine constants
float	FALSE				= 0;
float	TRUE				= 1;

float	CONTENT_EMPTY		= -1;
float	CONTENT_SOLID		= -2;
float	CONTENT_WATER		= -3;
float	CONTENT_SLIME		= -4;
float	CONTENT_LAVA		= -5;
float	CONTENT_SKY			= -6;

float	MOVETYPE_NONE		= 0;
float	MOVETYPE_WALK		= 3;
float	MOVETYPE_STEP		= 4;
float	MOVETYPE_FLY		= 5;
float	MOVETYPE_TOSS		= 6;
float	MOVETYPE_NOCLIP		= 8;
float	MOVETYPE_FLYMISSILE	= 9;
float	MOVETYPE_BOUNCE		= 10;

float	SOLID_NOT			= 0;
float	SOLID_TRIGGER		= 1;
float	SOLID_BBOX			= 2;
float	SOLID_SLIDEBOX		= 3;
float	SOLID_BSP			= 4;

float	DEAD_NO				= 0;
float	DEAD_DYING			= 1;
float	DEAD_DEAD			= 2;

float	DAMAGE_NO			= 0;
float	DAMAGE_YES			= 1;
float	DAMAGE_AIM			= 2;

float	IT_SHOTGUN			= 1;
float	IT_AXE				= 4096;

// global entity slots
entity	self;
entity	other;
entity	world;
entity	newmis;

// server globals
float	time;
float	frametime;
float	force_retouch;
string	mapname;
float	deathmatch;
float	coop;
float	teamplay;
float	serverflags;
float	total_secrets;
float	total_monsters;
float	found_secrets;
float	killed_monsters;
float	parm1, parm2, parm3, parm4, parm5, parm6, parm7, parm8;
float	parm9, parm10, parm11, parm12, parm13, parm14, parm15, parm16;
string	string_temp;
float	skill;
float	framecount;

entity	activator;
entity	damage_attacker;

// tracing
float	trace_allsolid;
float	trace_startsolid;
float	trace_fraction;
vector	trace_endpos;
vector	trace_plane_normal;
float	trace_plane_dist;
entity	trace_ent;
float	trace_inopen;
float	trace_inwater;

// client messaging
entity	msg_entity;

// entity fields
.float	modelindex;
.vector	absmin, absmax;
.float	ltime;
.float	movetype;
.float	solid;
.vector	origin;
.vector	oldorigin;
.vector	velocity;
.vector	angles;
.vector	avelocity;
.vector	punchangle;
.string	classname;
.string	model;
.float	frame;
.float	skin;
.float	effects;
.vector	mins, maxs;
.vector	size;
.float	hull;
.void()	touch;
.void()	use;
.void()	think;
.void()	blocked;
.float	nextthink;
.entity	groundentity;
.float	health;
.float	frags;
.float	weapon;
.string	weaponmodel;
.float	weaponframe;
.float	currentammo;
.float	ammo_shells, ammo_nails, ammo_rockets, ammo_cells;
.float	items;
.float	takedamage;
.entity	chain;
.float	deadflag;
.vector	view_ofs;
.float	button0, button1, button2;
.float	impulse;
.float	fix_time;
.entity	enemy;
.float	flags;
.float	colormap;
.float	team;
.float	max_health;
.float	teleport_time;
.float	armortype;
.float	armorvalue;
.float	waterlevel;
.float	watertype;
.float	ideal_yaw;
.float	yaw_speed;
.entity	aiment;
.entity	goalentity;
.float	spawnflags;
.string	target;
.string	targetname;
.float	dmg_take;
.float	dmg_save;
.entity	dmg_inflictor;
.entity	owner;
.vector	movedir;
.string	message;
.float	sounds;
.string	noise, noise1, noise2, noise3;
.string	netname;

// Ship Game custom fields
.float	sail_trim;		// 0..1
.float	rudder;			// -1..1
.float	throttle;		// 0..1
.float	anchor;			// 0/1
.float	ship_speed;		// knots-ish units
.float	ship_heading;	// degrees yaw
.float	hull_integrity;	// 0..1
.float	sail_integrity;	// 0..1
.float	sink_progress;	// 0..1
.float	reload_timer;
.float	cannon_yaw;		// aim offset
.float	cannon_pitch;
.float	is_ship;
.float	is_ai_ship;
.float	hostile;
.float	faction;		// 0 merchant 1 navy 2 pirate
.float	ship_heel;
.float	ship_pitch;
.entity	ship_owner;

// world sailing state (stored on world entity)
.float	wind_dir;		// degrees
.float	wind_str;		// 0..1
.float	weather_id;		// enum
.float	weather_intensity;
.float	ocean_time;
.float	wave_height;
.float	wave_chop;
.float	tsunami_pulse;
.float	voyage_time;
.float	hostiles_alive;
.float	game_over;		// 0 play 1 victory 2 defeat

// weather ids
float WEATHER_CLEAR = 0;
float WEATHER_RAIN = 1;
float WEATHER_STORM = 2;
float WEATHER_FOG = 3;
float WEATHER_LIGHTNING = 4;
float WEATHER_HURRICANE = 5;
float WEATHER_TSUNAMI = 6;
float WEATHER_TORNADO = 7;

float SHIP_HULL_R = 48;
float AI_HULL_R = 42;
float BALL_R = 8;
