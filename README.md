# Hotel PMS

[![CI/CD Pipeline](https://github.com/rufoabrahamguyo/hotel-management/actions/workflows/ci-cd-pipeline.yml/badge.svg?branch=main)](https://github.com/rufoabrahamguyo/hotel-management/actions/workflows/ci-cd-pipeline.yml)

Web-based **property management** workspace for a single hotel: staff sign in, see an operations overview, manage **guests and reservations**, **rooms and housekeeping status**, **reports**, **property settings**, and **staff accounts**. 




| Area | Purpose |
|------|--------|
| **Overview** | Role-aware snapshot: available rooms, arrivals/departures, housekeeping load, revenue estimate  |
| **Guests & arrivals** | Guest registry, reservations, check-in / check-out flows; ties to room inventory. |
| **Rooms** | Room list, status (vacant, occupied, dirty, maintenance, etc.), rates, housekeeping notes. |
| **Reports** | Aggregated metrics: room mix, bookings, pipeline revenue, occupancy-style figures. |
| **Staff accounts** | Create and manage hotel staff (roles, suspend/activate) after the bootstrap admin exists. |
| **Settings** | Property name, timezone, default check-in/out times. |


## Roles 

The product is built around a **SystemAdmin → General Manager → department managers → line staff** model. Typical mapping:

| Who | Typically creates |
|-----|-------------------|
| SystemAdmin | General Manager (first handoff), recovery for other roles |
| General Manager | Department heads |
| Front Office Manager | Receptionists |
| Housekeeping Manager | Housekeeping staff |
| Maintenance Manager | Maintenance staff |

