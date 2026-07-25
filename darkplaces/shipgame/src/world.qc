/* World spawn + main frame loop */

float	lastcheck;
float	lastchecktime;
entity	bodyque_head;

void() StartFrame;
void() worldspawn;
void() InitBodyQue;

void() InitBodyQue =
{
};

void() StartFrame =
{
	if (force_retouch)
		force_retouch = force_retouch - 1;

	Ocean_Tick();
	Weather_ApplyPreset();
	Crew_Tick();
	world.voyage_time = world.voyage_time + frametime;
};

void() worldspawn =
{
	lastcheck = 0;
	lastchecktime = 0;

	// Free gamedir: no proprietary id1 models/sounds required.
	// Optional: drop free LibreQuake / custom assets under shipgame/progs & sound/.
	precache_file("maps/ocean1.bsp");

	lightstyle(0, "m");
	lightstyle(1, "mmnmmommommnonmmonqnmmo");
	lightstyle(2, "abcdefghijklmnopqrstuvwxyzyxwvutsrqponmlkjihgfedcba");

	world.wind_dir = 45;
	world.wind_str = 0.55;
	world.weather_id = WEATHER_CLEAR;
	world.weather_intensity = 0.55;
	world.ocean_time = 0;
	world.wave_height = 0.85;
	world.wave_chop = 0.42;
	world.tsunami_pulse = 0;
	world.voyage_time = 0;
	world.hostiles_alive = 0;
	world.game_over = 0;

	// spawn AI ships around the arena (free placeholder map)
	AI_SpawnShip('400 0 40', 2, TRUE);
	AI_SpawnShip('-350 200 40', 2, TRUE);
	AI_SpawnShip('200 -420 40', 0, FALSE);

	bprint("Ship Game (DarkPlaces / QuakeC)\n");
	bprint("W/S sail  Q/E rudder  SPACE fire  A anchor  7 tornado  8 tsunami  9 clear\n");
};
