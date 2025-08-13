import aioredis

redis = aioredis.from_url("redis://localhost")

async def check_rate_limit(user_id, limit=20, window=60):
    key = f"rate_limit:{user_id}"
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window)
    if current > limit:
        ttl = await redis.ttl(key)
        return False, ttl
    return True, None