/* Player sailing physics (ported from browser ShipPhysicsSystem) */

void() Ship_FireCannon;

float(entity sh) Wind_Thrust =
{
	local float rel, absrel, polar, trim;
	rel = angle_diff(wind_dir, sh.ship_heading);
	absrel = fabs(rel);
	trim = ship_clamp(sh.sail_trim, 0.15, 1);

	if (absrel < 35)
		polar = 0.08;				// no-go
	else if (absrel < 90)
		polar = 0.55 + (absrel - 35) / 55 * 0.45; // build to beam reach
	else if (absrel < 140)
		polar = 1.0;				// beam / broad
	else
		polar = 0.65;				// dead run softened

	return polar * wind_str * trim * sh.sail_integrity;
};

void(entity sh) Ship_ResolveCollisions =
{
	local entity e;
	local vector delta;
	local float dist, overlap, hitforce, push;
	e = findradius(sh.origin, SHIP_HULL_R + AI_HULL_R + 8);
	while (e)
	{
		if (e != sh && e.is_ship && e.hull_integrity > 0)
		{
			delta = e.origin - sh.origin;
			delta_y = 0;
			dist = vlen(delta);
			if (dist < 1)
				dist = 1;
			overlap = (SHIP_HULL_R + AI_HULL_R) - dist;
			if (overlap > 0)
			{
				delta = normalize(delta);
				push = overlap * 0.55;
				if (sh.is_ai_ship == FALSE)
					setorigin(sh, sh.origin - delta * push);
				setorigin(e, e.origin + delta * push);
				hitforce = (fabs(sh.ship_speed) + fabs(e.ship_speed)) * 0.08;
				T_Damage(sh, world, world, hitforce * 4);
				T_Damage(e, world, world, hitforce * 4);
				sh.ship_speed = sh.ship_speed * 0.55;
				e.ship_speed = e.ship_speed * 0.55;
			}
		}
		e = e.chain;
	}
};

void() Ship_PlayerThink =
{
	local float thrust, drag, targetspd, turn, rad, wy;
	local vector shove;

	self.nextthink = time + 0.05;
	self.think = Ship_PlayerThink;

	if (game_over)
		return;

	if (self.hull_integrity <= 0)
	{
		self.sink_progress = ship_clamp(self.sink_progress + frametime * 0.22, 0, 1);
		self.ship_speed = self.ship_speed * ship_clamp(1 - frametime * 1.8, 0, 1);
		self.origin_y = Ocean_SampleHeight(self.origin_x, self.origin_z) - self.sink_progress * 40;
		setorigin(self, self.origin);
		if (self.sink_progress > 0.85)
		{
			game_over = 2;
			centerprint(self, "Defeat - the sea claims the hull\n");
			bprint("Defeat\n");
		}
		return;
	}

	// impulses: 1 sail+, 2 sail-, 3/4 rudder, 5 fire, 6 anchor, 7-9 weather
	if (self.impulse == 1)
		self.sail_trim = ship_clamp(self.sail_trim + 0.1, 0, 1);
	else if (self.impulse == 2)
		self.sail_trim = ship_clamp(self.sail_trim - 0.1, 0, 1);
	else if (self.impulse == 3)
		self.rudder = ship_clamp(self.rudder - 0.2, -1, 1);
	else if (self.impulse == 4)
		self.rudder = ship_clamp(self.rudder + 0.2, -1, 1);
	else if (self.impulse == 5)
		Ship_FireCannon();
	else if (self.impulse == 6)
		self.anchor = 1 - self.anchor;
	else if (self.impulse == 7)
		Weather_Set(WEATHER_TORNADO);
	else if (self.impulse == 8)
		Weather_Set(WEATHER_TSUNAMI);
	else if (self.impulse == 9)
		Weather_Set(WEATHER_CLEAR);
	self.impulse = 0;

	// continuous keys via button0 as throttle assist optional
	if (self.button0)
		self.throttle = 0.5;
	else
		self.throttle = 0;

	if (self.anchor)
	{
		self.ship_speed = self.ship_speed * ship_clamp(1 - frametime * 2.8, 0, 1);
		wy = Ocean_SampleHeight(self.origin_x, self.origin_z);
		self.origin_y = wy + 24;
		setorigin(self, self.origin);
		Ship_ResolveCollisions(self);
		return;
	}

	thrust = Wind_Thrust(self) + self.throttle * 0.4;
	drag = 0.08 + fabs(self.rudder) * 0.04;
	targetspd = thrust * 220 * (1 - drag * 0.35);
	self.ship_speed = self.ship_speed + (targetspd - self.ship_speed) * ship_clamp(frametime * 1.55, 0, 1);

	turn = (0.55 + self.ship_speed * 0.002) * (0.35 + self.sail_integrity * 0.65);
	self.ship_heading = wrap_angle(self.ship_heading + self.rudder * frametime * turn * 60);
	self.angles_y = self.ship_heading;
	self.ship_heel = ship_lerp(self.ship_heel, self.rudder * 12 + wind_str * 6, frametime * 3);
	self.angles_z = self.ship_heel;
	self.ship_pitch = qsin(ocean_time * 1.4) * wave_height * 4;
	self.angles_x = self.ship_pitch;

	rad = self.ship_heading * 3.14159265 / 180;
	self.velocity_x = qsin(rad) * self.ship_speed;
	self.velocity_z = qcos(rad) * self.ship_speed;
	self.velocity_y = 0;

	shove = Ocean_TsunamiShove();
	self.velocity_x = self.velocity_x + shove_x;
	self.velocity_z = self.velocity_z + shove_z;

	wy = Ocean_SampleHeight(self.origin_x, self.origin_z);
	self.origin = self.origin + self.velocity * frametime;
	self.origin_y = wy + 24;
	setorigin(self, self.origin);

	if (self.reload_timer > 0)
		self.reload_timer = self.reload_timer - frametime;

	Ship_ResolveCollisions(self);
};

void() Ship_InitPlayer =
{
	self.classname = "player_ship";
	self.is_ship = TRUE;
	self.is_ai_ship = FALSE;
	self.solid = SOLID_SLIDEBOX;
	self.movetype = MOVETYPE_NOCLIP; // ocean buoyancy owns vertical
	// Model optional - works as invisible hull if no free mdl is shipped yet
	setsize(self, '-16 -16 -24', '16 16 32');
	self.health = 100;
	self.max_health = 100;
	self.hull_integrity = 1;
	self.sail_integrity = 1;
	self.sail_trim = 0.65;
	self.rudder = 0;
	self.ship_heading = 0;
	self.ship_speed = 0;
	self.takedamage = DAMAGE_AIM;
	self.deadflag = DEAD_NO;
	self.view_ofs = '0 0 22';
	self.weapon = IT_AXE;
	self.items = IT_AXE;
	self.nextthink = time + 0.1;
	self.think = Ship_PlayerThink;
};
