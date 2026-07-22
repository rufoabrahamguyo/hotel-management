# Hotel PMS (Hotely)

Web-based **property management** workspace for a single hotel: staff sign in, see an operations overview, manage **guests and reservations**, **rooms and housekeeping status**, **reports**, **property settings**, and **staff accounts**. 




| Area | Purpose |
|------|--------|
| **Overview** | Role-aware snapshot: available rooms, arrivals/departures, housekeeping load, revenue estimate  |
| **Guests & arrivals** | Guest registry, reservations, check-in / check-out flows; ties to room inventory.  |
| **Rooms** | Room list, status (vacant, occupied, dirty, maintenance, etc.), rates, housekeeping notes. |
| **Reports** | Aggregated metrics: room mix, bookings, pipeline revenue, occupancy-style figures. |
| **Staff accounts** | Create and manage hotel staff (roles, suspend/activate) after the bootstrap admin exists. |
| **Settings** | Property name, timezone, default check-in/out times. |


## Roles 

- Node.js 20+ (or current LTS)
- npm
- Docker and Docker Compose (recommended for Postgres + API)
- Or a local PostgreSQL 16 instance if you run the API outside Docker

## Quick start (recommended)

### 1. Clone and install

```bash
git clone <repo-url>
cd hotel-frontend
npm install --prefix frontend
npm install --prefix backend
```

