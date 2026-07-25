/* Ballistic cannon fire + projectile hits */

void() Ball_Touch;
void() Ball_Think;
void() Ship_FireCannon;

void() Ball_Think =
{
	local entity e;
	local vector delta;
	local float dist;

	self.nextthink = time + 0.05;
	self.velocity_y = self.velocity_y - 280 * frametime; // gravity
	self.angles = vectoangles(self.velocity);

	if (self.origin_y < Ocean_SampleHeight(self.origin_x, self.origin_z) + 4)
	{
		// water splash
		particle(self.origin, '0 0 40', 255, 12);
		remove(self);
		return;
	}

	if (time > self.ltime)
	{
		remove(self);
		return;
	}

	e = findradius(self.origin, SHIP_HULL_R + 16);
	while (e)
	{
		if (e.is_ship && e != self.owner && e.hull_integrity > 0)
		{
			delta = e.origin - self.origin;
			delta_y = 0;
			dist = vlen(delta);
			if (dist < SHIP_HULL_R)
			{
				T_Damage(e, self, self.owner, 12 + random() * 8);
				e.sail_integrity = ship_clamp(e.sail_integrity - 0.05, 0.15, 1);
				particle(self.origin, '0 0 80', 255, 20);
				// rupture flash
				if (e.hull_integrity < 0.6)
					particle(e.origin + '0 0 20', '40 10 0', 250, 30);
				remove(self);
				return;
			}
		}
		e = e.chain;
	}
};

void() Ball_Touch =
{
	if (other == self.owner)
		return;
	if (other.is_ship)
	{
		T_Damage(other, self, self.owner, 14);
		particle(self.origin, '0 0 80', 255, 20);
	}
	remove(self);
};

void() Ship_FireCannon =
{
	local entity ball;
	local float yaw, pitch, rad, prad;
	local vector org, dir;

	if (self.reload_timer > 0)
		return;
	if (self.hull_integrity <= 0)
		return;

	self.reload_timer = 2.4;
	yaw = self.ship_heading + self.cannon_yaw;
	pitch = self.cannon_pitch;
	if (pitch < 5)
		pitch = 12;
	rad = yaw * 3.14159265 / 180;
	prad = pitch * 3.14159265 / 180;

	org = self.origin;
	org_x = org_x + qsin(rad) * 36;
	org_z = org_z + qcos(rad) * 36;
	org_y = org_y + 28;

	dir_x = qsin(rad) * qcos(prad);
	dir_y = qsin(prad);
	dir_z = qcos(rad) * qcos(prad);

	particle(org, dir * 40, 255, 8);

	ball = spawn();
	ball.owner = self;
	ball.classname = "cannonball";
	ball.movetype = MOVETYPE_FLYMISSILE;
	ball.solid = SOLID_BBOX;
	ball.touch = Ball_Touch;
	setsize(ball, '-3 -3 -3', '3 3 3');
	setorigin(ball, org);
	ball.velocity = dir * 900;
	ball.angles = vectoangles(ball.velocity);
	ball.ltime = time + 3.8;
	ball.nextthink = time + 0.05;
	ball.think = Ball_Think;
};
