/* Client connect / putclientinplace / player spawn */

void() info_player_start;

void() info_player_start =
{
	// marker entity from map
};

void() SetNewParms =
{
	parm1 = 0;
};

void() SetChangeParms =
{
};

void() PlayerPreThink =
{
};

void() PlayerPostThink =
{
};

void() ClientKill =
{
	bprint(self.netname);
	bprint(" abandoned ship\n");
	self.hull_integrity = 0;
};

void() ClientConnect =
{
	bprint(self.netname);
	bprint(" cast off\n");
};

void() ClientDisconnect =
{
	bprint(self.netname);
	bprint(" left the voyage\n");
};

void() PutClientInServer =
{
	local entity spot;

	spot = find(world, classname, "info_player_start");
	if (!spot)
	{
		self.origin = '0 0 64';
	}
	else
		self.origin = spot.origin + '0 0 24';

	self.classname = "player_ship";
	self.netname = "Captain";
	Ship_InitPlayer();
	setorigin(self, self.origin);
	self.flags = self.flags + 1; // FL_CLIENT-ish
};

void() PlayerDie =
{
};
