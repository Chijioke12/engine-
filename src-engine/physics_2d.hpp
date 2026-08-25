#pragma once
#include <stdint.h>
#include <stdbool.h>
#include <math.h>
#include <cmath>
#include <stdlib.h>

// High-performance 2D Rigid Body Physics Engine for KaiOS 2.5 (Box2D-Lite ANSI C++)
// Supports dynamic/static bodies, mass/inertia, restitution, friction, stacking, impulse resolution, and joints.

#define MAX_PHYSICS_BODIES 64
#define MAX_PHYSICS_JOINTS 32

struct Vec2 {
    float x, y;
    Vec2() : x(0.0f), y(0.0f) {}
    Vec2(float _x, float _y) : x(_x), y(_y) {}

    void set(float _x, float _y) { x = _x; y = _y; }
    Vec2 operator -() const { return Vec2(-x, -y); }
    void operator += (const Vec2& v) { x += v.x; y += v.y; }
    void operator -= (const Vec2& v) { x -= v.x; y -= v.y; }
    void operator *= (float a) { x *= a; y *= a; }
};

inline Vec2 operator + (const Vec2& a, const Vec2& b) { return Vec2(a.x + b.x, a.y + b.y); }
inline Vec2 operator - (const Vec2& a, const Vec2& b) { return Vec2(a.x - b.x, a.y - b.y); }
inline Vec2 operator * (float s, const Vec2& v) { return Vec2(s * v.x, s * v.y); }
inline Vec2 operator * (const Vec2& v, float s) { return Vec2(v.x * s, v.y * s); }
inline float Dot(const Vec2& a, const Vec2& b) { return a.x * b.x + a.y * b.y; }
inline float Cross(const Vec2& a, const Vec2& b) { return a.x * b.y - a.y * b.x; }
inline Vec2 Cross(const Vec2& v, float a) { return Vec2(a * v.y, -a * v.x); }
inline Vec2 Cross(float a, const Vec2& v) { return Vec2(-a * v.y, a * v.x); }

struct Mat22 {
    Vec2 col1, col2;
    Mat22() {}
    Mat22(float angle) {
        float c = cosf(angle), s = sinf(angle);
        col1.x = c; col2.x = -s;
        col1.y = s; col2.y = c;
    }
};

inline Vec2 operator * (const Mat22& R, const Vec2& v) {
    return Vec2(R.col1.x * v.x + R.col2.x * v.y, R.col1.y * v.x + R.col2.y * v.y);
}

enum BodyType {
    BODY_STATIC = 0,
    BODY_DYNAMIC = 1
};

struct RigidBody {
    int id;
    bool active;
    BodyType type;
    Vec2 position;
    float rotation; // angle in radians
    Vec2 velocity;
    float angular_velocity;
    Vec2 force;
    float torque;
    Vec2 width_height; // dimensions in pixels/meters
    float mass, inv_mass;
    float I, inv_I; // moment of inertia
    float friction;
    float restitution; // bounciness (0.0 to 1.0)
};

struct PhysicsJoint {
    int id;
    bool active;
    int body_a_id;
    int body_b_id;
    Vec2 local_anchor_a;
    Vec2 local_anchor_b;
    float bias_factor;
    float softness;
};

namespace PhysicsEngine {
    void init();
    void set_gravity(float gx, float gy);
    void get_gravity(float* gx, float* gy);
    
    int create_box(float x, float y, float w, float h, float mass, float friction, float restitution, bool is_static);
    int create_circle(float x, float y, float radius, float mass, float friction, float restitution, bool is_static);
    void destroy_body(int body_id);
    RigidBody* get_body(int body_id);

    void apply_force(int body_id, float fx, float fy);
    void apply_impulse(int body_id, float jx, float jy, float px, float py);
    void set_velocity(int body_id, float vx, float vy);
    void set_angular_velocity(int body_id, float omega);
    void set_position(int body_id, float x, float y, float angle);

    int create_revolute_joint(int body_a, int body_b, float anchor_x, float anchor_y);
    void destroy_joint(int joint_id);

    void step(float dt, int iterations);
    void clear_world();
}
