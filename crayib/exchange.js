struct Ball
{
    Vector2 position = { 0,0 };
    Vector2 velocity = { 0,0 };
    float radius = 0;
    float mass = 0;
}
    
bool Bounce(Ball& A, Ball& B)
{
    Vector2 ba = Vector2Subtract(B, A);
    float dist = Vector2Length(ba);
    if (dist == 0 || dist < A.radius + B.radius)
        return false;

    Vector2 baNorm = Vector2Scale(ba, 1.0f / dist);

    float vx1p = baNorm.x * A.velocity.x + baNorm.y * A.velocity.y;
    float vy1p = baNorm.x * A.velocity.y - baNorm.y * A.velocity.x;

    float vx2p = baNorm.x * B.velocity.x + baNorm.y * B.velocity.y;
    float vy2p = baNorm.x * B.velocity.y - baNorm.y * B.velocity.x;

    // compute the speed transfer and new directions
    float P = vx1p * A.mass + vx2p * B.mass;
    float V = vx1p - vx2p;

    A.velocity.x = baNorm.x * vx1p - baNorm.y * vy1p;
    A.velocity.y = baNorm.x * vy1p + baNorm.y * vx1p;
    B.velocity.x = baNorm.x * vx2p - baNorm.y * vy2p;
    B.velocity.y = baNorm.x * vy2p + baNorm.y * vx2p;

    // speeds
    float aSpeed = Vector2Length(A.velocity);
    float bSpeed = Vector2Length(B.velocity);

    // do the reflection
    float diff = ((A.radius + B.radius) - dist) / 2;
    float reflectX = baNorm.x * diff;
    float reflectY = baNorm.y * diff;

    // update new positions
    A.position.x -= reflectX;
    A.position.y -= reflectY;
    B.position.x += reflectX;
    B.position.y += reflectY;

    return true;
}


function checkCollisionAndBounce(A, B) {
        var dx = B.position.x - A.position.x;
        var dy = B.position.y - A.position.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < A.radius + B.radius) {
            //var angle = Math.atan2(dy, dx);
            cosa = dx/dist;//Math.cos(angle);
            sina = dx/dist;//Math.sin(angle);
            var vx1p = cosa * A.velocity.x + sina * A.velocity.y;
            var vy1p = cosa * A.velocity.y - sina * A.velocity.x;
            var vx2p = cosa * B.velocity.x + sina * B.velocity.y;
            var vy2p = cosa * B.velocity.y - sina * B.velocity.x;
            var P = vx1p * A.mass + vx2p * B.mass;
            var V = vx1p - vx2p;
            vx1p = (P - B.mass * V) / (A.mass + B.mass);
            vx2p = V + vx1p;
            A.velocity.x = cosa * vx1p - sina * vy1p;
            A.velocity.y = cosa * vy1p + sina * vx1p;
            B.velocity.x = cosa * vx2p - sina * vy2p;
            B.velocity.y = cosa * vy2p + sina * vx2p;
            var diff = ((A.radius + B.radius) - dist) / 2;
            var cosd = cosa * diff;
            var sind = sina * diff;
            A.position.x -= cosd;
            A.position.y -= sind;
            B.position.x += cosd;
            B.position.y += sind;
        }
    }