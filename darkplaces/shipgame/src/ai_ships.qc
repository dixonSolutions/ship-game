/* Hostile / merchant AI ships */

void() AI_ShipThink;
void(vector org, float fact, float ishostile) AI_SpawnShip;

void() AI_ShipThink =
{
	local entity ply;
	local vector delta;
	local float dist, desired, rad, thrust, wy;

	self.nextthink = time + 0.1;
	self.think = AI_ShipThink;

	if (game_over)
		return;

	if (self.hull_integrity <= 0)
	{
		self.sink_progress = ship_clamp(self.sink_progress + frametime * 0.2, 0, 1);
		self.origin_y = Ocean_SampleHeight(self.origin_x, self.origin_z) - self.sink_progress * 40;
		setorigin(self, self.origin);
		if (self.sink_progress > 0.9)
		{
			hostiles_alive = hostiles_alive - 1;
			if (hostiles_alive <= 0 && game_over == 0)
			{
				game_over = 1;
				bprint("Victory - hostile sails broken\n");
			}
			remove(self);
		}
		return;
	}

	ply = find(world, classname, "player_ship");
	if (!ply)
		ply = find(world, classname, "player");

	if (ply && self.hostile)
	{
		delta = ply.origin - self.origin;
		delta_y = 0;
		dist = vlen(delta);
		desired = vectoyaw(delta);
		self.ship_heading = wrap_angle(self.ship_heading + angle_diff(desired + 90, self.ship_heading) * 0.04);
		self.sail_trim = 0.8;
		if (dist < 420 && dist > 120 && self.reload_timer <= 0)
		{
			self.cannon_yaw = angle_diff(desired, self.ship_heading);
			self.cannon_pitch = 14;
			Ship_FireCannon();
		}
	}
	else
	{
		// merchants follow wind corridor
		self.ship_heading = wrap_angle(wind_dir + 90);
		self.sail_trim = 0.55;
	}

	thrust = Wind_Thrust(self);
	self.ship_speed = self.ship_speed + (thrust * 180 - self.ship_speed) * 0.08;
	rad = self.ship_heading * 3.14159265 / 180;
	self.velocity_x = qsin(rad) * self.ship_speed;
	self.velocity_z = qcos(rad) * self.ship_speed;
	self.origin = self.origin + self.velocity * frametime;
	wy = Ocean_SampleHeight(self.origin_x, self.origin_z);
	self.origin_y = wy + 24;
	self.angles_y = self.ship_heading;
	setorigin(self, self.origin);

	if (self.reload_timer > 0)
		self.reload_timer = self.reload_timer - frametime;

	Ship_ResolveCollisions(self);
};

void(vector org, float fact, float ishostile) AI_SpawnShip =
{
	local entity sh;
	sh = spawn();
	sh.classname = "ai_ship";
	sh.is_ship = TRUE;
	sh.is_ai_ship = TRUE;
	sh.faction = fact;
	sh.hostile = ishostile;
	sh.solid = SOLID_BBOX;
	sh.movetype = MOVETYPE_NOCLIP;
	setsize(sh, '-20 -20 -24', '20 20 32');
	setorigin(sh, org);
	sh.hull_integrity = 1;
	sh.sail_integrity = 1;
	sh.sail_trim = 0.7;
	sh.ship_heading = random() * 360;
	sh.takedamage = DAMAGE_AIM;
	sh.health = 100;
	sh.nextthink = time + 0.5 + random();
	sh.think = AI_ShipThink;
	if (ishostile)
		hostiles_alive = hostiles_alive + 1;
};
