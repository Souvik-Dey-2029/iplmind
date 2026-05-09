/**
 * SESSION EXPIRATION & LIFECYCLE DOCUMENTATION
 * 
 * This document explains IPLMind's in-memory session management strategy
 * and scaling limitations for production deployments.
 */

## Session Lifecycle

### Creation
- Sessions created on game start via POST /api/session/start
- Assigned UUID identifier
- All players initialized with equal probability (1/N)
- Status: "playing"
- TTL: 1 hour (3600000 ms)

### Active Duration
- Player answers processed via POST /api/session/answer
- Probabilities updated via Bayesian engine
- Questions selected via entropy-based ranking
- Status remains "playing" until:
  - Confidence threshold reached (65%) + 2+ candidates
  - Adaptive limit reached + 40% confidence
  - User explicitly ends game
  - Session expires

### Expiration
- Sessions older than 1 hour automatically deleted
- Cleanup runs every 30 minutes
- Timer is non-blocking (unref'd)
- Expired sessions: data discarded, no persistence
- **Note:** For production, implement session persistence to Redis

## Memory Implications

### Per-Session Memory Estimate
- Session metadata: ~1 KB
- Probabilities map (260+ players): ~3-5 KB  
- Question history (avg 10 questions): ~2-3 KB
- Candidates array: ~2-3 KB
- **Total per session: ~10-15 KB**

### Scaling Limits (Single Node)
- 1000 concurrent sessions = ~10-15 MB
- 10000 concurrent sessions = ~100-150 MB
- 100000 concurrent sessions = ~1-1.5 GB (not recommended)

**Recommendation:** Deploy with Redis for session store at >1000 concurrent users

## Cleanup Strategy

### Current Implementation
- Interval: Every 30 minutes
- Expiration: 1 hour old sessions
- Example: Session created 10:00 AM → cleaned up 11:30 AM (during next cleanup window)

### For Production Scaling
1. **Redis Backend:** Move sessions to Redis with TTL
2. **Database Persistence:** Save sessions to PostgreSQL for analytics
3. **Session Replication:** Use sticky sessions if horizontal scaling needed
4. **Metrics:** Monitor session count, avg duration, cleanup frequency

## Limitations & Assumptions

### Current Constraints
- **Single-process only:** Each Next.js instance has separate session store
- **No horizontal scaling:** Sessions don't persist across server restarts
- **No clustering:** Load balancer must use sticky sessions if deployed with multiple instances
- **Lost on redeploy:** Game state lost if server restarts

### Safe Usage Scenarios
✅ Hackathon demo (single server)
✅ Development/testing
✅ Staging environment
✅ Single-process production with <100 concurrent users

### Not Recommended For
❌ High-traffic production (>100 concurrent users)
❌ Distributed/clustered deployments
❌ Indefinite session persistence
❌ Multi-region deployments

## Recovery & Error Handling

### Session Not Found
- Returns 404 when sessionId doesn't exist
- Client should restart game (creates new session)
- Graceful UX: "Game expired, please start a new game"

### Session Expired During Game
- Cleanup runs every 30 minutes
- Max exposed expiration: 30 minutes (if session expires at cleanup boundary)
- Typical case: <5 minute warning before expiration

### Data Loss Scenarios
1. Server restart: All sessions lost (no persistence)
2. Node.js crash: All sessions lost
3. Memory limit exceeded: Oldest sessions may be evicted by OS
4. Cleanup cycle: Intentional deletion of 1hr+ old sessions

## Monitoring Recommendations

```javascript
// Example metrics to track:
- Total active sessions
- Sessions per minute (creation rate)
- Average session duration
- Cleanup cycles completed
- Sessions expired vs cleaned
- Memory usage (% of max heap)
```

## Migration Path to Production

### Phase 1: Verified Hackathon (Current)
- Single server, in-memory sessions
- TTL: 1 hour, auto-cleanup every 30 min

### Phase 2: Scaling to 100 Users
- Add Redis connection
- Migrate session store to Redis
- Keep cleanup in app (or move to Redis TTL)

### Phase 3: Production (1000+ Users)
- Redis for session state
- PostgreSQL for analytics/persistence
- Load balancer with sticky sessions
- Horizontal scaling with session replication

### Phase 4: Enterprise
- Distributed cache (Redis Cluster)
- Database sharding
- Geographic replication
- Full observability/metrics

## Environment Configuration

```env
# Future: Session backend strategy
SESSION_STORE=memory              # Options: memory, redis, postgres
SESSION_TTL_MINUTES=60            # Default: 1 hour
SESSION_CLEANUP_INTERVAL_MINUTES=30  # Default: 30 minutes
SESSION_MAX_PER_NODE=10000        # Warn if exceeded
```

---

**Last Updated:** May 2026  
**Status:** Production-ready for <100 concurrent users (single instance)  
**Scaling Target:** Redis backend implementation (Phase 2)
