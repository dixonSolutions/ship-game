/* Minimal trigger stubs so maps don't error on unknown think hooks */

void() trigger_once;
void() trigger_multiple;
void() info_teleport_destination;
void() path_corner;

void() trigger_once =
{
	self.solid = SOLID_NOT;
};

void() trigger_multiple =
{
	self.solid = SOLID_NOT;
};

void() info_teleport_destination =
{
};

void() path_corner =
{
};
