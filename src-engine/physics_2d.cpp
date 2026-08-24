#include "physics_2d.hpp"
#include <cmath>
#include <cstring>
#include <algorithm>

namespace PhysicsEngine {

static RigidBody g_bodies[MAX_PHYSICS_BODIES];
static PhysicsJoint g_joints[MAX_PHYSICS_JOINTS];
static Vec2 g_gravity(0.0f, 400.0f); // Default gravity for 240x320 screen

void init() {
    clear_world();
}

void set_gravity(float gx, float gy) {
    g_gravity.set(gx, gy);
}

void get_gravity(float* gx, float* gy) {
    if (gx) *gx = g_gravity.x;
    if (gy) *gy = g_gravity.y;
}

void clear_world() {
    for (int i = 0; i < MAX_PHYSICS_BODIES; ++i) {
        g_bodies[i].active = false;
        g_bodies[i].id = i;
    }
    for (int j = 0; j < MAX_PHYSICS_JOINTS; ++j) {
        g_joints[j].active = false;
        g_joints[j].id = j;
    }
}

int create_box(float x, float y, float w, float h, float mass, float friction, float restitution, bool is_static) {
    for (int i = 0; i < MAX_PHYSICS_BODIES; ++i) {
        if (!g_bodies[i].active) {
            RigidBody& b = g_bodies[i];
            b.id = i;
            b.active = true;
            b.type = is_static ? BODY_STATIC : BODY_DYNAMIC;
            b.position.set(x, y);
            b.rotation = 0.0f;
            b.velocity.set(0.0f, 0.0f);
            b.angular_velocity = 0.0f;
            b.force.set(0.0f, 0.0f);
            b.torque = 0.0f;
            b.width_height.set(w, h);
            b.friction = friction;
            b.restitution = restitution;

            if (is_static || mass <= 0.0f) {
                b.mass = 0.0f;
                b.inv_mass = 0.0f;
                b.I = 0.0f;
                b.inv_I = 0.0f;
            } else {
                b.mass = mass;
                b.inv_mass = 1.0f / mass;
                // Moment of inertia for a rectangle
                b.I = mass * (w * w + h * h) / 12.0f;
                b.inv_I = 1.0f / b.I;
            }
            return i;
        }
    }
    return -1; // Pool full
}

int create_circle(float x, float y, float radius, float mass, float friction, float restitution, bool is_static) {
    return create_box(x, y, radius * 2.0f, radius * 2.0f, mass, friction, restitution, is_static);
}

void destroy_body(int body_id) {
    if (body_id >= 0 && body_id < MAX_PHYSICS_BODIES) {
        g_bodies[body_id].active = false;
        // Also remove any joints connected to this body
        for (int j = 0; j < MAX_PHYSICS_JOINTS; ++j) {
            if (g_joints[j].active && (g_joints[j].body_a_id == body_id || g_joints[j].body_b_id == body_id)) {
                g_joints[j].active = false;
            }
        }
    }
}

RigidBody* get_body(int body_id) {
    if (body_id >= 0 && body_id < MAX_PHYSICS_BODIES && g_bodies[body_id].active) {
        return &g_bodies[body_id];
    }
    return nullptr;
}

void apply_force(int body_id, float fx, float fy) {
    RigidBody* b = get_body(body_id);
    if (b && b->type == BODY_DYNAMIC) {
        b->force += Vec2(fx, fy);
    }
}

void apply_impulse(int body_id, float jx, float jy, float px, float py) {
    RigidBody* b = get_body(body_id);
    if (b && b->type == BODY_DYNAMIC) {
        Vec2 impulse(jx, jy);
        b->velocity += b->inv_mass * impulse;
        Vec2 r = Vec2(px, py) - b->position;
        b->angular_velocity += b->inv_I * Cross(r, impulse);
    }
}

void set_velocity(int body_id, float vx, float vy) {
    RigidBody* b = get_body(body_id);
    if (b) {
        b->velocity.set(vx, vy);
    }
}

void set_angular_velocity(int body_id, float omega) {
    RigidBody* b = get_body(body_id);
    if (b) {
        b->angular_velocity = omega;
    }
}

void set_position(int body_id, float x, float y, float angle) {
    RigidBody* b = get_body(body_id);
    if (b) {
        b->position.set(x, y);
        b->rotation = angle;
    }
}

int create_revolute_joint(int body_a, int body_b, float anchor_x, float anchor_y) {
    RigidBody* ba = get_body(body_a);
    RigidBody* bb = get_body(body_b);
    if (!ba || !bb) return -1;

    for (int j = 0; j < MAX_PHYSICS_JOINTS; ++j) {
        if (!g_joints[j].active) {
            PhysicsJoint& joint = g_joints[j];
            joint.id = j;
            joint.active = true;
            joint.body_a_id = body_a;
            joint.body_b_id = body_b;
            
            Mat22 RotA(ba->rotation);
            Mat22 RotB(bb->rotation);
            Vec2 world_anchor(anchor_x, anchor_y);
            
            // Transform world anchor to local body coords
            Vec2 da = world_anchor - ba->position;
            Vec2 db = world_anchor - bb->position;
            joint.local_anchor_a = Vec2(RotA.col1.x * da.x + RotA.col1.y * da.y, RotA.col2.x * da.x + RotA.col2.y * da.y);
            joint.local_anchor_b = Vec2(RotB.col1.x * db.x + RotB.col1.y * db.y, RotB.col2.x * db.x + RotB.col2.y * db.y);
            joint.bias_factor = 0.2f;
            joint.softness = 0.0f;
            return j;
        }
    }
    return -1;
}

void destroy_joint(int joint_id) {
    if (joint_id >= 0 && joint_id < MAX_PHYSICS_JOINTS) {
        g_joints[joint_id].active = false;
    }
}

// SAT / Contact resolution & constraint solver step
void step(float dt, int iterations) {
    if (dt <= 0.0f) return;
    float inv_dt = 1.0f / dt;

    // 1. Integrate forces & apply gravity
    for (int i = 0; i < MAX_PHYSICS_BODIES; ++i) {
        RigidBody& b = g_bodies[i];
        if (!b.active || b.type == BODY_STATIC) continue;

        b.velocity += dt * (g_gravity + b.inv_mass * b.force);
        b.angular_velocity += dt * b.inv_I * b.torque;

        // Reset forces
        b.force.set(0.0f, 0.0f);
        b.torque = 0.0f;
    }

    // 2. Velocity Solver Iterations (Contacts & Joints)
    for (int it = 0; it < iterations; ++it) {
        // Joint constraints
        for (int j = 0; j < MAX_PHYSICS_JOINTS; ++j) {
            if (!g_joints[j].active) continue;
            PhysicsJoint& joint = g_joints[j];
            RigidBody* b1 = get_body(joint.body_a_id);
            RigidBody* b2 = get_body(joint.body_b_id);
            if (!b1 || !b2) continue;

            Mat22 R1(b1->rotation);
            Mat22 R2(b2->rotation);
            Vec2 r1 = R1 * joint.local_anchor_a;
            Vec2 r2 = R2 * joint.local_anchor_b;

            Vec2 p1 = b1->position + r1;
            Vec2 p2 = b2->position + r2;
            Vec2 dp = p2 - p1;

            Vec2 v1 = b1->velocity + Cross(b1->angular_velocity, r1);
            Vec2 v2 = b2->velocity + Cross(b2->angular_velocity, r2);
            Vec2 dv = v2 - v1;

            Vec2 impulse = (dv + joint.bias_factor * inv_dt * dp) * -0.5f;

            if (b1->type == BODY_DYNAMIC) {
                b1->velocity -= b1->inv_mass * impulse;
                b1->angular_velocity -= b1->inv_I * Cross(r1, impulse);
            }
            if (b2->type == BODY_DYNAMIC) {
                b2->velocity += b2->inv_mass * impulse;
                b2->angular_velocity += b2->inv_I * Cross(r2, impulse);
            }
        }

        // Body-to-body collisions (AABB with impulse and friction)
        for (int i = 0; i < MAX_PHYSICS_BODIES; ++i) {
            if (!g_bodies[i].active) continue;
            RigidBody& b1 = g_bodies[i];

            for (int j = i + 1; j < MAX_PHYSICS_BODIES; ++j) {
                if (!g_bodies[j].active) continue;
                RigidBody& b2 = g_bodies[j];
                if (b1.type == BODY_STATIC && b2.type == BODY_STATIC) continue;

                Vec2 d = b2.position - b1.position;
                float half_w1 = b1.width_height.x * 0.5f;
                float half_h1 = b1.width_height.y * 0.5f;
                float half_w2 = b2.width_height.x * 0.5f;
                float half_h2 = b2.width_height.y * 0.5f;

                float overlap_x = (half_w1 + half_w2) - fabsf(d.x);
                float overlap_y = (half_h1 + half_h2) - fabsf(d.y);

                if (overlap_x > 0.0f && overlap_y > 0.0f) {
                    Vec2 normal;
                    float depth;
                    if (overlap_x < overlap_y) {
                        normal = Vec2(d.x < 0.0f ? -1.0f : 1.0f, 0.0f);
                        depth = overlap_x;
                    } else {
                        normal = Vec2(0.0f, d.y < 0.0f ? -1.0f : 1.0f);
                        depth = overlap_y;
                    }

                    // Relative velocity
                    Vec2 rv = b2.velocity - b1.velocity;
                    float vel_along_normal = Dot(rv, normal);

                    if (vel_along_normal < 0.0f) {
                        float e = std::min(b1.restitution, b2.restitution);
                        float j_mag = -(1.0f + e) * vel_along_normal;
                        j_mag /= (b1.inv_mass + b2.inv_mass);

                        Vec2 impulse = j_mag * normal;
                        if (b1.type == BODY_DYNAMIC) b1.velocity -= b1.inv_mass * impulse;
                        if (b2.type == BODY_DYNAMIC) b2.velocity += b2.inv_mass * impulse;

                        // Friction tangent impulse
                        Vec2 tangent = rv - (Dot(rv, normal) * normal);
                        float t_len = sqrtf(Dot(tangent, tangent));
                        if (t_len > 0.0001f) {
                            tangent *= (1.0f / t_len);
                            float jt = -Dot(rv, tangent);
                            jt /= (b1.inv_mass + b2.inv_mass);
                            float mu = sqrtf(b1.friction * b2.friction);
                            jt = std::max(-j_mag * mu, std::min(jt, j_mag * mu));

                            Vec2 f_impulse = jt * tangent;
                            if (b1.type == BODY_DYNAMIC) b1.velocity -= b1.inv_mass * f_impulse;
                            if (b2.type == BODY_DYNAMIC) b2.velocity += b2.inv_mass * f_impulse;
                        }
                    }

                    // Positional correction (Baumgarte stabilization)
                    const float percent = 0.4f;
                    const float slop = 0.01f;
                    Vec2 correction = (std::max(depth - slop, 0.0f) / (b1.inv_mass + b2.inv_mass)) * percent * normal;
                    if (b1.type == BODY_DYNAMIC) b1.position -= b1.inv_mass * correction;
                    if (b2.type == BODY_DYNAMIC) b2.position += b2.inv_mass * correction;
                }
            }
        }
    }

    // 3. Integrate positions
    for (int i = 0; i < MAX_PHYSICS_BODIES; ++i) {
        RigidBody& b = g_bodies[i];
        if (!b.active || b.type == BODY_STATIC) continue;

        b.position += dt * b.velocity;
        b.rotation += dt * b.angular_velocity;

        // Screen boundary safety clamping for 240x320
        if (b.position.y > 340.0f) {
            b.position.y = 340.0f;
            b.velocity.y = 0.0f;
        }
    }
}

} // namespace PhysicsEngine
