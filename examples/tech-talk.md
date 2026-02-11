---
title: "Building Resilient Microservices"
author: "Jane Engineer"
theme: dark
---

# Building Resilient Microservices
## Patterns That Actually Work in Production

Jane Engineer — Senior Platform Architect

---

# Agenda

- Why resilience matters more than performance
- The three patterns every service needs
- Real-world failure stories (and fixes)
- Live demo: circuit breakers in action

---

# The Fallacy of "It Works on My Machine"

> "Everything fails, all the time." — Werner Vogels, CTO of Amazon

Your local environment is a **lie**. Production has:

- Network partitions
- Cascading timeouts
- Memory pressure from noisy neighbors
- DNS resolution failures at 3 AM

---

# Pattern 1: Circuit Breaker

### Stop hammering a dead service

```typescript
const breaker = new CircuitBreaker(callService, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fire(request)
  .then(response => handle(response))
  .catch(err => fallback(err));
```

- **Closed**: requests flow normally
- **Open**: requests fail fast (no waiting)
- **Half-Open**: test with a single request

---

# Pattern 2: Bulkhead Isolation

### Don't let one bad endpoint sink the ship

- Separate thread pools per dependency
- Independent connection pools for each service
- Limit concurrency per operation type
- **Key insight**: resource isolation prevents cascading failures

---

# Pattern 3: Retry with Backoff

### Be persistent, but be polite

1. First retry: 100ms delay
2. Second retry: 400ms delay (exponential)
3. Third retry: 1600ms delay + jitter
4. Give up and degrade gracefully

> Never retry without backoff. You'll just DDoS yourself.

---

# Real Failure: The Monday Morning Cascade

<!-- notes: This is the story from our Q2 incident -->

Our payment service went down for 47 minutes because:

- Auth service deployed a bad config
- Payment service retried auth calls aggressively
- Retry storm overwhelmed the load balancer
- **Every** downstream service timed out
- Users saw blank screens

**Fix**: Circuit breakers + exponential backoff + bulkheads

---

# Key Takeaways

- **Design for failure**, not just success
- **Test in chaos**: use fault injection regularly
- **Monitor everything**: latency percentiles > averages
- **Degrade gracefully**: a slow response beats no response
- **Automate recovery**: humans are too slow at 3 AM

---

# Thank You
## Let's Build Things That Don't Break

@janeengineer | jane@example.com
