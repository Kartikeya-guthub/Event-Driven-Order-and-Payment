# Event-Driven Order and Payment System

This project implements an event-driven architecture for handling orders and payments using Node.js, PostgreSQL, and Kafka.

## Phase 12 — Integration Tests (Failure Scenarios)

The system's resilience was verified under various failure scenarios:

- **Duplicate delivery** → Handled via idempotency (`processed_events` table).
- **Worker crash** → System recovers and completes pending work after restart.
- **Kafka downtime** → Events accumulate in the `outbox` and are published once Kafka is back online.
- **Publisher crash** → Eventual consistency is maintained as the publisher resumes from where it left off.

### Verification Results

| Metric | Value |
| --- | --- |
| Total Orders | 40 |
| Processed Events | 19 |
| Double Charges | 0 |
| Invalid States | 0 |
| Orphan Events | 0 |

### Proof Queries

- **No double processing**:
  ```sql
  SELECT event_id, COUNT(*)
  FROM processed_events
  GROUP BY event_id
  HAVING COUNT(*) > 1;
  ```
  *Result: Empty*

- **No invalid states**:
  ```sql
  SELECT *
  FROM orders
  WHERE state NOT IN ('CREATED','PAYMENT_PENDING','PAID','FAILED');
  ```
  *Result: Empty*

- **No orphan events**:
  ```sql
  SELECT *
  FROM outbox
  WHERE aggregate_id NOT IN (SELECT id FROM orders);
  ```
  *Result: Empty*
