/* Weather presets + intensity (mirrors browser WeatherSystem) */

void() Weather_ApplyPreset =
{
	local float id, i;
	id = world.weather_id;
	i = world.weather_intensity;

	if (id == WEATHER_CLEAR)
	{
		world.wind_str = ship_clamp(0.35 + i * 0.15, 0.2, 0.7);
		lightstyle(0, "m");
	}
	else if (id == WEATHER_RAIN)
	{
		world.wind_str = ship_clamp(0.45 + i * 0.2, 0.3, 0.85);
		lightstyle(0, "k");
	}
	else if (id == WEATHER_STORM || id == WEATHER_LIGHTNING)
	{
		world.wind_str = ship_clamp(0.7 + i * 0.25, 0.55, 1);
		lightstyle(0, "g");
	}
	else if (id == WEATHER_FOG)
	{
		world.wind_str = 0.3;
		lightstyle(0, "e");
	}
	else if (id == WEATHER_HURRICANE)
	{
		world.wind_str = ship_clamp(0.9 + i * 0.1, 0.85, 1);
		lightstyle(0, "c");
	}
	else if (id == WEATHER_TSUNAMI)
	{
		world.wind_str = ship_clamp(0.55 + i * 0.2, 0.45, 0.9);
		world.tsunami_pulse = ship_clamp(world.tsunami_pulse + frametime * (0.18 + i * 0.28), 0, 0.28 + i * 0.42);
		lightstyle(0, "h");
	}
	else if (id == WEATHER_TORNADO)
	{
		world.wind_str = ship_clamp(0.8 + i * 0.2, 0.7, 1);
		world.wind_dir = wrap_angle(world.wind_dir + frametime * (40 + i * 80));
		lightstyle(0, "d");
	}

	if (id != WEATHER_TSUNAMI)
		world.tsunami_pulse = ship_clamp(world.tsunami_pulse - frametime * 0.5, 0, 1);

	// occasional lightning flash
	if ((id == WEATHER_LIGHTNING || id == WEATHER_STORM || id == WEATHER_HURRICANE || id == WEATHER_TORNADO)
		&& random() < (0.02 + i * 0.04))
	{
		lightstyle(0, "z");
	}
};

void(float id) Weather_Set =
{
	world.weather_id = id;
	world.tsunami_pulse = 0;
	bprint("Weather set: ");
	if (id == WEATHER_TORNADO)
		bprint("tornado\n");
	else if (id == WEATHER_TSUNAMI)
		bprint("tsunami\n");
	else if (id == WEATHER_HURRICANE)
		bprint("hurricane\n");
	else if (id == WEATHER_STORM)
		bprint("storm\n");
	else
		bprint("clear/other\n");
	Weather_ApplyPreset();
};
