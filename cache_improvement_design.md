# Cache Service Improvement Design

## Problem Statement
The current CacheService has two main issues:
1. When Redis is unavailable, it falls back to no-cache mode (returns None/False for all operations), providing no caching benefits
2. APIGateway caches decrypted API keys, creating a security risk if the cache is compromised

## Solution Overview
Enhance CacheService with a local fallback cache mechanism and modify API key caching to store encrypted keys instead of decrypted ones.

## Detailed Design

### 1. CacheService Enhancement (Local Fallback)
Add local in-memory caching capability similar to RateLimiter:

**New Attributes:**
- `_local_cache: Dict[str, tuple]` - Stores (value, expiry_timestamp) for each key
- `_local_lock: threading.Lock` - For thread-safe access to local cache
- `use_redis: bool` - Tracks Redis connection status

**Modified Methods:**
- `__init__`: Initialize local cache structures and test Redis connection
- `_make_key`: Unchanged (existing method)
- `get`: 
  - If Redis available: use existing logic
  - If Redis unavailable: check local cache for unexpired items
- `set`:
  - If Redis available: use existing logic
  - If Redis unavailable: store in local cache with expiry timestamp
- `delete`, `exists`, `increment`, `expire`: Similar dual-path logic
- `flush_namespace`: Clear local cache entries matching pattern
- `get_stats`: Include local cache stats when Redis unavailable

**Local Cache Expiration:**
- Store expiry timestamp with each value
- On access, check if current time < expiry time
- Lazy expiration: remove expired items on access (no background cleanup needed)

### 2. Secure API Key Caching
Modify APIGateway to cache encrypted API keys:

**Changes to TokenService:**
Add new method:
```python
def get_encrypted_api_key(self, user_id: str, provider_name: str) -> Optional[str]:
    """Retrieve encrypted API key for caching purposes"""
    # Validate provider
    valid_providers = ['gemini', 'openai', 'claude']
    if provider_name.lower() not in valid_providers:
        return None

    result = self.db.execute_read_one(
        "SELECT encrypted_key_value FROM user_api_keys WHERE user_id = %s AND provider_name = %s AND is_active_state = TRUE",
        (user_id, provider_name.lower())
    )
    if result:
        return result['encrypted_key_value']
    return None
```

**Changes to APIGateway `_get_cached_api_key`:**
```python
def _get_cached_api_key(self, user_id: str, provider_name: str) -> Optional[str]:
    """Get API key from cache or database (returning decrypted key)"""
    # Check cache for encrypted key
    cache_key = ["api_key", user_id, provider_name]
    encrypted_key = self.cache.get(cache_key)
    
    if encrypted_key:
        # Decrypt cached encrypted key
        return decrypt_api_key(encrypted_key)
    
    # Get encrypted key from database
    encrypted_key = self.token_service.get_encrypted_api_key(user_id, provider_name)
    if encrypted_key:
        # Cache the encrypted key (not decrypted)
        self.cache.set(cache_key, encrypted_key, self.API_KEY_CACHE_TTL)
        # Return decrypted version for immediate use
        return decrypt_api_key(encrypted_key)
    
    return None
```

**Changes to API Key Update Methods:**
In `add_api_key` and similar methods in TokenService, after updating database:
- Call `self.cache.delete(["api_key", user_id, provider_name])` to invalidate cached encrypted key
- (This existing invalidation logic can remain as-is since it's clearing the cache entry)

## Benefits
1. **Improved Resilience**: When Redis unavailable, local cache provides caching benefits
2. **Enhanced Security**: Cached API keys remain encrypted, reducing exposure risk
3. **Backward Compatibility**: Existing API unchanged, all current functionality preserved
4. **Consistent Pattern**: Follows existing approach used in RateLimiter

## Potential Issues and Mitigations
- **Memory Usage**: Local cache could grow indefinitely
  - Mitigation: Implement size limit or periodic cleanup (can be added later if needed)
- **Consistency**: Local cache not shared across instances
  - Mitigation: Acceptable for development/single-instance; production should use Redis
- **Cache Staleness**: TTL tracking in local cache adds complexity
  - Mitigation: Simple timestamp-based expiration is reliable and lightweight

## Files to Modify
1. `src/backend/cache_service.py` - Add local fallback caching
2. `src/backend/token_service.py` - Add `get_encrypted_api_key` method
3. `src/backend/api_gateway.py` - Modify `_get_cached_api_key` to handle encrypted caching

## Testing Approach
1. Unit tests for CacheService with Redis available/unavailable
2. Integration tests for API key caching flow
3. Security verification: ensure decrypted keys never stored in cache
4. Existing test suite should continue to pass