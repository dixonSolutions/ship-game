/* Lightweight ocean height / shove used by ship buoyancy */

float(float x, float z) Ocean_SampleHeight =
{
	local float t, h, along;
	t = ocean_time;
	along = x * 0.02 + z * 0.015;
	h = qsin(along + t * 0.9) * wave_height * 8;
	h = h + qsin(along * 2.2 - t * 1.4) * wave_chop * 4;
	h = h + qsin(along * 0.35 + t * 0.4) * tsunami_pulse * 18;
	return h;
};

vector() Ocean_TsunamiShove =
{
	local vector v;
	local float force, rad;
	v_x = 0;
	v_y = 0;
	v_z = 0;
	if (tsunami_pulse <= 0.05)
		return v;
	rad = wind_dir * 3.14159265 / 180;
	force = tsunami_pulse * (80 + weather_intensity * 120);
	v_x = qsin(rad) * force;
	v_z = qcos(rad) * force;
	return v;
};

void() Ocean_Tick =
{
	local float boost, i;
	i = weather_intensity;
	ocean_time = ocean_time + frametime;

	boost = 1;
	if (weather_id == WEATHER_HURRICANE)
		boost = 1.45 + i * 0.35;
	else if (weather_id == WEATHER_TORNADO)
		boost = 1.2 + i * 0.25;
	else if (weather_id == WEATHER_STORM || weather_id == WEATHER_LIGHTNING)
		boost = 1.28 + i * 0.28;
	else if (weather_id == WEATHER_TSUNAMI)
		boost = 1.15 + i * 0.2;

	wave_height = ship_clamp((0.55 + wind_str * 0.4 + tsunami_pulse * 0.7) * boost, 0.25, 1.85);
	wave_chop = ship_clamp((0.28 + wind_str * 0.45) * boost, 0.2, 1.15);
};
