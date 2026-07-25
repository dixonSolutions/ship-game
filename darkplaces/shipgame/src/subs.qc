/* Shared helpers */

float(float a, float b, float t) ship_lerp =
{
	return a + (b - a) * t;
};

float(float v, float lo, float hi) ship_clamp =
{
	if (v < lo)
		return lo;
	if (v > hi)
		return hi;
	return v;
};

float(float deg) wrap_angle =
{
	while (deg >= 360)
		deg = deg - 360;
	while (deg < 0)
		deg = deg + 360;
	return deg;
};

float(float a, float b) angle_diff =
{
	local float d;
	d = wrap_angle(a - b);
	if (d > 180)
		d = d - 360;
	return d;
};

void(entity e) SUB_Null =
{
};

void() SUB_Remove =
{
	remove(self);
};

void(entity targ, entity inflictor, entity attacker, float damage) T_Damage;

void(vector org, float dmg) T_RadiusDamage =
{
	local entity e;
	e = findradius(org, 120);
	while (e)
	{
		if (e.takedamage)
			T_Damage(e, world, world, dmg);
		e = e.chain;
	}
};

void(entity targ, entity inflictor, entity attacker, float damage) T_Damage =
{
	if (!targ.takedamage)
		return;
	if (targ.hull_integrity > 0)
	{
		targ.hull_integrity = ship_clamp(targ.hull_integrity - damage * 0.01, 0, 1);
		if (targ.hull_integrity <= 0)
		{
			targ.deadflag = DEAD_DYING;
			targ.sink_progress = 0.01;
		}
	}
};
