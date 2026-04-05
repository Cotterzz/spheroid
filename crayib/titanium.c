/*
Orb is the container for all of the round objects on the field
Called 'Orb' not 'Ball' because only one of the orbs is the ball, the rest are players
All orbs obey the same physics rules and bounce off each other
There are only two types of orb, player and ball.
Including the ball in this array of objects makes sense from a physics perspective, and also for having multiple balls, should the need arise.
Orbs can have different sizes and different masses, though the two are expected to be proportional (with consistent density) they are not connected.
*/
struct Orb
{
    Vector2 position = { 0,0 };
    Vector2 velocity = { 0,0 };
    float radius = 0;
    float mass = 0;
    bool isBall = false;
    int shader = 0;
    int ID = 0;
    // player only properties. It's just easier to have these here, rather than separate with references between Orb and Player.
    bool hasBall = false;
    bool isPlayerControlled // because one has to be, unless we're playing manager only.
    char team = "A"; // A or B, though we may point to a team struct
    char side = "C"; // Center, Right or Left
    char position = "G"; // Goal, Defender, Midfield, Forward or Attack
    Vector2 dPosition = { 0,0 }; // default defensive position
    Vector2 nPosition = { 0,0 }; // default neutral position
    Vector2 aPosition = { 0,0 }; // default attacking position
}