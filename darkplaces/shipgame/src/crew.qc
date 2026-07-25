/* Crew dialogue stubs (offline — no Bedrock in QuakeC) */

float	crew_timer;

void() Crew_Tick =
{
	local entity ply;
	if (game_over)
		return;
	crew_timer = crew_timer - frametime;
	if (crew_timer > 0)
		return;
	crew_timer = 12 + random() * 10;
	ply = find(world, classname, "player_ship");
	if (!ply)
		return;

	if (weather_id == WEATHER_TORNADO)
		centerprint(ply, "Lookout: Tornado off the starboard line!\n");
	else if (weather_id == WEATHER_TSUNAMI)
		centerprint(ply, "Boatswain: Big water coming — brace the hull!\n");
	else if (ply.hull_integrity < 0.4)
		centerprint(ply, "Gunner: She's taking water, Captain!\n");
	else if (hostiles_alive > 0)
		centerprint(ply, "Captain: Keep her in the wind — fire when ready.\n");
	else
		centerprint(ply, "Helmsman: Fair seas, trim as you like.\n");
};
