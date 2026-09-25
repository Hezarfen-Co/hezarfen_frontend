# Live list filter drift — 2026-09-25

This note records behavior observed against the authenticated live backend on
2026-09-25. It describes that deployment, not a permanent API guarantee.

| List | Request / observation | Contract impact |
|---|---|---|
| `GET /courses` | `?limit=5&offset=0&q=zzzx-no-such-course` returned HTTP 200, `total=10`, and five ordinary courses. | `q` was ignored in this check; frontend search and pagination cannot be trusted to reflect the query. |
| `GET /courses` | A `taught=false` request still returned taught courses. | The taught filter was ignored in this check. |
| `GET /homework` | A `due_before` request used by the Past tab still returned future deadlines. | The Past tab did not filter as requested. |

The live OpenAPI document currently lists `limit` and `offset` for these list
routes, but does not list the filters above. Frontend API helpers send them;
their presence in frontend code does not establish backend support. Verify the
deployed response and OpenAPI document again after a backend update. Do not
infer the status of other filters from these observations.
